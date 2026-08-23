/* EZO STİLE - A/B Benchmark Runner (8 Test Generations Matrix) */

const BENCHMARK_PROMPTS = {
  italianSidePart: "handsome male model with clean Italian side part haircut, professional barber styling, natural hair texture, highly detailed, high quality photo, preserving face identity and facial features",
  frenchCrop: "handsome male model with textured French crop haircut, short sides fade, natural hair texture, highly detailed, high quality photo, preserving face identity and facial features"
};

const BENCHMARK_TEST_MATRIX = [
  // PHOTO 1 (Model A)
  { testId: 'T1_REP_ITALIAN', photoLabel: 'Fotoğraf 1 (Erkek Model A)', styleLabel: 'Italian Side Part', provider: 'replicate', model: 'black-forest-labs/flux-fill-dev', prompt: BENCHMARK_PROMPTS.italianSidePart },
  { testId: 'T2_REP_FRENCH',  photoLabel: 'Fotoğraf 1 (Erkek Model A)', styleLabel: 'French Crop',        provider: 'replicate', model: 'black-forest-labs/flux-fill-dev', prompt: BENCHMARK_PROMPTS.frenchCrop },
  { testId: 'T3_FAL_ITALIAN', photoLabel: 'Fotoğraf 1 (Erkek Model A)', styleLabel: 'Italian Side Part', provider: 'fal',       model: 'fal-ai/flux-dev/inpainting',     prompt: BENCHMARK_PROMPTS.italianSidePart },
  { testId: 'T4_FAL_FRENCH',  photoLabel: 'Fotoğraf 1 (Erkek Model A)', styleLabel: 'French Crop',        provider: 'fal',       model: 'fal-ai/flux-dev/inpainting',     prompt: BENCHMARK_PROMPTS.frenchCrop },

  // PHOTO 2 (Model B)
  { testId: 'T5_REP_ITALIAN', photoLabel: 'Fotoğraf 2 (Erkek Model B)', styleLabel: 'Italian Side Part', provider: 'replicate', model: 'black-forest-labs/flux-fill-dev', prompt: BENCHMARK_PROMPTS.italianSidePart },
  { testId: 'T6_REP_FRENCH',  photoLabel: 'Fotoğraf 2 (Erkek Model B)', styleLabel: 'French Crop',        provider: 'replicate', model: 'black-forest-labs/flux-fill-dev', prompt: BENCHMARK_PROMPTS.frenchCrop },
  { testId: 'T7_FAL_ITALIAN', photoLabel: 'Fotoğraf 2 (Erkek Model B)', styleLabel: 'Italian Side Part', provider: 'fal',       model: 'fal-ai/flux-dev/inpainting',     prompt: BENCHMARK_PROMPTS.italianSidePart },
  { testId: 'T8_FAL_FRENCH',  photoLabel: 'Fotoğraf 2 (Erkek Model B)', styleLabel: 'French Crop',        provider: 'fal',       model: 'fal-ai/flux-dev/inpainting',     prompt: BENCHMARK_PROMPTS.frenchCrop }
];

async function runSingleBenchmarkTest(testConfig, imageBase64, maskBase64) {
  try {
    const res = await fetch('/api/ai-benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: testConfig.provider,
        prompt: testConfig.prompt,
        image: imageBase64,
        mask: maskBase64,
        adminPassword: '1405'
      })
    });
    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: err.message,
      testId: testConfig.testId
    };
  }
}
