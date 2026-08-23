import crypto from 'crypto';

const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
const dbUrl = firebaseDatabaseUrl.replace(/\/+$/, '');
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
    const { userId, userToken, businessId, staffName, staffPhone, staffRole, permissions, services } = req.body;

    if (!userId || !userToken || !businessId || !staffName || !staffPhone) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // 1. Session Token Verification
    if (!verifyUserToken(userId, userToken)) {
      return res.status(401).json({ error: 'Unauthorized session token signature' });
    }

    // 2. Fetch Inviter Record & Business Isolation Guard
    const inviterRes = await fetch(`${dbUrl}/users/${userId}.json`);
    const inviterData = await inviterRes.json();

    const isOwner = inviterData && (inviterData.role === 'owner' || inviterData.role === 'admin' || inviterData.role === 'super_admin');
    const isManager = inviterData && inviterData.role === 'manager' && inviterData.permissions && inviterData.permissions['staff.manage'] === true;

    if (!isOwner && !isManager) {
      return res.status(403).json({ error: 'Permission denied. Only Owner or authorized Manager can invite staff.' });
    }

    // Multi-tenant Business Isolation Check
    if (inviterData.businessId && inviterData.businessId !== businessId && inviterData.role !== 'super_admin') {
      return res.status(403).json({ error: 'Tenant isolation violation. Cannot invite staff to another salon.' });
    }

    // 3. SaaS Plan Staff Limit Verification
    const bizRes = await fetch(`${dbUrl}/businesses/${businessId}.json`);
    const bizData = (await bizRes.json()) || {};
    const plan = bizData.plan || 'Free';

    const maxStaffLimit = plan === 'Premium' ? 20 : plan === 'Pro' ? 5 : 1;

    // Count current active staff
    const staffRes = await fetch(`${dbUrl}/staff.json`);
    const staffAll = (await staffRes.json()) || {};
    const bizStaffCount = Object.values(staffAll).filter(s => s && s.businessId === businessId && s.active !== false).length;

    if (bizStaffCount >= maxStaffLimit) {
      return res.status(429).json({
        error: `SaaS Plan Limit Exceeded. ${plan} plan allows up to ${maxStaffLimit} staff. Please upgrade your subscription.`
      });
    }

    // 4. Generate Unpredictable One-Time Invitation Token
    const inviteId = 'inv_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex');
    const tokenSecret = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    const inviteRecord = {
      inviteId,
      tokenSecret,
      businessId,
      businessName: bizData.name || 'EZO STİLE Salon',
      staffName,
      staffPhone,
      role: staffRole || 'barber',
      permissions: permissions || {
        'appointments.view': true,
        'appointments.manage': true,
        'schedule.manage': true,
        'customers.view': true
      },
      services: services || ['Saç Kesimi'],
      createdById: userId,
      createdAt: new Date().toISOString(),
      expiresAt,
      usedAt: null,
      active: true
    };

    global.__staff_invitations_cache = global.__staff_invitations_cache || {};
    global.__staff_invitations_cache[inviteId] = inviteRecord;
    await fetch(`${dbUrl}/staff_invitations/${inviteId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteRecord)
    });

    const inviteUrl = `https://serdaroveziz.github.io/ezo-stile-app/?inviteId=${inviteId}&code=${tokenSecret}`;

    return res.status(200).json({
      success: true,
      inviteId,
      inviteCode: tokenSecret,
      inviteUrl,
      expiresAt,
      message: 'Personel daveti başarıyla oluşturuldu.'
    });
  } catch (error) {
    console.error('Staff Invite Error:', error);
    return res.status(500).json({ error: 'Server error generating staff invitation.', details: error.message });
  }
}
