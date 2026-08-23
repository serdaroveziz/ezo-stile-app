import crypto from 'crypto';

const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
const dbUrl = firebaseDatabaseUrl.replace(/\/+$/, '');
const HMAC_SECRET = process.env.HMAC_SECRET || 'ezostile-server-only-secret-key-2026';

function hashPassword(password) {
  return crypto.createHmac('sha256', HMAC_SECRET).update(password).digest('hex');
}

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
    const { action } = req.body;

    // Action 1: Patron requests password reset token for staff
    if (action === 'request_reset') {
      const { userId, userToken, staffId, businessId } = req.body;

      if (!userId || !userToken || !staffId) {
        return res.status(400).json({ error: 'Missing parameters' });
      }

      if (!verifyUserToken(userId, userToken)) {
        return res.status(401).json({ error: 'Unauthorized session token signature' });
      }

      const resetId = 'rst_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex');
      const resetCode = crypto.randomBytes(16).toString('hex');
      const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour

      const resetRecord = {
        resetId,
        resetCode,
        staffId,
        businessId,
        createdById: userId,
        createdAt: new Date().toISOString(),
        expiresAt,
        usedAt: null
      };

      await fetch(`${dbUrl}/password_resets/${resetId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetRecord)
      });

      const resetUrl = `https://serdaroveziz.github.io/ezo-stile-app/?resetId=${resetId}&code=${resetCode}`;

      return res.status(200).json({
        success: true,
        resetId,
        resetCode,
        resetUrl,
        expiresAt,
        message: 'Tek kullanımlık şifre sıfırlama bağlantısı oluşturuldu.'
      });
    }

    // Action 2: Staff completes password reset with token
    if (action === 'complete_reset') {
      const { resetId, code, newPassword } = req.body;

      if (!resetId || !code || !newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: 'Missing parameters or password too short' });
      }

      const rRes = await fetch(`${dbUrl}/password_resets/${resetId}.json`);
      const rData = await rRes.json();

      if (!rData || rData.resetCode !== code) {
        return res.status(401).json({ error: 'Geçersiz şifre sıfırlama kodu.' });
      }

      if (rData.usedAt !== null) {
        return res.status(409).json({ error: 'Bu sıfırlama bağlantısı daha önce kullanılmıştır.' });
      }

      if (Date.now() > rData.expiresAt) {
        return res.status(410).json({ error: 'Sıfırlama bağlantısının süresi dolmuştur (1 saatlik süre aşımı).' });
      }

      // Mark reset as used
      const usedAtIso = new Date().toISOString();
      await fetch(`${dbUrl}/password_resets/${resetId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usedAt: usedAtIso })
      });

      // Update Staff Password Hash
      const newHash = hashPassword(newPassword);
      await fetch(`${dbUrl}/staff/${rData.staffId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwordHash: newHash })
      });

      return res.status(200).json({
        success: true,
        message: 'Şifreniz başarıyla güncellendi! Yeni şifrenizle giriş yapabilirsiniz.'
      });
    }

    return res.status(400).json({ error: 'Invalid action parameter' });
  } catch (error) {
    console.error('Password Reset Error:', error);
    return res.status(500).json({ error: 'Server error handling password reset.', details: error.message });
  }
}
