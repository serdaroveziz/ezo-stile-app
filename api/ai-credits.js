import crypto from 'crypto';

const HMAC_SECRET = process.env.HMAC_SECRET || 'ezostile-vip-hmac-secret-key-2026';
const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

// Helper: Verify cryptographic HMAC token for userId
function verifyUserToken(userId, token) {
  if (!userId || !token) return false;
  try {
    const [timestampStr, signature] = token.split('.');
    if (!timestampStr || !signature) return false;

    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    
    // Expire token after 24 hours (86400000 ms)
    if (isNaN(timestamp) || (now - timestamp) > 86400000 || timestamp > (now + 300000)) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(`${userId}.${timestamp}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (err) {
    return false;
  }
}

// In-Memory Rate Limiting (10 requests per 10 seconds per IP/User)
const rateLimitMap = new Map();
function checkRateLimit(ipOrUid) {
  const now = Date.now();
  const windowMs = 10000; // 10 seconds
  const maxRequests = 10;

  const record = rateLimitMap.get(ipOrUid) || { count: 0, startTime: now };

  if (now - record.startTime > windowMs) {
    record.count = 1;
    record.startTime = now;
  } else {
    record.count += 1;
  }

  rateLimitMap.set(ipOrUid, record);
  return record.count <= maxRequests;
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
    const { action, userId, userToken, transactionId } = req.body;

    if (!userId || !userToken) {
      return res.status(400).json({ error: 'Missing required authentication parameters (userId, userToken)' });
    }

    // 1. Rate Limiting Check
    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Too Many Requests (Rate Limit Exceeded)' });
    }

    // 2. Cryptographic HMAC Token Verification
    if (!verifyUserToken(userId, userToken)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token signature' });
    }

    // 3. Process AI Credit Deduction
    if (action === 'deduct') {
      const userRes = await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`);
      const userData = await userRes.json();

      const currentCredits = (userData && typeof userData.aiCredits === 'number') ? userData.aiCredits : 3;

      if (currentCredits <= 0) {
        return res.status(403).json({ success: false, error: 'Insufficient AI credits', credits: 0 });
      }

      const newCredits = currentCredits - 1;
      const newUsed = ((userData && userData.aiCreditsUsed) || 0) + 1;

      await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiCredits: newCredits,
          aiCreditsUsed: newUsed,
          lastAiUsage: Date.now()
        })
      });

      return res.status(200).json({ success: true, action: 'deduct', credits: newCredits, used: newUsed });
    }
    
    // 4. Process AI Credit Refund with Idempotency Check (transactionId)
    else if (action === 'refund') {
      if (!transactionId) {
        return res.status(400).json({ error: 'Missing transactionId parameter for refund' });
      }

      // Check if refund was ALREADY claimed for this transactionId in Firebase
      const txRes = await fetch(`${firebaseDatabaseUrl}/ai_refunds/${transactionId}.json`);
      const txData = await txRes.json();

      if (txData && txData.refunded === true) {
        return res.status(400).json({ error: 'Refund already claimed for this generation transaction', refunded: true });
      }

      // Fetch user data & refund 1 credit
      const userRes = await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`);
      const userData = await userRes.json();
      const currentCredits = (userData && typeof userData.aiCredits === 'number') ? userData.aiCredits : 0;

      const newCredits = currentCredits + 1;

      // Mark transaction as refunded atomically
      await fetch(`${firebaseDatabaseUrl}/ai_refunds/${transactionId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, refunded: true, timestamp: Date.now() })
      });

      await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiCredits: newCredits })
      });

      return res.status(200).json({ success: true, action: 'refund', credits: newCredits, transactionId });
    } else {
      return res.status(400).json({ error: 'Invalid action parameter' });
    }
  } catch (error) {
    console.error('Serverless AI Credits Error:', error);
    return res.status(500).json({ error: 'Internal Serverless Error', details: error.message });
  }
}

// Export verifyUserToken for testing
export { verifyUserToken };
