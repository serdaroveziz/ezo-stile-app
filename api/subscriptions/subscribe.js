import crypto from 'crypto';

const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
const HMAC_SECRET = process.env.HMAC_SECRET || 'ezostile-server-only-secret-key-2026';

function verifyUserToken(userId, token) {
  if (!userId || !token) return false;
  try {
    const [timestampStr, signature] = token.split('.');
    if (!timestampStr || !signature) return false;
    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    if (isNaN(timestamp) || (now - timestamp) > 86400000) return false;

    const expectedSignature = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(`${userId}.${timestamp}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (err) {
    return false;
  }
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, userToken, businessId, targetPlan, billingPeriod } = req.body;

    if (!userId || !userToken || !businessId || !targetPlan) {
      return res.status(400).json({ error: 'Missing required parameters (userId, userToken, businessId, targetPlan)' });
    }

    if (!verifyUserToken(userId, userToken)) {
      return res.status(401).json({ error: 'Unauthorized session token signature' });
    }

    // 1. Fetch Dynamic Business Plan Catalog
    const planCatalogRes = await fetch(`${firebaseDatabaseUrl}/system_config/business_plans.json`);
    const planCatalog = (await planCatalogRes.json()) || {
      'free': { name: 'Free', monthlyPriceTRY: 0, employeeLimit: 1, active: true },
      'pro': { name: 'Pro', monthlyPriceTRY: 499.00, employeeLimit: 5, aiMonthlyQuota: 50, active: true },
      'premium': { name: 'Premium', monthlyPriceTRY: 1299.00, employeeLimit: 20, aiMonthlyQuota: 200, active: true }
    };

    const plan = planCatalog[targetPlan];
    if (!plan || !plan.active) {
      return res.status(404).json({ error: 'Target business plan not found or inactive' });
    }

    // If target plan is Free, process free downgrade directly
    if (targetPlan === 'free') {
      await fetch(`${firebaseDatabaseUrl}/businesses/${businessId}/subscription.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'free',
          subscriptionStatus: 'active',
          billingPeriod: 'monthly',
          updatedAt: Date.now()
        })
      });
      return res.status(200).json({ success: true, message: 'Downgraded to Free plan successfully', plan: 'free' });
    }

    // 2. Init PayTR Payment Token for Pro/Premium B2B Subscription
    const isProduction = process.env.PAYTR_ENV === 'production';
    const merchantId = isProduction
      ? process.env.PAYTR_PROD_MERCHANT_ID
      : (process.env.PAYTR_TEST_MERCHANT_ID || '123456');

    const merchantKey = isProduction
      ? process.env.PAYTR_PROD_MERCHANT_KEY
      : (process.env.PAYTR_TEST_MERCHANT_KEY || 'paytr_test_key_secret');

    const merchantSalt = isProduction
      ? process.env.PAYTR_PROD_MERCHANT_SALT
      : (process.env.PAYTR_TEST_MERCHANT_SALT || 'paytr_test_salt_secret');

    const priceTRY = billingPeriod === 'yearly' ? (plan.monthlyPriceTRY * 10 * 0.8) : plan.monthlyPriceTRY;
    const merchantOid = 'sub_' + (isProduction ? 'prod_' : 'test_') + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const paymentAmountKurus = Math.round(priceTRY * 100);

    const userIp = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const userBasket = JSON.stringify([[`EZO STİLE Berber ${plan.name} Aboneliği`, priceTRY.toFixed(2), 1]]);
    const email = 'barber@ezostile.com';

    const hashStr = `${merchantId}${userIp}${merchantOid}${email}${paymentAmountKurus}${userBasket}001TRY${merchantSalt}`;
    const token = crypto.createHmac('sha256', merchantKey).update(hashStr).digest('base64');

    // 3. Create Pending Subscription Payment Record
    const subPaymentRecord = {
      paymentId: merchantOid,
      merchantOid,
      provider: 'paytr',
      type: 'b2b_subscription',
      environment: isProduction ? 'production' : 'sandbox',
      userId,
      businessId,
      targetPlan,
      billingPeriod: billingPeriod || 'monthly',
      amount: priceTRY,
      currency: 'TRY',
      status: 'pending',
      createdAt: Date.now(),
      completedAt: null,
      creditsGranted: false,
      isTest: !isProduction
    };

    await fetch(`${firebaseDatabaseUrl}/payments/${merchantOid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subPaymentRecord)
    });

    return res.status(200).json({
      success: true,
      paymentId: merchantOid,
      environment: isProduction ? 'production' : 'sandbox',
      iframeToken: token,
      iframeUrl: `https://www.paytr.com/iframe/token/${token}`,
      plan
    });
  } catch (err) {
    console.error('B2B Subscription Serverless Error:', err);
    return res.status(500).json({ error: 'Serverless Subscription Error', details: err.message });
  }
}
