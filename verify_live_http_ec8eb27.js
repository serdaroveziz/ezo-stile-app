import fs from 'fs';
import crypto from 'crypto';

function getHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function verifyLive() {
  const targetCommit = 'ec8eb27';
  const targetSW = 'v1.0.53';
  const url = `https://serdaroveziz.github.io/ezo-stile-app/?ts=${Date.now()}`;

  console.log('================================================================');
  console.log('⚡ REAL HTTP GET VERIFICATION ON LIVE INTERNET URL');
  console.log(`URL: ${url}`);
  console.log('================================================================\n');

  try {
    const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' } });
    const html = await res.text();
    const liveHash = getHash(html);

    const commitMatch = html.match(/Build:\s*([a-f0-9]{7})/i);
    const swMatch = html.match(/sw\.js\?v=(1\.0\.\d+)/i) || html.match(/SW:\s*(v1\.0\.\d+)/i);
    const bootMatch = html.match(/(BOOT_\d+\s*[^<]*)/i);

    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    console.log(`Live HTML Length: ${html.length} bytes`);
    console.log(`Live HTML SHA256: ${liveHash}`);
    console.log(`Live HTTP Build Value: "${commitMatch ? commitMatch[1] : 'NOT_FOUND'}"`);
    console.log(`Live HTTP SW Value:    "${swMatch ? swMatch[1] : 'NOT_FOUND'}"`);
    console.log(`Live HTTP Last Boot:   "${bootMatch ? bootMatch[1] : 'NOT_FOUND'}"`);

    const localHtml = fs.readFileSync('index.html', 'utf8');
    const localHash = getHash(localHtml);
    console.log(`\nLocal index.html SHA256: ${localHash}`);
    console.log(`Hashes Equal: ${liveHash === localHash ? '✅ 100% IDENTICAL' : '⚠️ DIFFERENT'}`);

  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}

verifyLive();
