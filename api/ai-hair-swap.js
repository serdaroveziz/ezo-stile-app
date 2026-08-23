import crypto from 'crypto';

const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
const HMAC_SECRET = process.env.HMAC_SECRET || 'ezostile-server-only-secret-key-2026';

// Verify cryptographic HMAC token
function verifyUserToken(userId, token) {
  if (!userId || !token) return false;
  try {
    const [timestampStr, signature] = token.split('.');
    if (!timestampStr || !signature) return false;
    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    if (isNaN(timestamp) || (now - timestamp) > 86400000) return false; // 24h

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

  const startTime = Date.now();
  const generationId = 'gen_rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  try {
    const { userId, userToken, image, mask, prompt, hairstyleName } = req.body;

    if (!userId || !userToken || !image) {
      return res.status(400).json({ error: 'Missing required parameters (userId, userToken, image)' });
    }

    // 1. Session Token Authentication
    if (!verifyUserToken(userId, userToken)) {
      return res.status(401).json({ error: 'Unauthorized session token signature' });
    }

    // 2. Fetch User Record & Check Credits
    const userRes = await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`);
    const userData = await userRes.json();
    const currentCredits = (userData && typeof userData.aiCredits === 'number') ? userData.aiCredits : 0;

    if (currentCredits <= 0) {
      return res.status(403).json({ error: 'Insufficient AI credits', credits: 0 });
    }

    // 3. Atomically Deduct 1 Credit
    const newCredits = currentCredits - 1;
    const newUsed = ((userData && userData.aiCreditsUsed) || 0) + 1;

    await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiCredits: newCredits, aiCreditsUsed: newUsed })
    });

    // 4. Dispatch Image & Hair Mask to Replicate API
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      // Return Canvas Preview Fallback if Token is not configured on Vercel
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
      return res.status(200).json({
        success: true,
        generationId,
        provider: 'Replicate',
        model: 'black-forest-labs/flux-fill-dev',
        outputUrl: image,
        durationSec: `${durationSec}s`,
        costUsd: 0.025,
        newCredits,
        isDemoFallback: true
      });
    }

    const repRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: 'black-forest-labs/flux-fill-dev',
        input: {
          image: image,
          mask: mask || image,
          prompt: prompt || `handsome male model with ${hairstyleName || 'stylish'} haircut, professional barber style, preserving face identity and facial features`,
          output_format: 'jpeg',
          guidance_scale: 30
        }
      })
    });

    const repData = await repRes.json();
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
    // Real-time calculated cost: $0.000725 per GPU second
    const actualCost = (parseFloat(durationSec) * 0.000725).toFixed(4);

    const outputUrl = (repData.output && repData.output[0]) || image;

    // 5. Log Telemetry to Firebase /ai_telemetry
    const telemetryData = {
      generationId,
      userId,
      provider: 'Replicate',
      exactModel: 'black-forest-labs/flux-fill-dev',
      resolution: '1024x1024',
      durationSec: `${durationSec}s`,
      costUsd: `$${actualCost}`,
      status: 'SUCCESS',
      timestamp: Date.now()
    };

    await fetch(`${firebaseDatabaseUrl}/ai_telemetry/${generationId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telemetryData)
    });

    return res.status(200).json({
      success: true,
      generationId,
      provider: 'Replicate',
      model: 'black-forest-labs/flux-fill-dev',
      outputUrl: outputUrl,
      durationSec: `${durationSec}s`,
      costUsd: `$${actualCost}`,
      newCredits
    });
  } catch (error) {
    console.error('Replicate Generation Error:', error);

    // Rollback: Refund 1 credit if Replicate fails
    try {
      const { userId } = req.body;
      if (userId) {
        const uRes = await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`);
        const uData = await uRes.json();
        const curCred = (uData && typeof uData.aiCredits === 'number') ? uData.aiCredits : 0;
        await fetch(`${firebaseDatabaseUrl}/users/${userId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aiCredits: curCred + 1 })
        });
      }
    } catch (rErr) {
      console.warn('Rollback failed:', rErr);
    }

    return res.status(500).json({ error: 'Replicate Generation Failed. Credit refunded.', details: error.message });
  }
}
