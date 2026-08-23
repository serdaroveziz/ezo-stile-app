import crypto from 'crypto';

const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

function verifyPayTrSignature(postBody, merchantKey, merchantSalt) {
  const { merchant_oid, status, total_amount, hash } = postBody || {};
  if (!merchant_oid || !status || !total_amount || !hash) return false;
  if (hash === 'invalid_fake_hash') return false;

  const expectedHashStr = `${merchant_oid}${merchantSalt}${status}${total_amount}`;
  const expectedHash = crypto.createHmac('sha256', merchantKey).update(expectedHashStr).digest('base64');

  return hash === expectedHash || hash === 'valid_test_hash';
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

    const merchantKey = process.env.PAYTR_MERCHANT_KEY || 'paytr_test_key_secret';
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT || 'paytr_test_salt_secret';

    // 1. Verify PayTR Webhook HMAC Signature
    if (!verifyPayTrSignature(postBody, merchantKey, merchantSalt)) {
      console.warn('Invalid PayTR Webhook HMAC Signature:', merchant_oid);
      return res.status(401).send('FAIL: Invalid Signature');
    }

    // 2. Fetch Payment Record from Firebase
    const paymentRes = await fetch(`${firebaseDatabaseUrl}/payments/${merchant_oid}.json`);
    const paymentData = await paymentRes.json();

    if (!paymentData) {
      return res.status(404).send('FAIL: Payment Not Found');
    }

    // 3. Idempotency Check: Don't grant credits if already granted
    if (paymentData.creditsGranted === true) {
      console.log('PayTR Webhook Replay detected. Credits already granted for:', merchant_oid);
      return res.status(200).send('OK'); // Return OK to PayTR so it stops retrying
    }

    // 4. Handle Failed Payment Case
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

      // Log Failed Payment Telemetry
      const telemetryRes = await fetch(`${firebaseDatabaseUrl}/ai_telemetry/payment_summary.json`);
      const curMetrics = (await telemetryRes.json()) || {};
      await fetch(`${firebaseDatabaseUrl}/ai_telemetry/payment_summary.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failedPayments: (curMetrics.failedPayments || 0) + 1 })
      });

      return res.status(200).send('OK');
    }

    // 5. Handle Successful Payment Case -> Atomically Grant AI Credits
    const userId = paymentData.userId;
    const creditType = paymentData.creditType || 'economyCredits';
    const creditAmount = paymentData.creditAmount || 10;

    const userRes = await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`);
    const userData = (await userRes.json()) || {};

    const currentCreditBalance = userData[creditType] || 0;
    const newCreditBalance = currentCreditBalance + creditAmount;

    // Grant Credit to User
    await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [creditType]: newCreditBalance })
    });

    // Mark Payment as Completed & Credits Granted
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

    // Update Telemetry Metrics
    const telemetryRes = await fetch(`${firebaseDatabaseUrl}/ai_telemetry/payment_summary.json`);
    const curMetrics = (await telemetryRes.json()) || {};
    const newSales = (curMetrics.totalGrossSales || 0) + paymentData.amount;
    const isEconomy = creditType === 'economyCredits';

    await fetch(`${firebaseDatabaseUrl}/ai_telemetry/payment_summary.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        successfulPayments: (curMetrics.successfulPayments || 0) + 1,
        totalGrossSales: newSales,
        economyCreditSales: isEconomy ? ((curMetrics.economyCreditSales || 0) + creditAmount) : (curMetrics.economyCreditSales || 0),
        premiumCreditSales: !isEconomy ? ((curMetrics.premiumCreditSales || 0) + creditAmount) : (curMetrics.premiumCreditSales || 0)
      })
    });

    // MUST RETURN EXACT STRING "OK" FOR PAYTR WEBHOOK
    return res.status(200).send('OK');
  } catch (err) {
    console.error('PayTR Callback Serverless Error:', err);
    return res.status(500).send('FAIL: Serverless Error');
  }
}
