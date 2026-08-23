import crypto from 'crypto';

const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
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

// Official OpenAI Pricing for gpt-image-1-mini and gpt-image-2
function calculateOpenAiTotalCost(modelName, quality = 'medium') {
  if (modelName === 'gpt-image-2') {
    return '$0.046 (Input Token: $0.006 + Output: $0.040)';
  } else if (modelName === 'gpt-image-1-mini') {
    if (quality === 'high') {
      // High Quality: Input Token ($0.003) + Output ($0.036) = $0.039
      return '$0.039 (Input Token: $0.003 + Output: $0.036)';
    } else if (quality === 'low') {
      // Low Quality: Input Token ($0.002) + Output ($0.005) = $0.007
      return '$0.007 (Input Token: $0.002 + Output: $0.005)';
    } else {
      // Medium Quality: Input Token ($0.002) + Output ($0.011) = $0.013
      return '$0.013 (Input Token: $0.002 + Output: $0.011)';
    }
  }
  return '$0.013 (Tahmini)';
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
  const generationId = 'gen_oai_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  try {
    const { userId, userToken, image, prompt, hairstyleName, modelName, quality } = req.body;

    if (!userId || !userToken || !image) {
      return res.status(400).json({ error: 'Missing required parameters (userId, userToken, image)' });
    }

    if (!verifyUserToken(userId, userToken)) {
      return res.status(401).json({ error: 'Unauthorized session token signature' });
    }

    const openAiApiKey = process.env.OPENAI_API_KEY;
    const selectedModel = modelName || 'gpt-image-1-mini';
    const selectedQuality = quality || 'medium';
    const estimatedTotalCostUsd = calculateOpenAiTotalCost(selectedModel, selectedQuality);

    if (!openAiApiKey) {
      const userWaitTimeSec = ((Date.now() - startTime) / 1000).toFixed(2);
      const telemetryFallback = {
        generationId,
        predictionId: 'oai_edit_demo_' + Date.now(),
        userId,
        provider: 'OpenAI',
        exactModel: selectedModel,
        quality: selectedQuality,
        outputCount: 1,
        inputResolution: '1024x1024',
        userWaitTimeSec: `${userWaitTimeSec}s (Vercel HTTP)`,
        estimatedTotalCostUsd: estimatedTotalCostUsd,
        isCostEstimated: true,
        status: 'SUCCESS',
        isDemoFallback: true,
        createdAt: new Date().toISOString()
      };

      return res.status(200).json({
        success: true,
        ...telemetryFallback,
        outputUrl: image
      });
    }

    const openAiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        prompt: prompt || `handsome male model with clean ${hairstyleName || 'Italian Side Part'} haircut, professional barber style, natural hair texture, preserving face identity and facial features`,
        n: 1,
        size: '1024x1024',
        quality: selectedQuality,
        response_format: 'url'
      })
    });

    const openAiData = await openAiRes.json();
    const userWaitTimeSec = ((Date.now() - startTime) / 1000).toFixed(2);
    const outputUrl = (openAiData.data && openAiData.data[0] && openAiData.data[0].url) || image;

    const telemetryData = {
      generationId,
      predictionId: 'oai_edit_' + Date.now(),
      userId,
      provider: 'OpenAI',
      exactModel: selectedModel,
      quality: selectedQuality,
      outputCount: 1,
      inputResolution: '1024x1024',
      userWaitTimeSec: `${userWaitTimeSec}s`,
      estimatedTotalCostUsd: estimatedTotalCostUsd,
      isCostEstimated: true,
      status: openAiData.error ? 'FAILED' : 'SUCCESS',
      createdAt: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      ...telemetryData,
      outputUrl
    });
  } catch (error) {
    console.error('OpenAI Generation Error:', error);
    return res.status(500).json({ error: 'OpenAI Execution Failed', details: error.message });
  }
}
