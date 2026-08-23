import fs from 'fs';

const commit = '946c3c3';

let html = fs.readFileSync('index.html', 'utf8');
html = html.replaceAll(/Build:\s*[a-f0-9]{7}/gi, `Build: ${commit}`);
fs.writeFileSync('index.html', html, 'utf8');

console.log(`Set Build: ${commit} in index.html`);
