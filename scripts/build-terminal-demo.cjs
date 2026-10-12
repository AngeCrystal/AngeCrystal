// Builds the terminal shown in the GitHub profile README: an SVG that replays a few commands from web/content/.
// README images cannot run scripts, so this is an animation (SMIL) that links to the live terminal.
const fs = require('node:fs');
const path = require('node:path');
const { lexer } = require('marked');

const root = path.resolve(__dirname, '..');
const content = path.join(root, 'web', 'content');
const commands = JSON.parse(fs.readFileSync(path.join(content, 'commands.json'), 'utf8'));
const builtins = {
  zh: [['/projects', '打开项目工作台'], ['/files', '列出可以读取的内容'], ['/clear', '清空当前会话']],
  en: [['/projects', 'Open the project workbench'], ['/files', 'List the content you can read'], ['/clear', 'Clear this session']],
};
const labels = {
  zh: { help: '列出所有可用命令', more: n => `… 还有 ${n} 条，在终端里输入 /help 查看`, footer: '↳ 点击进入终端，亲手输入命令' },
  en: { help: 'List every available command', more: n => `… ${n} more — type /help in the live terminal`, footer: '↳ Click to open the live terminal and type your own commands' },
};

const W = 880, H = 440, BAR = 36, FOOT = 40, PAD = 24, LINE = 23, FONT = 14, CHAR = FONT * 0.62;
const MAX_LINES = Math.floor((H - BAR - FOOT - PAD * 1.5) / LINE); // prompt + reply + closing prompt
const MAX_UNITS = Math.floor((W - PAD * 2) / CHAR) - 2;
const color = { bg: '#17181c', bar: '#1b1d22', line: '#303139', fg: '#dddce2', text: '#c9c8d0', muted: '#93939f', accent: '#c8ace8', code: '#d5bcf1', mint: '#9cbdb0' };
const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Wide glyphs are about 1em against a 0.62em monospace cell; overestimate slightly so lines never overflow.
const units = ch => (/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch) ? 1.7 : 1);
const closing = /^[，。、；：！？）」』》,.;:!?)]/; // Never start a line with closing punctuation.

// Breaks at spaces for Latin words and between characters for CJK, so English words stay whole.
function wrap(text, indent = '') {
  const lines = [];
  let line = indent, width = indent.length;
  const widthOf = token => [...token].reduce((sum, ch) => sum + units(ch), 0);
  for (const token of text.match(/\s+|[⺀-￿]|[^\s⺀-￿]+/gu) ?? []) {
    const size = widthOf(token);
    if (width + size > MAX_UNITS && line.trim() && !closing.test(token)) {
      lines.push(line.trimEnd()); line = indent; width = indent.length;
      if (!token.trim()) continue;
    }
    line += token; width += size;
  }
  return [...lines, line.trimEnd()];
}
const plain = tokens => tokens.map(t => (t.tokens ? plain(t.tokens) : t.text ?? '')).join('');

// Markdown → styled terminal lines, using the same block types the web terminal renders.
function replyLines(markdown) {
  const lines = [];
  for (const token of lexer(markdown)) {
    if (token.type === 'space') continue;
    if (lines.length) lines.push({ text: '', fill: color.text });
    if (token.type === 'heading') lines.push({ text: plain(token.tokens), fill: color.accent, bold: true });
    else if (token.type === 'code') lines.push(...token.text.split('\n').map(text => ({ text, fill: color.code })));
    else if (token.type === 'list') for (const item of token.items) lines.push(...wrap(plain(item.tokens), '  ').map((text, i) => ({ text: i ? text : `• ${text.slice(2)}`, fill: color.text })));
    else lines.push(...wrap(plain(token.tokens ?? []) || token.text).map(text => ({ text, fill: color.text })));
  }
  return lines;
}
function fit(lines, more) {
  const budget = MAX_LINES - 2;
  if (lines.length <= budget) return lines;
  const kept = lines.slice(0, budget - 1);
  while (kept.at(-1)?.text === '') kept.pop();
  return [...kept, { text: more ?? '…', fill: color.muted }];
}
function helpLines(lang) {
  const rows = [['/help', labels[lang].help], ...commands.map(c => [c.command, c.description[lang]]), ...builtins[lang]];
  const shown = rows.slice(0, MAX_LINES - 3);
  return [...shown.map(([command, description]) => ({ text: command, fill: color.accent, note: description })),
    ...(rows.length > shown.length ? [{ text: labels[lang].more(rows.length - shown.length), fill: color.muted }] : [])];
}
function scenes(lang) {
  const read = command => fs.readFileSync(path.join(content, lang, commands.find(c => c.command === command).file), 'utf8');
  return [
    { command: '/help', lines: helpLines(lang) },
    { command: '/whoami', lines: fit(replyLines(read('/whoami'))) },
    { command: '/skill', lines: fit(replyLines(read('/skill'))) },
  ];
}

function textLine(line, y) {
  const weight = line.bold ? ' font-weight="600"' : '';
  const note = line.note ? `<tspan x="${PAD + CHAR * 17}" fill="${color.muted}">${escape(line.note)}</tspan>` : '';
  return `<text x="${PAD}" y="${y}" fill="${line.fill}"${weight} xml:space="preserve">${escape(line.text)}${note}</text>`;
}
const prompt = y => `<text x="${PAD}" y="${y}" fill="${color.mint}">guest@crystal:~ $</text>`;

