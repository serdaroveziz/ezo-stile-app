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

  try {
    const { paymentId, userId, userToken } = req.query;

    if (!paymentId || !userId || !userToken) {
      return res.status(400).json({ error: 'Missing paymentId, userId, or userToken' });
    }

    if (!verifyUserToken(userId, userToken)) {
      return res.status(401).json({ error: 'Unauthorized session token signature' });
    }

    const paymentRes = await fetch(`${firebaseDatabaseUrl}/payments/${paymentId}.json`);
    const paymentData = await paymentRes.json();

    if (!paymentData) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (paymentData.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: Payment owner mismatch' });
    }

    return res.status(200).json({
      success: true,
      paymentId: paymentData.paymentId,
      status: paymentData.status,
      creditsGranted: paymentData.creditsGranted,
      amount: paymentData.amount,
      creditType: paymentData.creditType,
      creditAmount: paymentData.creditAmount
    });
  } catch (err) {
    console.error('Payment Status Check Error:', err);
    return res.status(500).json({ error: 'Serverless Payment Status Error', details: err.message });
  }
}
