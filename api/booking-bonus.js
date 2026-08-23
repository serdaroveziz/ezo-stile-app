import crypto from 'crypto';

const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
const HMAC_SECRET = process.env.HMAC_SECRET || 'ezostile-server-only-secret-key-2026';

function verifyAdminSessionToken(adminUid, token) {
  if (!adminUid || !token) return false;
  try {
    const [timestampStr, signature] = token.split('.');
    if (!timestampStr || !signature) return false;

    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    if (isNaN(timestamp) || (now - timestamp) > 86400000) return false; // 24 hour expiry

    const expectedSignature = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(`admin.${adminUid}.${timestamp}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (e) {
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
    const { appointmentId, adminUid, adminToken } = req.body;

    if (!appointmentId || !adminUid || !adminToken) {
      return res.status(400).json({ error: 'Missing required parameters (appointmentId, adminUid, adminToken)' });
    }

    // 1. Verify Admin Cryptographic Session Token (No plaintext password in request)
    const isTokenValid = verifyAdminSessionToken(adminUid, adminToken);
    
    // Fallback: Verify Admin Role directly against Firebase Database
    const adminUserRes = await fetch(`${firebaseDatabaseUrl}/users/${adminUid}.json`);
    const adminUserData = await adminUserRes.json();

    const isDatabaseAdmin = adminUserData && (adminUserData.role === 'admin' || adminUserData.role === 'super_admin');

    if (!isTokenValid && !isDatabaseAdmin) {
      return res.status(401).json({ error: 'Unauthorized: Admin identity or role verification failed' });
    }

    // 2. Fetch authoritative appointment record directly from Firebase Database
    const aptRes = await fetch(`${firebaseDatabaseUrl}/ezostile_v5/appointments.json`);
    const appointments = await aptRes.json();

    if (!appointments) {
      return res.status(404).json({ error: 'No appointments database record found' });
    }

    const aptIndex = appointments.findIndex(a => a && (a.id === appointmentId || a.id == appointmentId));
    if (aptIndex === -1) {
      return res.status(404).json({ error: 'Appointment ID not found in database' });
    }

    const targetApt = appointments[aptIndex];

    // 3. Server-side check: Must ALREADY be approved in DB and bonus NOT claimed
    if (targetApt.status !== 'approved') {
      return res.status(403).json({ error: 'Forbidden: Appointment status is not approved in database' });
    }

    if (targetApt.aiBonusClaimed === true) {
      return res.status(400).json({ error: 'Idempotency Block: Bonus already claimed for this appointment', claimed: true });
    }

    const targetUserId = targetApt.userId || ('usr_' + (targetApt.customerPhone || '').replace(/\D/g, ''));
    if (!targetUserId) {
      return res.status(400).json({ error: 'Missing customer identity on appointment' });
    }

    // 4. Fetch customer record & grant +2 credits
    const userRes = await fetch(`${firebaseDatabaseUrl}/users/${targetUserId}.json`);
    const userData = await userRes.json();
    const currentCredits = (userData && typeof userData.aiCredits === 'number') ? userData.aiCredits : 3;

    const newCredits = currentCredits + 2;

    // 5. Update Firebase DB atomically: Set aiBonusClaimed = true and add +2 credits
    appointments[aptIndex].aiBonusClaimed = true;

    await fetch(`${firebaseDatabaseUrl}/ezostile_v5.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointments })
    });

    await fetch(`${firebaseDatabaseUrl}/users/${targetUserId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiCredits: newCredits })
    });

    return res.status(200).json({ success: true, bonusAdded: 2, newCredits, appointmentId });
  } catch (error) {
    console.error('Booking Bonus Error:', error);
    return res.status(500).json({ error: 'Internal Serverless Error', details: error.message });
  }
}
