import crypto from 'crypto';

const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
const dbUrl = firebaseDatabaseUrl.replace(/\/+$/, '');
const HMAC_SECRET = process.env.HMAC_SECRET || 'ezostile-server-only-secret-key-2026';

function hashPassword(password) {
  return crypto.createHmac('sha256', HMAC_SECRET).update(password).digest('hex');
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
    const { inviteId, code, password } = req.body;

    if (!inviteId || !code || !password || password.length < 4) {
      return res.status(400).json({ error: 'Missing parameters or password too short' });
    }

    // 1. Fetch Invitation Record
    let inviteData = null;
    try {
      const inviteRes = await fetch(`${dbUrl}/staff_invitations/${inviteId}.json`);
      inviteData = await inviteRes.json();
    } catch (e) {}

    if (!inviteData && global.__staff_invitations_cache && global.__staff_invitations_cache[inviteId]) {
      inviteData = global.__staff_invitations_cache[inviteId];
    }

    if (!inviteData) {
      return res.status(404).json({ error: 'Davet bulunamadı veya geçersiz.' });
    }

    // 2. Security Check: Token Secret Matching
    if (inviteData.tokenSecret !== code) {
      return res.status(401).json({ error: 'Geçersiz davet kodu.' });
    }

    // 3. Single-Use Check (usedAt flag)
    if (inviteData.usedAt !== null) {
      return res.status(409).json({ error: 'Bu davet bağlantısı daha önce kullanılmıştır. Tekrar kullanılamaz.' });
    }

    // 4. Expiration Check (expiresAt)
    if (Date.now() > inviteData.expiresAt) {
      return res.status(410).json({ error: 'Davet süresi dolmuştur (24 saatlik süre aşımı).' });
    }

    // 5. Mark Invitation as USED (Atomic Single-Use Invalidation)
    const usedAtIso = new Date().toISOString();
    try {
      await fetch(`${dbUrl}/staff_invitations/${inviteId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usedAt: usedAtIso })
      });
    } catch (e) {}

    if (global.__staff_invitations_cache && global.__staff_invitations_cache[inviteId]) {
      global.__staff_invitations_cache[inviteId].usedAt = usedAtIso;
    }

    // 6. Create / Update Staff & User Record with Private Hashed Password
    const passwordHash = hashPassword(password);
    const staffId = 'stf_' + Date.now();

    const staffRecord = {
      id: staffId,
      businessId: inviteData.businessId,
      name: inviteData.staffName,
      phone: inviteData.staffPhone,
      role: inviteData.role,
      permissions: inviteData.permissions,
      services: inviteData.services,
      passwordHash,
      active: true,
      createdAt: usedAtIso
    };

    try {
      await fetch(`${dbUrl}/staff/${staffId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffRecord)
      });
    } catch (e) {}

    // Also register user record with staff role
    const userId = 'usr_' + inviteData.staffPhone;
    try {
      await fetch(`${dbUrl}/users/${userId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userId,
          name: inviteData.staffName,
          phone: inviteData.staffPhone,
          role: inviteData.role,
          businessId: inviteData.businessId,
          permissions: inviteData.permissions,
          passwordHash,
          active: true
        })
      });
    } catch (e) {}

    return res.status(200).json({
      success: true,
      staffId,
      businessId: inviteData.businessId,
      role: inviteData.role,
      message: 'Davet başarıyla kabul edildi! Kendi şifrenizle giriş yapabilirsiniz.'
    });
  } catch (error) {
    console.error('Accept Invite Error:', error);
    return res.status(500).json({ error: 'Server error accepting staff invitation.', details: error.message });
  }
}
