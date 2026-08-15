const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

global.window = {
  localStorage: { getItem: () => null, setItem: () => {} },
  addEventListener: () => {},
  dispatchEvent: () => {}
};
global.localStorage = global.window.localStorage;
global.document = {
  getElementById: (id) => ({ innerText: '', style: {} }),
  addEventListener: () => {}
};
global.navigator = { serviceWorker: { register: () => Promise.resolve() } };
global.Date = Date;

const scriptMatches = html.match(/<script[\s\S]*?<\/script>/gi);
const appScript = scriptMatches[scriptMatches.length - 1].replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');

try {
  eval(appScript);
  console.log('App script syntax OK!');
} catch (e) {
  console.error('SYNTAX ERROR:', e);
}
