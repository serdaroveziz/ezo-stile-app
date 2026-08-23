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
    const { userId, userToken, productId } = req.body;

    if (!userId || !userToken || !productId) {
      return res.status(400).json({ error: 'Missing required parameters (userId, userToken, productId)' });
    }

    if (!verifyUserToken(userId, userToken)) {
      return res.status(401).json({ error: 'Unauthorized session token signature' });
    }

    // 1. Fetch Dynamic Product Catalog from Firebase /system_config/products
    const catalogRes = await fetch(`${firebaseDatabaseUrl}/system_config/products.json`);
    const dynamicCatalog = (await catalogRes.json()) || {
      'pkg_economy_10': { productId: 'pkg_economy_10', title: '✨ AI Deneme (10 Hak)', creditType: 'economyCredits', creditAmount: 10, priceTRY: 29.99, active: true },
      'pkg_economy_30': { productId: 'pkg_economy_30', title: '✨ AI Deneme (30 Hak)', creditType: 'economyCredits', creditAmount: 30, priceTRY: 69.99, active: true },
      'pkg_premium_10': { productId: 'pkg_premium_10', title: '👑 AI Studio VIP (10 Hak)', creditType: 'premiumCredits', creditAmount: 10, priceTRY: 79.99, active: true },
      'pkg_premium_30': { productId: 'pkg_premium_30', title: '👑 AI Studio VIP (30 Hak)', creditType: 'premiumCredits', creditAmount: 30, priceTRY: 199.99, active: true }
    };

    const product = dynamicCatalog[productId];
    if (!product || !product.active) {
      return res.status(404).json({ error: 'Product not available or inactive in catalog' });
    }

    // 2. Production vs Sandbox Environment Keys Separation
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

    const merchantOid = 'pay_' + (isProduction ? 'prod_' : 'test_') + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const paymentAmountKurus = Math.round(product.priceTRY * 100);

    const userIp = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const userBasket = JSON.stringify([[product.title, product.priceTRY.toFixed(2), 1]]);
    const email = 'user@ezostile.com';

    const hashStr = `${merchantId}${userIp}${merchantOid}${email}${paymentAmountKurus}${userBasket}001TRY${merchantSalt}`;
    const token = crypto.createHmac('sha256', merchantKey).update(hashStr).digest('base64');

    // 3. Immutable Historical Payment Record Snapshot
    const paymentRecord = {
      paymentId: merchantOid,
      merchantOid,
      provider: 'paytr',
      environment: isProduction ? 'production' : 'sandbox',
      userId,
      productId: product.productId,
      title: product.title,
      creditType: product.creditType,
      creditAmount: product.creditAmount,
      amount: product.priceTRY,
      currency: 'TRY',
      status: 'pending', // State Machine: pending -> success | failed
      createdAt: Date.now(),
      completedAt: null,
      refundedAt: null,
      disputedAt: null,
      providerTransactionId: null,
      creditsGranted: false,
      isTest: !isProduction
    };

    await fetch(`${firebaseDatabaseUrl}/payments/${merchantOid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentRecord)
    });

    const telemetryRes = await fetch(`${firebaseDatabaseUrl}/ai_telemetry/payment_summary.json`);
    const curMetrics = (await telemetryRes.json()) || { paymentAttempts: 0 };
    await fetch(`${firebaseDatabaseUrl}/ai_telemetry/payment_summary.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentAttempts: (curMetrics.paymentAttempts || 0) + 1 })
    });

    return res.status(200).json({
      success: true,
      paymentId: merchantOid,
      environment: isProduction ? 'production' : 'sandbox',
      iframeToken: token,
      iframeUrl: `https://www.paytr.com/iframe/token/${token}`,
      product
    });
  } catch (err) {
    console.error('PayTR Payment Create Error:', err);
    return res.status(500).json({ error: 'Serverless Payment Create Error', details: err.message });
  }
}
