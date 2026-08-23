/* EZO STİLE - A/B Benchmark Serverless Function (Replicate vs Fal.ai FLUX.1 Fill) */

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
    const { provider, prompt, image, mask, adminPassword } = req.body;

    if (!adminPassword || adminPassword !== '1405') {
      return res.status(401).json({ error: 'Unauthorized Admin Authentication for A/B Benchmark' });
    }

    if (!provider || !prompt || !image) {
      return res.status(400).json({ error: 'Missing required parameters (provider, prompt, image)' });
    }

    const startTime = Date.now();
    const generationId = 'gen_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // -------------------------------------------------------------
    // PROVIDER 1: REPLICATE (black-forest-labs/flux-fill-dev)
    // -------------------------------------------------------------
    if (provider === 'replicate') {
      const apiToken = process.env.REPLICATE_API_TOKEN;
      if (!apiToken) {
        return res.status(500).json({
          error: 'REPLICATE_API_TOKEN environment variable is missing on Vercel',
          provider: 'replicate',
          simulated: true
        });
      }

      // Call Replicate Predictions API
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
            prompt: prompt,
            output_format: 'jpeg',
            guidance_scale: 30
          }
        })
      });

      const repData = await repRes.json();
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
      const estCost = 0.025; // ~$0.025 est per run on flux-fill-dev

      return res.status(200).json({
        success: true,
        generationId,
        provider: 'Replicate',
        model: 'black-forest-labs/flux-fill-dev',
        durationSec: `${durationSec}s`,
        costEstimate: `$${estCost}`,
        outputUrl: (repData.output && repData.output[0]) || image,
        resolution: '1024x1024'
      });
    }

    // -------------------------------------------------------------
    // PROVIDER 2: FAL.AI (fal-ai/flux-dev/inpainting)
    // -------------------------------------------------------------
    else if (provider === 'fal') {
      const falKey = process.env.FAL_KEY;
      if (!falKey) {
        return res.status(500).json({
          error: 'FAL_KEY environment variable is missing on Vercel',
          provider: 'fal',
          simulated: true
        });
      }

      const falRes = await fetch('https://fal.run/fal-ai/flux-dev/inpainting', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_url: image,
          mask_url: mask || image,
          prompt: prompt,
          image_size: 'square_hd'
        })
      });

      const falData = await falRes.json();
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
      const estCost = 0.018; // ~$0.018 est per run on fal.ai flux-dev inpainting

      return res.status(200).json({
        success: true,
        generationId,
        provider: 'Fal.ai',
        model: 'fal-ai/flux-dev/inpainting',
        durationSec: `${durationSec}s`,
        costEstimate: `$${estCost}`,
        outputUrl: (falData.images && falData.images[0] && falData.images[0].url) || image,
        resolution: '1024x1024'
      });
    } else {
      return res.status(400).json({ error: 'Invalid provider. Must be replicate or fal' });
    }
  } catch (err) {
    console.error('AI Benchmark Error:', err);
    return res.status(500).json({ error: 'Serverless AI Execution Error', details: err.message });
  }
}
