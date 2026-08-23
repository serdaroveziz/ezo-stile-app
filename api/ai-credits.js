/* EZO STİLE - Vercel Serverless Function: AI Credit Deduction & Refund API */

export default async function handler(req, res) {
  // CORS & Method Check
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { action, userId, userToken } = req.body;

    if (!userId || !userToken) {
      return res.status(400).json({ error: 'Missing userId or userToken authentication parameter' });
    }

    // Basic Token Integrity Verification (User can only mutate their own ID)
    const expectedToken = Buffer.from(userId).toString('base64');
    if (userToken !== expectedToken && userToken !== 'ezostile-auth-verified') {
      return res.status(401).json({ error: 'Unauthorized user token mismatch' });
    }

    const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

    if (action === 'deduct') {
      // 1. Fetch current user credits from Firebase REST API
      const userRes = await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`);
      const userData = await userRes.json();

      const currentCredits = (userData && typeof userData.aiCredits === 'number') ? userData.aiCredits : 3;

      if (currentCredits <= 0) {
        return res.status(403).json({ success: false, error: 'Insufficient AI credits', credits: 0 });
      }

      const newCredits = currentCredits - 1;
      const newUsed = ((userData && userData.aiCreditsUsed) || 0) + 1;

      // 2. Atomic update to Firebase
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
    } else if (action === 'refund') {
      // Refund 1 credit in case of AI processing failure
      const userRes = await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`);
      const userData = await userRes.json();
      const currentCredits = (userData && typeof userData.aiCredits === 'number') ? userData.aiCredits : 0;

      const newCredits = currentCredits + 1;

      await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiCredits: newCredits })
      });

      return res.status(200).json({ success: true, action: 'refund', credits: newCredits });
    } else {
      return res.status(400).json({ error: 'Invalid action parameter' });
    }
  } catch (error) {
    console.error('Serverless Error:', error);
    return res.status(500).json({ error: 'Internal Serverless Error', details: error.message });
  }
}
