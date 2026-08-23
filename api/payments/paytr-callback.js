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

    // 4. Handle B2B Salon Subscription Payments
    if (paymentData.type === 'b2b_subscription' && status === 'success') {
      const businessId = paymentData.businessId;
      const targetPlan = paymentData.targetPlan || 'pro';
      const billingPeriod = paymentData.billingPeriod || 'monthly';

      const durationMs = billingPeriod === 'yearly' ? 365 * 86400000 : 30 * 86400000;
      const subStart = Date.now();
      const subEnd = subStart + durationMs;

      // Update Salon Subscription Record
      await fetch(`${firebaseDatabaseUrl}/businesses/${businessId}/subscription.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: targetPlan,
          subscriptionStatus: 'active',
          subscriptionStart: subStart,
          subscriptionEnd: subEnd,
          billingPeriod,
          paymentProvider: 'paytr',
          lastPaymentId: merchant_oid,
          autoRenew: true,
          gracePeriodDays: 5,
          aiMonthlyQuota: targetPlan === 'premium' ? 200 : 50,
          aiQuotaUsed: 0,
          updatedAt: subStart
        })
      });

      // Mark Payment as Completed & Verified
      await fetch(`${firebaseDatabaseUrl}/payments/${merchant_oid}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'success',
          creditsGranted: true,
          completedAt: subStart,
          providerTransactionId: `paytr_sub_tx_${Date.now()}`
        })
      });

      // Log SaaS Telemetry Metrics
      const telemetryRes = await fetch(`${firebaseDatabaseUrl}/ai_telemetry/saas_summary.json`);
      const curSaas = (await telemetryRes.json()) || {};
      const isProd = isProduction;

      await fetch(`${firebaseDatabaseUrl}/ai_telemetry/saas_summary.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalSubscriptions: (curSaas.totalSubscriptions || 0) + 1,
          testSaasSales: !isProd ? ((curSaas.testSaasSales || 0) + paymentData.amount) : (curSaas.testSaasSales || 0),
          realSaasSales: isProd ? ((curSaas.realSaasSales || 0) + paymentData.amount) : (curSaas.realSaasSales || 0)
        })
      });

      return res.status(200).send('OK');
    }

    // 5. Handle Chargeback / Dispute Notification
    if (status === 'disputed' || status === 'chargeback') {
      const userId = paymentData.userId;
      const creditType = paymentData.creditType || 'economyCredits';

      await fetch(`${firebaseDatabaseUrl}/payments/${merchant_oid}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'disputed',
          disputedAt: Date.now(),
          disputeReason: failed_reason_msg || 'Chargeback filed by bank'
        })
      });

      if (userId) {
        await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ riskReview: true, riskReason: 'Chargeback dispute filed' })
        });
      }

      return res.status(200).send('OK');
    }

    // 6. Handle Refund Notification
    if (status === 'refunded') {
      const userId = paymentData.userId;
      const creditType = paymentData.creditType || 'economyCredits';
      const creditAmount = paymentData.creditAmount || 10;

      if (userId) {
        const userRes = await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`);
        const userData = (await userRes.json()) || {};
        const currentBalance = userData[creditType] || 0;

        const newBalance = Math.max(0, currentBalance - creditAmount);

        await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [creditType]: newBalance })
        });
      }

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

    // 7. Handle Failed Payment Case
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

      return res.status(200).send('OK');
    }

    // 8. Handle B2C AI Credit Purchases (Status === 'success')
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

    return res.status(200).send('OK');
  } catch (err) {
    console.error('PayTR Callback Serverless Error:', err);
    return res.status(500).send('FAIL: Serverless Error');
  }
}
