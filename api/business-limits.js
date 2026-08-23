const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

const CENTRAL_PLANS = {
  free: { employeeLimit: 1, advancedAnalytics: false, aiFeatures: false },
  pro: { employeeLimit: 5, advancedAnalytics: true, aiFeatures: true },
  premium: { employeeLimit: 20, advancedAnalytics: true, aiFeatures: true, campaigns: true, priorityListing: true }
};

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
    const { businessId, action, currentStaffCount, requestedFeature } = req.body;

    if (!businessId || !action) {
      return res.status(400).json({ error: 'Missing required parameters (businessId, action)' });
    }

    // 1. Fetch business subscription from Firebase Realtime Database
    const bizRes = await fetch(`${firebaseDatabaseUrl}/businesses/${businessId}.json`);
    const bizData = await bizRes.json();

    const planKey = (bizData && bizData.subscription && bizData.subscription.plan) 
      ? bizData.subscription.plan.toLowerCase() 
      : ((bizData && bizData.package) ? bizData.package.toLowerCase() : 'free');

    const subStatus = (bizData && bizData.subscription && bizData.subscription.status) ? bizData.subscription.status : 'active';

    if (subStatus === 'expired' || subStatus === 'suspended') {
      return res.status(403).json({ allowed: false, reason: 'Subscription is expired or suspended', status: subStatus });
    }

    const planConfig = CENTRAL_PLANS[planKey] || CENTRAL_PLANS.free;

    // 2. Validate Staff Addition Limit Server-Side
    if (action === 'add_staff') {
      const maxLimit = planConfig.employeeLimit;
      if (currentStaffCount >= maxLimit) {
        return res.status(403).json({
          allowed: false,
          reason: `Paket limitinize ulaştınız. ${planKey.toUpperCase()} paketinizde en fazla ${maxLimit} çalışan ekleyebilirsiniz.`,
          currentCount: currentStaffCount,
          maxLimit: maxLimit,
          plan: planKey
        });
      }
      return res.status(200).json({ allowed: true, plan: planKey, maxLimit: maxLimit });
    }

    // 3. Validate Feature Access Server-Side
    if (action === 'check_feature') {
      const isAllowed = Boolean(planConfig[requestedFeature]);
      return res.status(200).json({ allowed: isAllowed, feature: requestedFeature, plan: planKey });
    }

    return res.status(400).json({ error: 'Invalid action specified' });
  } catch (error) {
    console.error('Business Limits Error:', error);
    return res.status(500).json({ error: 'Internal Serverless Error', details: error.message });
  }
}
