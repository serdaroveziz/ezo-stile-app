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
    const { action, userId, userToken, businessId, targetPlan, billingPeriod } = req.body;

    if (!userId || !userToken || !businessId) {
      return res.status(400).json({ error: 'Missing required parameters (userId, userToken, businessId)' });
    }

    if (!verifyUserToken(userId, userToken)) {
      return res.status(401).json({ error: 'Unauthorized session token signature' });
    }

    // 1. Fetch Dynamic Business Plan Catalog from Firebase
    const planCatalogRes = await fetch(`${firebaseDatabaseUrl}/system_config/business_plans.json`);
    const planCatalog = (await planCatalogRes.json()) || {
      'free': { name: 'Free', monthlyPriceTRY: 0, yearlyPriceTRY: 0, employeeLimit: 1, aiMonthlyQuota: 0, active: true },
      'pro': { name: 'Pro', monthlyPriceTRY: 499.00, yearlyPriceTRY: 4990.00, employeeLimit: 5, aiMonthlyQuota: 50, trialDays: 14, active: true },
      'premium': { name: 'Premium', monthlyPriceTRY: 999.00, yearlyPriceTRY: 9990.00, employeeLimit: 20, aiMonthlyQuota: 200, active: true }
    };

    // -------------------------------------------------------------
    // ACTION: CLAIM 14-DAY PRO TRIAL
    // -------------------------------------------------------------
    if (action === 'claim_pro_trial') {
      const bizRes = await fetch(`${firebaseDatabaseUrl}/businesses/${businessId}.json`);
      const bizData = (await bizRes.json()) || {};

      if (bizData.trialClaimed === true) {
        return res.status(400).json({ error: 'Deneme Süresi Suistimal Engeli: Bu salon daha önce 14 günlük Pro deneme hakkını kullanmıştır.' });
      }

      const trialStart = Date.now();
      const trialEnd = trialStart + (14 * 86400000); // 14 Days

      await fetch(`${firebaseDatabaseUrl}/businesses/${businessId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trialClaimed: true })
      });

      await fetch(`${firebaseDatabaseUrl}/businesses/${businessId}/subscription.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'pro',
          subscriptionStatus: 'active',
          isTrial: true,
          subscriptionStart: trialStart,
          subscriptionEnd: trialEnd,
          employeeLimit: 5,
          aiMonthlyQuota: 50,
          aiQuotaUsed: 0,
          updatedAt: trialStart
        })
      });

      return res.status(200).json({
        success: true,
        action: 'claim_pro_trial',
        message: '14 Günlük Ücretsiz Pro Deneme Paketi Aktifleştirildi',
        trialEndsAt: new Date(trialEnd).toLocaleDateString()
      });
    }

    // -------------------------------------------------------------
    // ACTION: FREE PLAN DOWNGRADE
    // -------------------------------------------------------------
    if (targetPlan === 'free') {
      await fetch(`${firebaseDatabaseUrl}/businesses/${businessId}/subscription.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'free',
          subscriptionStatus: 'active',
          isTrial: false,
          employeeLimit: 1,
          aiMonthlyQuota: 0,
          aiQuotaUsed: 0,
          billingPeriod: 'monthly',
          updatedAt: Date.now()
        })
      });
      return res.status(200).json({ success: true, message: 'Free pakete güvenle geçildi. Sıfır veri kaybı.', plan: 'free' });
    }

    // -------------------------------------------------------------
    // ACTION: INIT PAYTR PAYMENT FOR PRO / PREMIUM B2B SUBSCRIPTION
    // -------------------------------------------------------------
    const plan = planCatalog[targetPlan];
    if (!plan || !plan.active) {
      return res.status(404).json({ error: 'Hedef abonelik paketi bulunamadı veya pasif durumda.' });
    }

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

    const isYearly = billingPeriod === 'yearly';
    const priceTRY = isYearly ? plan.yearlyPriceTRY : plan.monthlyPriceTRY;
    const merchantOid = 'sub_' + (isProduction ? 'prod_' : 'test_') + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const paymentAmountKurus = Math.round(priceTRY * 100);

    const userIp = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const userBasket = JSON.stringify([[`EZO STİLE Berber ${plan.name} (${isYearly ? 'Yıllık' : 'Aylık'})`, priceTRY.toFixed(2), 1]]);
    const email = 'barber@ezostile.com';

    const hashStr = `${merchantId}${userIp}${merchantOid}${email}${paymentAmountKurus}${userBasket}001TRY${merchantSalt}`;
    const token = crypto.createHmac('sha256', merchantKey).update(hashStr).digest('base64');

    // Immutable Payment Record with Snapshot Prices
    const subPaymentRecord = {
      paymentId: merchantOid,
      merchantOid,
      provider: 'paytr',
      type: 'b2b_subscription',
      environment: isProduction ? 'production' : 'sandbox',
      userId,
      businessId,
      targetPlan,
      billingPeriod: isYearly ? 'yearly' : 'monthly',
      amount: priceTRY,
      currency: 'TRY',
      status: 'pending',
      snapshotCatalog: {
        priceTRY,
        employeeLimit: plan.employeeLimit,
        aiMonthlyQuota: plan.aiMonthlyQuota
      },
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
      plan,
      priceTRY
    });
  } catch (err) {
    console.error('B2B Subscription Serverless Error:', err);
    return res.status(500).json({ error: 'Serverless Subscription Error', details: err.message });
  }
}
