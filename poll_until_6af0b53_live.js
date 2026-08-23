import fs from 'fs';

async function pollLiveDeployment() {
  const targetCommit = '6af0b53';
  const targetSW = 'v1.0.51';
  const url = `https://serdaroveziz.github.io/ezo-stile-app/?t=${Date.now()}`;

  console.log('================================================================');
  console.log('⚡ CANLI GITHUB PAGES DEPLOYMENT POLLING (6af0b53 / v1.0.51)');
  console.log('================================================================\n');

  for (let attempt = 1; attempt <= 15; attempt++) {
    console.log(`[Attempt ${attempt}/15] Fetching live URL: ${url}`);
    try {
      const res = await fetch(`https://serdaroveziz.github.io/ezo-stile-app/?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' }
      });
      const html = await res.text();

      const commitMatch = html.match(/Build:\s*([a-f0-9]{7})/i);
      const swMatch = html.match(/sw\.js\?v=(1\.0\.\d+)/i) || html.match(/SW:\s*(v1\.0\.\d+)/i);

      const liveCommit = commitMatch ? commitMatch[1] : 'UNKNOWN';
      const liveSW = swMatch ? swMatch[1] : 'UNKNOWN';

      console.log(`   ➔ Live URL Length: ${html.length} | Commit: "${liveCommit}" | SW: "${liveSW}"`);

      if (liveCommit.toLowerCase() === targetCommit.toLowerCase() || html.includes('6af0b53') || (html.includes('v1.0.51') && liveCommit !== '87145ae')) {
        console.log('\n================================================================');
        console.log('🎉 VERIFIED! CANLI SITE YENİ BUILD VE SERVICE WORKER SÜRÜMÜNÜ YAYINLADI!');
        console.log(`Commit: ${liveCommit} | SW: ${liveSW}`);
        console.log('================================================================\n');
        return true;
      }
    } catch (err) {
      console.error(`   ❌ Fetch error: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 4000));
  }

  console.error('\n❌ TIMEOUT: Pages deployment polling timed out.');
  process.exit(1);
}

pollLiveDeployment();
