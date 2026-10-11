import { lexer } from './vendor/marked.esm.js';

const builtins = [
  { command: '/help', description: '列出所有可用命令' },
  { command: '/projects', description: '打开项目工作台' },
  { command: '/clear', description: '清空当前会话' },
];
const history = document.querySelector('#history');
const input = document.querySelector('#command-input');
const status = document.querySelector('#status');
const empty = document.querySelector('#empty-state');
const scrollback = document.querySelector('#scrollback');
const jump = document.querySelector('#jump-latest');
let commands = [];
let configError = false;
let composing = false;
let compositionEnded = -Infinity;
let following = true;
const node = (tag, text) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; return el; };

// Only render explicit Markdown structures. Raw HTML is always plain text.
function inline(tokens = []) {
  const fragment = document.createDocumentFragment();
  for (const token of tokens) {
    let el;
    if (['strong', 'em', 'del'].includes(token.type)) {
      el = node(token.type); el.append(inline(token.tokens));
    } else if (token.type === 'codespan') el = node('code', token.text);
    else if (token.type === 'br') el = node('br');
    else if (token.type === 'link') {
      let safe = false;
      try { safe = ['https:', 'http:', 'mailto:'].includes(new URL(token.href).protocol); } catch {}
      el = node(safe ? 'a' : 'span');
      if (safe) { el.href = token.href; el.target = '_blank'; el.rel = 'noopener noreferrer'; }
      el.append(inline(token.tokens));
    } else if (token.type === 'image') el = node('span', token.text || '[image]');
    else if (token.tokens) { fragment.append(inline(token.tokens)); continue; }
    else el = document.createTextNode(token.text ?? token.raw ?? '');
    fragment.append(el);
  }
  return fragment;
}
function blocks(tokens) {
  const fragment = document.createDocumentFragment();
  for (const token of tokens) {
    let el;
    if (token.type === 'space' || token.type === 'def') continue;
    if (token.type === 'heading') { el = node(`h${Math.min(4, Math.max(2, token.depth))}`); el.append(inline(token.tokens)); }
    else if (token.type === 'paragraph' || token.type === 'text') { el = node('p'); el.append(token.tokens ? inline(token.tokens) : document.createTextNode(token.text)); }
    else if (token.type === 'code') { el = node('pre'); el.append(node('code', token.text)); }
    else if (token.type === 'list') {
      el = node(token.ordered ? 'ol' : 'ul');
      if (token.ordered) el.start = token.start;
      for (const item of token.items) { const li = node('li'); li.append(blocks(item.tokens)); el.append(li); }
    } else if (token.type === 'blockquote') { el = node('blockquote'); el.append(blocks(token.tokens)); }
    else if (token.type === 'hr') el = node('hr');
    else el = node('p', token.raw ?? token.text ?? '');
    fragment.append(el);
  }
  return fragment;
}
async function readFile(path, json = false) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(new URL(`./content/${path}`, import.meta.url), { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await (json ? response.json() : response.text());
  } finally { clearTimeout(timeout); }
}
function validateConfig(items) {
  if (!Array.isArray(items)) throw new Error('Commands must be an array');
  const names = new Set(builtins.map(c => c.command));
  for (const item of items) {
    if (!item || typeof item.description !== 'string' || typeof item.file !== 'string' ||
        !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.md$/.test(item.file) ||
        (item.aliases !== undefined && !Array.isArray(item.aliases))) throw new Error('Invalid content command');
    for (const name of [item.command, ...(item.aliases || [])]) {
      if (typeof name !== 'string' || !/^\/[a-z0-9-]+$/.test(name) || names.has(name)) throw new Error('Invalid or duplicate command');
      names.add(name);
    }
  }
  return items;
}
const ready = readFile('commands.json', true).then(validateConfig).then(items => { commands = items; }).catch(() => {
  configError = true;
  status.textContent = '命令配置暂时无法读取。可以使用 /help 和 /clear，或刷新重试。';
});
function commandButton(command) {
  const button = node('button', command); button.type = 'button'; button.className = 'command-link'; button.dataset.command = command; return button;
}
function commandList(items, destination) {
  const list = node('div'); list.className = 'command-list';
  for (const item of items) {
    const row = node('div'); row.className = 'command-row'; row.append(commandButton(item.command), node('span', item.description + (item.aliases?.length ? ` · ${item.aliases.join(', ')}` : ''))); list.append(row);
  }
  destination.append(list);
}
// Scrolling stays inside the terminal. `following` records whether the reader was at the bottom when they
// last scrolled; content growth alone never changes it, so reading older output is not interrupted.
const nearBottom = () => scrollback.scrollHeight - scrollback.scrollTop - scrollback.clientHeight < 48;
function showLatest() {
  scrollback.scrollTop = scrollback.scrollHeight;
  following = true; jump.hidden = true;
}
function settle() {
  if (following) showLatest();
  else if (!nearBottom()) jump.hidden = false;
}
// Keep the newest line visible when the terminal shrinks, e.g. a soft keyboard opening.
let viewHeight = scrollback.clientHeight;
function resized() {
  if (scrollback.clientHeight === viewHeight) return false;
  viewHeight = scrollback.clientHeight;
  if (following) showLatest();
  return true;
}
scrollback.addEventListener('scroll', () => {
  if (resized()) return; // A resize-induced scroll is not the reader leaving the bottom.
  following = nearBottom();
  if (following) jump.hidden = true;
});
new ResizeObserver(resized).observe(scrollback);
jump.addEventListener('click', () => { showLatest(); input.focus({ preventScroll: true }); });
// dvh already follows keyboards that resize the page (Android with interactive-widget). iOS only shrinks the
// visual viewport, so expose that height when it is smaller; height * scale ignores pinch zoom.
function syncViewport() {
  const viewport = window.visualViewport;
  const height = viewport ? Math.round(viewport.height * viewport.scale) : window.innerHeight;
  if (height < window.innerHeight - 1) document.documentElement.style.setProperty('--app-height', `${height}px`);
  else document.documentElement.style.removeProperty('--app-height');
}
syncViewport();
window.visualViewport?.addEventListener('resize', syncViewport);
window.addEventListener('resize', syncViewport);

