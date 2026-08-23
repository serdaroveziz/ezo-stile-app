import fs from 'fs';
import crypto from 'crypto';

function getFileHash(filepath) {
  if (!fs.existsSync(filepath)) return 'FILE_NOT_FOUND';
  const buffer = fs.readFileSync(filepath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

console.log('--- 🔍 SHA256 FILE HASH COMPARISON ---');
console.log('main/index.html:     ', getFileHash('index.html'));
console.log('main/docs/index.html:', getFileHash('docs/index.html'));
console.log('main/sw.js:          ', getFileHash('sw.js'));
console.log('main/docs/sw.js:     ', getFileHash('docs/sw.js'));
