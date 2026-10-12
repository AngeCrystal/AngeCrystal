const fs = require('node:fs');
const buildTerminalDemo = require('./build-terminal-demo.cjs');
const banner = `<p align="center">
  <picture>
    <source media="(prefers-reduced-motion: reduce)" srcset="assets/crystal-atelier.png">
    <img src="assets/crystal-atelier.gif" width="100%" alt="Crystal Atelier — a quiet desk, a starry window, and a few unfinished experiments.">
  </picture>
</p>`;
const site = 'https://angecrystal.github.io/AngeCrystal/';
const demo = buildTerminalDemo();
const data = [
{file:'README.md',lang:'zh',terminal:site,alt:'交互终端演示：依次输入 /help、/whoami、/skill 并显示回复。点击进入可以输入命令的网页终端。',intro:'你发现了一个还亮着灯的终端。',who:'一个喜欢拆开黑箱、也喜欢走进故事的人。<br>从 OS、系统到 AI 和 Agent，把好奇心编译成可以运行的小东西。',link:'点击终端，亲手输入命令 ↗',footer:'会话保持开放。欢迎带着一个问题，或一局新游戏回来。'},
{file:'README.en.md',lang:'en',terminal:`${site}en/`,alt:'Interactive terminal demo: /help, /whoami and /skill typed in turn with their replies. Click to open the web terminal and type commands.',intro:'You found a terminal with the lights still on.',who:'Someone who likes opening black boxes and stepping into stories.<br>From OS and systems to AI and agents, compiling curiosity into small things that run.',link:'Click the terminal to type your own commands ↗',footer:'Session stays open. Bring a question, or a new game.'}
];
// README cannot run scripts, so the terminal here is an animated replay of web/content/ that links to the live one.
for(const d of data){
const parts=[banner,
`<h3 align="center"><samp>ange@crystal ~ welcome back</samp></h3>\n<p align="center">${d.intro}<br><sub>${d.who}</sub></p>`,
`<p align="center"><a href="README.md">中文</a> · <a href="README.en.md">EN</a></p>`,
`<p align="center"><a href="${d.terminal}"><picture>
    <source media="(prefers-reduced-motion: reduce)" srcset="${demo[d.lang].still}">
    <img src="${demo[d.lang].animated}" width="100%" alt="${d.alt}">
  </picture></a><br><sub><a href="${d.terminal}">${d.link}</a></sub></p>`,
`<p align="center"><br><samp>There is always another layer to explore.</samp><br><sub>${d.footer}</sub></p>`];
fs.writeFileSync(d.file,parts.join('\n\n')+'\n');
}