async function execute(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return;
  const name = trimmed.toLowerCase();
  if (name === '/clear') {
    history.replaceChildren(); empty.hidden = false; showLatest();
    status.textContent = configError ? '命令配置无法读取，请刷新重试。会话已清空。' : '会话已清空。'; return;
  }
  status.textContent = '';
  empty.hidden = true;
  const entry = node('section'); entry.className = 'entry';
  const heading = node('h2'); heading.className = 'entry-command'; heading.append(node('span', 'guest@crystal:~ $'), document.createTextNode(trimmed));
  const reply = node('div', '读取内容…'); reply.className = 'reply'; reply.setAttribute('aria-busy', 'true');
  entry.append(heading, reply); history.append(entry);
  showLatest(); // A new command always brings the reader back to the newest output.
  // Allocate each reply slot before awaiting I/O, so concurrent results never reorder.
  await ready;
  if (!entry.isConnected) return; // /clear also discards all pending replies.
  const out = document.createDocumentFragment(); // Keep the loading text until the reply is ready.
  try {
    if (name === '/help') commandList([builtins[0], ...commands, builtins[1], builtins[2]], out);
    else if (name === '/projects') {
      const projects = commands.filter(c => c.category === 'project');
      out.append(node('p', projects.length ? '工作台上还没收起来的实验。' : '暂无可读取的项目配置。'));
      commandList(projects, out);
    } else {
      const match = commands.find(c => c.command === name || c.aliases?.includes(name));
      if (!match) {
        out.append(node('p', configError ? '内容命令暂时不可用，请刷新重试。' : '没有找到这条命令。第一版仅支持单条命令，不支持参数或 shell 语法。'), commandButton('/help'));
      } else {
        const markdown = await readFile(match.file);
        if (!entry.isConnected) return;
        out.append(blocks(lexer(markdown)));
      }
    }
    reply.replaceChildren(out);
  } catch {
    reply.replaceChildren(node('p', '这份内容暂时无法读取，请稍后再试。你仍可以使用其他命令。'), commandButton('/help'));
  } finally { reply.setAttribute('aria-busy', 'false'); }
  if (entry.isConnected) settle(); // Late replies discarded by /clear never scroll.
}
input.addEventListener('compositionstart', () => { composing = true; });
input.addEventListener('compositionend', () => { composing = false; compositionEnded = performance.now(); });
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (composing || event.isComposing || event.keyCode === 229 || performance.now() - compositionEnded < 80)) event.preventDefault();
});
document.querySelector('#command-form').addEventListener('submit', event => {
  event.preventDefault();
  if (composing || performance.now() - compositionEnded < 80) return;
  const value = input.value; input.value = ''; execute(value);
});
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-command]');
  if (!button) return;
  execute(button.dataset.command); input.focus({ preventScroll: true });
});
