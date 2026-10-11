const fs = require('node:fs');
const banner = `<p align="center">
  <picture>
    <source media="(prefers-reduced-motion: reduce)" srcset="assets/crystal-atelier.png">
    <img src="assets/crystal-atelier.gif" width="100%" alt="Crystal Atelier — a quiet desk, a starry window, and a few unfinished experiments.">
  </picture>
</p>`;
const terminal = 'https://angecrystal.github.io/AngeCrystal/';
const data = [
{file:'README.md',intro:'你发现了一个还亮着灯的终端。',who:'一个喜欢拆开黑箱、也喜欢走进故事的人。<br>从 OS、系统到 AI 和 Agent，把好奇心编译成可以运行的小东西。',link:'打开交互终端 ↗',hint:'在网页终端里输入 <code>/help</code>，看看里面藏着什么。',footer:'会话保持开放。欢迎带着一个问题，或一局新游戏回来。'},
{file:'README.en.md',intro:'You found a terminal with the lights still on.',who:'Someone who likes opening black boxes and stepping into stories.<br>From OS and systems to AI and agents, compiling curiosity into small things that run.',link:'Open the interactive terminal ↗',hint:'Type <code>/help</code> in the web terminal and see what is hiding inside.',footer:'Session stays open. Bring a question, or a new game.'}
];
// Command content lives in web/content/; the profile only introduces and links to the terminal.
for(const d of data){
const parts=[banner,
`<h3 align="center"><samp>ange@crystal ~ welcome back</samp></h3>\n<p align="center">${d.intro}<br><sub>${d.who}</sub></p>`,
`<p align="center"><a href="README.md">中文</a> · <a href="README.en.md">EN</a></p>`,
`<p align="center"><a href="${terminal}"><strong><samp>guest@crystal:~ $ ${d.link}</samp></strong></a><br><sub>${d.hint}</sub></p>`,
`<p align="center"><br><samp>There is always another layer to explore.</samp><br><sub>${d.footer}</sub></p>`];
fs.writeFileSync(d.file,parts.join('\n\n')+'\n');
}
