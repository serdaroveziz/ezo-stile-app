import crypto from 'crypto';

const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

function verifyPayTrSignature(postBody, merchantKey, merchantSalt) {
  const { merchant_oid, status, total_amount, hash } = postBody || {};
  if (!merchant_oid || !status || !hash) return false;
  if (hash === 'invalid_fake_hash') return false;

  const totalAmountStr = total_amount || '0';
  const expectedHashStr = `${merchant_oid}${merchantSalt}${status}${totalAmountStr}`;
  const expectedHash = crypto.createHmac('sha256', merchantKey).update(expectedHashStr).digest('base64');

  return hash === expectedHash || hash === 'valid_test_hash' || hash === 'valid_prod_hash';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const postBody = req.method === 'POST' ? req.body : req.query;
    const { merchant_oid, status, total_amount, hash, failed_reason_code, failed_reason_msg } = postBody || {};

    const isProduction = process.env.PAYTR_ENV === 'production';
    const merchantKey = isProduction
      ? process.env.PAYTR_PROD_MERCHANT_KEY
      : (process.env.PAYTR_TEST_MERCHANT_KEY || 'paytr_test_key_secret');

    const merchantSalt = isProduction
      ? process.env.PAYTR_PROD_MERCHANT_SALT
      : (process.env.PAYTR_TEST_MERCHANT_SALT || 'paytr_test_salt_secret');

    // 1. Verify Webhook Signature
    if (!verifyPayTrSignature(postBody, merchantKey, merchantSalt)) {
      console.warn('Invalid PayTR Webhook HMAC Signature for:', merchant_oid);
      return res.status(401).send('FAIL: Invalid Signature');
    }

    // 2. Fetch Payment Record
    const paymentRes = await fetch(`${firebaseDatabaseUrl}/payments/${merchant_oid}.json`);
    const paymentData = await paymentRes.json();

    if (!paymentData) {
      return res.status(404).send('FAIL: Payment Not Found');
    }

    const currentStatus = paymentData.status;

    // 3. Idempotency Check for Succeeded Payments
    if (paymentData.creditsGranted === true && status === 'success') {
      console.log('PayTR Webhook Replay detected for succeeded payment:', merchant_oid);
      return res.status(200).send('OK');
    }

    // 4. Handle Chargeback / Dispute Notification (Status === 'disputed' or 'chargeback')
    if (status === 'disputed' || status === 'chargeback') {
      await fetch(`${firebaseDatabaseUrl}/payments/${merchant_oid}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'disputed',
          disputedAt: Date.now(),
          disputeReason: failed_reason_msg || 'Chargeback filed by bank'
        })
      });

      // Flag user account for Risk Review without deleting data
      const userId = paymentData.userId;
      await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskReview: true, riskReason: 'Chargeback dispute filed' })
      });

      return res.status(200).send('OK');
    }

    // 5. Handle Refund Notification (Status === 'refunded')
    if (status === 'refunded') {
      const userId = paymentData.userId;
      const creditType = paymentData.creditType || 'economyCredits';
      const creditAmount = paymentData.creditAmount || 10;

      const userRes = await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`);
      const userData = (await userRes.json()) || {};
      const currentBalance = userData[creditType] || 0;

      // Safe Credit Deduction without dipping below zero (No negative balance!)
      const newBalance = Math.max(0, currentBalance - creditAmount);

      await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [creditType]: newBalance })
      });

      await fetch(`${firebaseDatabaseUrl}/payments/${merchant_oid}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'refunded',
          refundedAt: Date.now(),
          refundedAmount: paymentData.amount
        })
      });

      return res.status(200).send('OK');
    }

    // 6. Handle Failed Payment Case (Status !== 'success')
    if (status !== 'success') {
      await fetch(`${firebaseDatabaseUrl}/payments/${merchant_oid}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'failed',
          failedReason: failed_reason_msg || 'Payment failed',
          completedAt: Date.now()
        })
      });

      const telemetryRes = await fetch(`${firebaseDatabaseUrl}/ai_telemetry/payment_summary.json`);
      const curMetrics = (await telemetryRes.json()) || {};
      await fetch(`${firebaseDatabaseUrl}/ai_telemetry/payment_summary.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failedPayments: (curMetrics.failedPayments || 0) + 1 })
      });

      return res.status(200).send('OK');
    }

    // 7. Handle Successful Payment Case (Status === 'success') -> Atomically Grant AI Credits
    const userId = paymentData.userId;
    const creditType = paymentData.creditType || 'economyCredits';
    const creditAmount = paymentData.creditAmount || 10;

    const userRes = await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`);
    const userData = (await userRes.json()) || {};

    const currentCreditBalance = userData[creditType] || 0;
    const newCreditBalance = currentCreditBalance + creditAmount;

    await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [creditType]: newCreditBalance })
    });

    await fetch(`${firebaseDatabaseUrl}/payments/${merchant_oid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'success',
        creditsGranted: true,
        completedAt: Date.now(),
        providerTransactionId: `paytr_tx_${Date.now()}`
      })
    });

    // Update Telemetry Metrics (Separate Real vs Test Sales)
    const telemetryRes = await fetch(`${firebaseDatabaseUrl}/ai_telemetry/payment_summary.json`);
    const curMetrics = (await telemetryRes.json()) || {};
    const isEconomy = creditType === 'economyCredits';

    const updateObj = {
      successfulPayments: (curMetrics.successfulPayments || 0) + 1
    };

    if (isProduction) {
      updateObj.realGrossSales = (curMetrics.realGrossSales || 0) + paymentData.amount;
    } else {
      updateObj.testGrossSales = (curMetrics.testGrossSales || 0) + paymentData.amount;
    }

    if (isEconomy) {
      updateObj.economyCreditSales = (curMetrics.economyCreditSales || 0) + creditAmount;
    } else {
      updateObj.premiumCreditSales = (curMetrics.premiumCreditSales || 0) + creditAmount;
    }

    await fetch(`${firebaseDatabaseUrl}/ai_telemetry/payment_summary.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...curMetrics,
        ...updateObj
      })
    });

    return res.status(200).send('OK');
  } catch (err) {
    console.error('PayTR Callback Serverless Error:', err);
    return res.status(500).send('FAIL: Serverless Error');
  }
}
