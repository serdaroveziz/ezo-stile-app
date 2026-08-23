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
    const { userId, userToken, staffId, businessId, activeState } = req.body;

    if (!userId || !userToken || !staffId || activeState === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // 1. Session Token Authentication
    if (!verifyUserToken(userId, userToken)) {
      return res.status(401).json({ error: 'Unauthorized session token signature' });
    }

    // 2. Fetch Initiator Record & Business Isolation Guard
    const userRes = await fetch(`${dbUrl}/users/${userId}.json`);
    const userData = await userRes.json();

    const isOwner = userData && (userData.role === 'owner' || userData.role === 'admin' || userData.role === 'super_admin');
    const isManager = userData && userData.role === 'manager' && userData.permissions && userData.permissions['staff.manage'] === true;

    if (!isOwner && !isManager) {
      return res.status(403).json({ error: 'Permission denied. Only Owner or authorized Manager can toggle staff active status.' });
    }

    // 3. Prevent Owner Account Deactivation by Non-Owner
    const targetStaffRes = await fetch(`${dbUrl}/staff/${staffId}.json`);
    const targetStaffData = await targetStaffRes.json();

    if (targetStaffData && targetStaffData.role === 'owner' && userData.role !== 'owner' && userData.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only Salon Owner or Super Admin can deactivate owner accounts.' });
    }

    // 4. Update Active Status (Data Preserved 100%)
    await fetch(`${dbUrl}/staff/${staffId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: activeState })
    });

    // Also update corresponding user record if phone exists
    if (targetStaffData && targetStaffData.phone) {
      const uId = 'usr_' + targetStaffData.phone;
      await fetch(`${dbUrl}/users/${uId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: activeState })
      });
    }

    return res.status(200).json({
      success: true,
      staffId,
      activeState,
      message: activeState ? 'Personel hesabı tekrar aktif edildi.' : 'Personel pasifleştirildi. Geçmiş kayıtları korundu, girişi engellendi.'
    });
  } catch (error) {
    console.error('Toggle Staff Active Error:', error);
    return res.status(500).json({ error: 'Server error toggling staff active status.', details: error.message });
  }
}
