import fs from 'fs';

async function diagnose() {
  console.log('================================================================');
  console.log('🔍 DEEP DEPLOYMENT DIAGNOSTICS');
  console.log('================================================================\n');

  // 1. Fetch main branch latest commit from GitHub API
  try {
    const mainRes = await fetch('https://api.github.com/repos/serdaroveziz/ezo-stile-app/commits/main', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const mainCommit = await mainRes.json();
    console.log('1. GitHub API main HEAD commit:    ', mainCommit.sha ? mainCommit.sha.substring(0, 7) : 'ERROR');
  } catch (e) {
    console.error('Error main API:', e.message);
  }

  // 2. Fetch gh-pages branch latest commit from GitHub API
  try {
    const ghRes = await fetch('https://api.github.com/repos/serdaroveziz/ezo-stile-app/commits/gh-pages', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const ghCommit = await ghRes.json();
    console.log('2. GitHub API gh-pages HEAD commit:', ghCommit.sha ? ghCommit.sha.substring(0, 7) : 'ERROR');
  } catch (e) {
    console.error('Error gh-pages API:', e.message);
  }

  // 3. Plain fetch to live URL (as a browser standard GET request)
  try {
    const liveRes = await fetch('https://serdaroveziz.github.io/ezo-stile-app/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' }
    });
    const html = await liveRes.text();
    const bMatch = html.match(/Build:\s*([a-f0-9]{7})/i);
    const swMatch = html.match(/sw\.js\?v=(1\.0\.\d+)/i) || html.match(/SW:\s*(v1\.0\.\d+)/i);
    console.log('3. Live plain GET Build:           ', bMatch ? bMatch[1] : 'NOT_FOUND');
    console.log('   Live plain GET SW:              ', swMatch ? swMatch[1] : 'NOT_FOUND');
    console.log('   Live HTML Length:               ', html.length);
  } catch (e) {
    console.error('Error live plain GET:', e.message);
  }

  // 4. Cache-busted fetch to live URL
  try {
    const cacheRes = await fetch(`https://serdaroveziz.github.io/ezo-stile-app/?cb=${Date.now()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache, no-store' }
    });
    const html = await cacheRes.text();
    const bMatch = html.match(/Build:\s*([a-f0-9]{7})/i);
    const swMatch = html.match(/sw\.js\?v=(1\.0\.\d+)/i) || html.match(/SW:\s*(v1\.0\.\d+)/i);
    console.log('4. Live cache-busted Build:        ', bMatch ? bMatch[1] : 'NOT_FOUND');
    console.log('   Live cache-busted SW:           ', swMatch ? swMatch[1] : 'NOT_FOUND');
  } catch (e) {
    console.error('Error live cache-busted:', e.message);
  }
}

diagnose();
