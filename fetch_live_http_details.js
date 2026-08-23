import fs from 'fs';

async function fetchLiveHttpDetails() {
  const url = `https://serdaroveziz.github.io/ezo-stile-app/?t=${Date.now()}`;
  console.log('--- 🌐 FETCHING REAL LIVE HTTP RESPONSE FROM INTERNET ---');
  console.log(`URL: ${url}`);

  try {
    const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' } });
    console.log('HTTP Status:', res.status, res.statusText);
    console.log('Headers:');
    for (let [k, v] of res.headers.entries()) {
      if (['content-type', 'cache-control', 'etag', 'last-modified', 'server', 'x-cache', 'x-github-request-id', 'fastly-restarts'].includes(k.toLowerCase())) {
        console.log(`  ${k}: ${v}`);
      }
    }

    const html = await res.text();
    console.log('\nHTML Length:', html.length, 'bytes');

    const commitMatch = html.match(/Build:\s*([a-f0-9]{7})/i);
    const swMatch = html.match(/sw\.js\?v=(1\.0\.\d+)/i) || html.match(/SW:\s*(v1\.0\.\d+)/i);
    const bootMatch = html.match(/(BOOT_\d+\s*[^<]*)/i);

    console.log('Live HTTP Build Value:', commitMatch ? commitMatch[1] : 'NOT_FOUND_IN_HTML');
    console.log('Live HTTP SW Value:   ', swMatch ? swMatch[1] : 'NOT_FOUND_IN_HTML');
    console.log('Live HTTP Last Boot:  ', bootMatch ? bootMatch[1] : 'NOT_FOUND_IN_HTML');
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

fetchLiveHttpDetails();
