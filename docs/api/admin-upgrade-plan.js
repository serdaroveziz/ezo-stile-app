const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

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
    const { businessId, newPlan, adminPassword } = req.body;

    if (!businessId || !newPlan || !adminPassword) {
      return res.status(400).json({ error: 'Missing required parameters (businessId, newPlan, adminPassword)' });
    }

    // Server-Side Super Admin Authentication
    if (adminPassword !== '1405') {
      return res.status(401).json({ error: 'Unauthorized: Invalid Super Admin Authentication' });
    }

    const validPlans = ['free', 'pro', 'premium'];
    if (!validPlans.includes(newPlan.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid plan specified. Must be free, pro, or premium' });
    }

    // Update business subscription in Firebase Realtime Database
    const subscriptionData = {
      plan: newPlan.toLowerCase(),
      status: 'active',
      startedAt: Date.now(),
      expiresAt: null,
      updatedBy: 'super_admin'
    };

    await fetch(`${firebaseDatabaseUrl}/businesses/${businessId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        package: newPlan.toUpperCase(),
        subscription: subscriptionData
      })
    });

    return res.status(200).json({ success: true, businessId, newPlan: newPlan.toUpperCase(), subscription: subscriptionData });
  } catch (error) {
    console.error('Admin Plan Upgrade Error:', error);
    return res.status(500).json({ error: 'Internal Serverless Error', details: error.message });
  }
}
