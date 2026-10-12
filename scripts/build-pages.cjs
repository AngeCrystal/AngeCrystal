const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const web = path.join(root, 'web');
const out = path.join(root, 'docs');
const languages = ['zh', 'en'];

// Every command needs a Markdown file and a description in each language.
const commands = JSON.parse(fs.readFileSync(path.join(web, 'content', 'commands.json'), 'utf8'));
const bundle = { 'commands.json': commands };
const missing = [];
for (const item of commands) {
  for (const lang of languages) {
    const file = `${lang}/${item.file}`;
    const source = path.join(web, 'content', file);
    if (typeof item.description?.[lang] !== 'string') missing.push(`${item.command}: description.${lang}`);
    if (fs.existsSync(source)) bundle[file] = fs.readFileSync(source, 'utf8');
    else missing.push(`${item.command}: content/${file}`);
  }
}
if (missing.length) {
  console.error(`Missing translations:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

// Pages gets no content/ directory: Markdown is only reachable through terminal commands.
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'en'), { recursive: true });
for (const name of ['app.js', 'styles.css', 'vendor']) {
  fs.cpSync(path.join(web, name), path.join(out, name), { recursive: true });
}
for (const page of ['index.html', 'en/index.html']) {
  const html = fs.readFileSync(path.join(web, page), 'utf8').replace(/<html lang="([^"]+)">/, '<html lang="$1" data-bundle>');
  if (!html.includes('data-bundle')) throw new Error(`${page}: <html lang> not found`);
  fs.writeFileSync(path.join(out, page), html);
}
fs.writeFileSync(path.join(out, 'content.js'), `export default ${JSON.stringify(bundle).replaceAll('<', '\\u003c')};\n`);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`GitHub Pages files prepared in docs/ (${Object.keys(bundle).length - 1} Markdown files bundled)`);
