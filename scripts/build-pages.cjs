const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs');
fs.mkdirSync(out, { recursive: true });
for (const name of ['index.html', 'app.js', 'styles.css', 'content', 'vendor']) {
  fs.cpSync(path.join(root, 'web', name), path.join(out, name), { recursive: true });
}
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('GitHub Pages files prepared in docs/');