function render(lang, animate) {
  const list = animate ? scenes(lang) : scenes(lang).slice(0, 1);
  const typeStep = 0.12, lineStep = 0.07, hold = 3.6, lead = 0.2;
  const timeline = [];
  let t = lead;
  for (const scene of list) {
    const typed = t + scene.command.length * typeStep + 0.3;
    timeline.push({ start: t, typed, end: typed + scene.lines.length * lineStep + hold });
    t = timeline.at(-1).end + 0.2;
  }
  const total = t;
  const k = time => (time / total).toFixed(4);
  // Discrete opacity: hidden, visible from `from` until `to`, hidden again.
  const show = (from, to) => (animate ? `<animate attributeName="opacity" values="0;1;0" keyTimes="0;${k(from)};${k(to)}" calcMode="discrete" dur="${total.toFixed(2)}s" repeatCount="indefinite"/>` : '');
  const top = BAR + PAD + FONT;
  const commandX = PAD + CHAR * 18;
  // Base attributes show the finished first scene; animations override them. Viewers that ignore SMIL
  // therefore show a complete /help reply instead of an empty window.
  const body = list.map((scene, index) => {
    const { start, typed, end } = timeline[index];
    const hidden = index > 0 ? ' opacity="0"' : '';
    const clipId = `type-${index}`;
    const widths = [0, ...[...scene.command].map((_, i) => ((i + 1) * CHAR + 1).toFixed(1))];
    widths[widths.length - 1] = 400; // Never clip the finished command, whatever the real glyph width.
    const typing = animate
      ? `<clipPath id="${clipId}"><rect x="${commandX}" y="${top - FONT - 4}" height="${LINE}" width="${index > 0 ? 0 : 400}"><animate attributeName="width" values="${widths.join(';')}" keyTimes="0;${widths.slice(1).map((_, i) => k(start + (i + 1) * typeStep)).join(';')}" calcMode="discrete" dur="${total.toFixed(2)}s" repeatCount="indefinite"/></rect></clipPath>`
      : '';
    const replies = scene.lines.map((line, i) => {
      const y = top + LINE * (i + 1);
      const appear = typed + i * lineStep;
      return animate ? `<g${hidden}>${show(appear, end)}${textLine(line, y)}</g>` : textLine(line, y);
    }).join('');
    const closingY = top + LINE * (scene.lines.length + 1);
    const cursor = `<rect x="${commandX}" y="${closingY - FONT + 2}" width="${CHAR}" height="${FONT + 2}" fill="${color.accent}">${animate ? '<animate attributeName="opacity" values="1;0" dur="1s" calcMode="discrete" repeatCount="indefinite"/>' : ''}</rect>`;
    const closing = `<g${hidden}>${show(typed + scene.lines.length * lineStep, end)}${prompt(closingY)}${cursor}</g>`;
    return `<g${hidden}>${show(start, end)}${typing}${prompt(top)}<text x="${commandX}" y="${top}" fill="${color.fg}"${animate ? ` clip-path="url(#${clipId})"` : ''}>${escape(scene.command)}</text>${replies}${closing}</g>`;
  }).join('\n');
  const title = lang === 'zh' ? 'AngeCrystal 的交互终端演示' : "AngeCrystal's interactive terminal demo";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">
<title>${title}</title>
<style>text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono","PingFang SC","Noto Sans CJK SC",monospace;font-size:${FONT}px}</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="${color.bg}" stroke="${color.line}"/>
<path d="M0.5 ${BAR}V10.5A10 10 0 0 1 10.5 0.5H${W - 10.5}A10 10 0 0 1 ${W - 0.5} 10.5V${BAR}Z" fill="${color.bar}"/>
<line x1="0" y1="${BAR}" x2="${W}" y2="${BAR}" stroke="${color.line}"/>
<circle cx="20" cy="18" r="4" fill="#3a3b44"/><circle cx="34" cy="18" r="4" fill="#3a3b44"/><circle cx="48" cy="18" r="4" fill="#3a3b44"/>
<text x="68" y="22" fill="${color.muted}" style="font-size:11px;letter-spacing:1px">guest@crystal: ~ · SESSION / 01</text>
<text x="${W - 20}" y="22" fill="${color.muted}" text-anchor="end" style="font-size:11px;letter-spacing:1px">curiosity.daemon <tspan fill="${color.mint}">●</tspan></text>
${body}
<line x1="0" y1="${H - FOOT}" x2="${W}" y2="${H - FOOT}" stroke="${color.line}"/>
<text x="${PAD}" y="${H - FOOT / 2 + 5}" fill="${color.accent}">${escape(labels[lang].footer)}</text>
</svg>
`;
}

module.exports = function buildTerminalDemo() {
  const files = {};
  for (const lang of ['zh', 'en']) {
    files[lang] = { animated: `assets/terminal-demo.${lang}.svg`, still: `assets/terminal-demo.${lang}.static.svg` };
    fs.writeFileSync(path.join(root, files[lang].animated), render(lang, true));
    fs.writeFileSync(path.join(root, files[lang].still), render(lang, false));
  }
  return files;
};
if (require.main === module) console.log(module.exports());
