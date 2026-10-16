# 个人终端 · 第一版

在项目根目录运行 `npm run dev:web`（Node/npm 与 Python 3），访问 <http://127.0.0.1:8766/web/>（中文）或 <http://127.0.0.1:8766/web/en/>（英文）。也可直接运行 `python3 -m http.server 8766 --bind 127.0.0.1`。不要通过 file:// 双击打开，Markdown 需要 HTTP 加载。`python3 -m http.server` 不发送缓存头，浏览器可能继续使用旧的 app.js 或测试模块；改代码后强制刷新，或使用 `.claude/launch.json` 中带 `Cache-Control: no-store` 的同端口服务。

当前托管改为 GitHub Pages：https://angecrystal.github.io/AngeCrystal/ ，公开访问。英文页是 https://angecrystal.github.io/AngeCrystal/en/ 。`web/` 为维护源目录，`docs/` 为 `npm run build:pages` 生成的发布文件；旧 Sites 地址保留历史版本，本次不再更新。

## 双语与内容访问（2026-10-12）

- 两个页面：`web/index.html`（`lang="zh-CN"`）和 `web/en/index.html`（`lang="en"`），结构相同，顶栏有 中文 / EN 切换。`app.js` 按 `<html lang>` 选择界面文案和内容目录。改了其中一个页面的结构，要同步另一个。
- 内容放在 `web/content/zh/` 和 `web/content/en/` 下，两边文件名必须一致；`commands.json` 的 `description` 写成 `{"zh": "...", "en": "..."}`，`file` 写不带语言前缀的相对路径。
- Markdown 只能通过命令读取。开发时 `app.js` 直接请求 `content/<lang>/*.md`；发布构建把 `commands.json` 和全部 Markdown 打包成 `docs/content.js`，页面带 `data-bundle` 属性时从这个模块读取。`docs/` 里没有 `content/` 目录，旧的 `.md` 地址会返回 404，站内也没有指向原文或源码仓库的链接。
- 这不是保密措施：浏览器下载的内容都能在开发者工具里看到，`AngeCrystal/AngeCrystal` 仓库也是公开的（Profile README 仓库必须公开）。它只保证站内没有“查看原文”的入口。
- 回复里的行内代码如果正好是命令名（例如 `` `/skill` ``），会渲染成可点击的命令按钮，与输入走同一逻辑；其他行内代码保持原样。
- `/files` 是内建命令，用命令按钮列出全部内容命令，不再有 `files.md`。
- `npm run build:pages` 会检查每个命令在两种语言下都有描述和 Markdown 文件，缺任何一个就报错退出，不生成 docs/。

## 页面结构（2026-10-11 第二版）

终端直接嵌在主页主内容区，不是弹窗或独立页面：

- 欢迎区：名字、两行介绍和一条提示“输入 /help 开始探索”，其中 `/help` 是可点击按钮（`.hint-command`，与输入走同一 `execute()`）。不再有首屏快捷命令按钮，也不预先展示命令正文。
- 终端面板 `.terminal`：标题栏 → 回复滚动区 `#scrollback`（内含 `#empty-state` 与 `role="log"` 的 `#history`）→ 状态行 `#status` → 输入区 `.composer`。
- `.shell` 高度为 `min(100dvh, --app-height)`，`main`、`.terminal`、`.scroll-area`、`#scrollback` 依次 `flex:1; min-height:0`，因此历史增长只增加 `#scrollback` 的滚动长度，输入区固定在面板底部。`.shell` 有 `min-height`（桌面 560px、手机 380px），视口更矮或页面缩放时改由整页滚动。
- 视口 meta 带 `interactive-widget=resizes-content`，Android Chrome 的软键盘会缩小 `dvh`；iOS 只缩小 visual viewport，`app.js` 在其高度小于布局视口时写入 `--app-height`。

### 滚动约定

- `following` 记录读者最后一次滚动时是否在底部附近（48px 内）。内容增长本身不改变它。
- 提交命令、点击命令、点击“回到最新”、`/clear`：强制回到底部并恢复跟随（`showLatest()`）。
- 异步回复完成（`settle()`）：仍在跟随则滚到底；读者已上翻则不动，显示“↓ 回到最新”。
- 回复区尺寸变化（软键盘、窗口缩放）由 ResizeObserver 处理，跟随中保持在底部；尺寸变化引起的 scroll 事件不会改变跟随状态。
- 被 `/clear` 丢弃的迟到回复在插入前返回，不滚动、不显示入口。
- 只设置容器 `scrollTop`，不使用 `scrollIntoView` 或平滑滚动，所以不会拖动整页，也不受减少动态效果设置影响。

## GitHub Profile README

`README.md` 和 `README.en.md` 由 `npm run build:profile` 生成，不要手改。GitHub README 会去掉 script、iframe、input 和 form，所以不能放可输入的终端。README 里放的是 `scripts/build-terminal-demo.cjs` 从 `web/content/` 生成的动画终端 SVG：依次演示 `/help`、`/whoami`、`/skill`，点击进入对应语言的 Pages 终端。

- 生成的文件：`assets/terminal-demo.{zh,en}.svg`（SMIL 动画）和 `assets/terminal-demo.{zh,en}.static.svg`（减少动态效果时使用）。修改内容或命令后，重新运行 `npm run build:profile`，演示会同步更新。
- 动画 SVG 的基础属性就是完整的 `/help` 画面，所以不支持 SVG 动画的查看器会显示这一帧，不会是空白窗口。
- 中文按宽字符折行（不让逗号句号出现在行首），英文按单词折行；超出窗口的回复截断为 `…`。
- 生成后运行 `npm run build:preview`（需先 `npm install`）更新本地预览 `preview.html`、`preview.en.html`。

## 维护内容

编辑 `web/content/zh/` 或 `web/content/en/` 下的 Markdown，在本地刷新网页或重新执行命令即可看到最新内容；线上需要重新 `npm run build:pages` 再推送。无缓存，无服务端、AI 调用、分析追踪或持久化会话。

新增命令：写好 `content/zh/<file>` 和 `content/en/<file>`，再在 `commands.json` 中增加一项：

```json
{"command":"/example","aliases":["/demo"],"description":{"zh":"一句话说明","en":"One-line description"},"file":"projects/example.md","category":"project"}
```

- `category: "project"` 自动进入 `/projects`。省略它则只进入 `/help`。
- 命令与别名须是小写 `/a-z0-9-`，不能重复或覆盖 `/help`、`/projects`、`/files`、`/clear`。
- 文件路径相对 `content/<lang>/`，允许子目录，禁止绝对路径和 `..`。每个文件都要有中英文两份。
- `/aaa` 明确为待填写示例；`/habit` 是 `/hobby` 别名；`/skill`、`/exit` 是从原 README 迁入的内容命令。
- Markdown 支持段落、标题、粗体、斜体、删除线、列表、引用、代码和 HTTP(S)/mailto 链接。原始 HTML 按文本显示，图片仅显示替代文字；复杂 Markdown 如表格按源文本显示。
- 所有文件将公开可读，不应放入任何私密信息。

## 依赖与安全

浏览器直接使用本地 `vendor/marked.esm.js`（marked 17.0.5，保留同目录 MIT 许可证），无外部 CDN。只使用其 lexer，渲染由白名单 DOM 节点完成；不将 Markdown 或访客输入传给 innerHTML，不执行代码。无需 npm 安装即可运行网页。原有 npm build:preview 和 build:assets 保持不变。

读取超时为 10 秒；失败回复保留命令上下文且不影响后续输入。回复位置在提交时创建，快速输入不会乱序；清屏后未完成请求不能重新插入会话，也不会触发滚动。刷新清空内存会话。暂未加入命令历史、Tab 补全、主题切换。

## 验证（2026-10-11 第二版）

启动服务后打开 <http://127.0.0.1:8766/tests/browser.html>，浏览器将自动运行 27 项验收测试。测试使用隔离 iframe（390×844 手机、1280×800 桌面）和模拟 HTTP 响应，不修改正式内容。测试页必须处于可见状态：后台标签页不执行渲染步骤，ResizeObserver 不触发，“缩小视口”一项会标为 SKIP 并说明原因。

本次结果：26 项通过、0 项失败、1 项跳过（Claude 桌面应用的浏览器面板在运行时处于隐藏状态）。该项在面板可见时的单独一轮运行中通过，并在实际页面上配合截图强制渲染复核过。新增用例覆盖：
- 首屏没有快捷按钮或命令正文，唯一入口是提示里的 `/help`，且它与手动输入的结果一致；
- 桌面连续 22 条命令后页面高度不变、面板不增高、输入区可见、停在最新内容；手机连续 21 条命令后输入可用、无横向溢出；
- 慢速长回复期间保留“读取内容…”，回复完成后继续跟随到底部；
- 等待期间手动上翻后不被拉回，出现“回到最新”，点击后回到底部且焦点回到输入框；
- 上翻后提交新命令会回到最新；`/clear` 后迟到回复不插入、不滚动、不显示入口；
- 视口变矮（模拟软键盘）时回复区缩小，输入区和最新内容可见。

在实际页面（浏览器面板，Chromium）另行验证：
- 375×812 手机视口下，点击 `/help` 提示和键盘输入都能正常执行；
- 视口改为 375×450 模拟软键盘后，回复区从 436px 缩小到 153px，仍停在最新内容，输入框和发送按钮仍在视口内；
- 1280×800 下 22 条命令后文档高度仍为 800，终端面板 434px；
- 上翻后，慢速回复不抢滚动，“回到最新”按钮可见且可点击；
- `/skill` 的目录树在手机上保持对齐，只在代码块内部横向滚动。

以上均为桌面 Chromium 中的视口模拟。尚未在 iOS Safari 或 Android Chrome 真机上实测软键盘；iOS 依赖 visualViewport 的处理只做了逻辑检查。输入法测试模拟 composition 事件，尚未逐一实测各操作系统的真实输入法。`node scripts/build-profile.cjs` 与 `npm run build:preview` 已重新生成两个 README 和预览页。

## 部署记录

- Sites 项目：`appgprj_6acb5d56dd7081919f565a6c7bc36c4f`
- 托管检出目录：`sites/crystal-terminal/`；其中 `.openai/hosting.json` 保存项目标识。
- 发布目录：`sites/crystal-terminal/dist/`，从 `web/` 同步 index.html、app.js、styles.css、content/ 和 vendor/；不包含测试或开发文档。
- 首次发布源提交：`b6e474db58b99ec506e56be82e0885d9e9d93ec3`
- 部署状态：succeeded。
- 后续修改 web/ 后需要同步至发布目录，并按 Sites 技能更新同一个项目；本地修改不会自动上线。
- 2026-10-11 第二版（内嵌终端与滚动）已同步到 `dist/`，但尚未发布；线上仍是首次发布的版本。

## GitHub Pages 发布（2026-10-12）

仓库 `AngeCrystal/AngeCrystal` 使用 `main` 分支的 `/docs`，HTTPS 已启用。

每次修改 `web/` 后：

```bash
cd /Users/angecrystal/Developer/github-modify
npm run build:pages
git add web docs
git commit -m "Update personal terminal"
git push origin main
```

GitHub 自动发布提交后的 docs/。不用 Sites，不需要 API 密钥或运行本地服务器。不要直接编辑 docs/，以免下次同步覆盖。

本次部署前浏览器验收：27 passed, 0 failed。软键盘缩放为模拟视口测试，未实测实体手机。

修改内容或命令后，发布前还要运行 `npm run build:profile`，让 README 演示同步，并把 `README*.md` 和 `assets/terminal-demo.*` 一起提交。

## 验证（2026-10-12 双语与内容访问）

先运行 `npm run build:pages`，再打开 <http://127.0.0.1:8766/tests/browser.html>；测试会同时检查 `web/` 源码页和 `docs/` 发布页。结果：36 passed, 0 failed, 0 skipped（浏览器面板可见时运行）。新增用例覆盖：
- 行内命令名可点击并执行；`/files` 只列命令，回复里没有链接和 `.md`；
- 中文页每个命令都能读取；英文页界面和 `/help` 里没有中文；英文页每个命令都读取英文文件且回复里没有中文，只请求 `en/` 下的内容；英文页的未知命令和 `/files` 回复为英文；
- 中英文发布页都从 bundle 读取内容，不发出任何 Markdown 请求；`docs/content/...` 下的旧地址返回 404。

另外验证了：缺少英文文件时构建报错退出；README 动画 SVG 在浏览器中按时间点检查了 `/help`、`/whoami`、`/skill` 三个场景（中英文）；去掉全部动画元素后显示完整的 `/help` 画面；中英文演示的行宽都在窗口内；生成的 SVG 通过 XML 校验。尚未在 github.com 上实际查看 README 渲染效果，推送后需要确认一次。

## Crystal Atelier 视觉更新（2026-10-16）

- 沿用已有角色插画，加入深夜工作室封面、紫色与薄荷绿终端、星光 CSS 动效和页脚；没有新增外部字体或运行时依赖。
- 中英文结构同步，手机和短视口压缩封面，保留终端内部滚动及底部输入；减少动态效果设置下禁用星光和光标动画。
- `web/assets/atelier.png` 为已有插画的原样副本；Pages 构建现在复制 `web/assets/`，中英文使用相对地址，兼容仓库子路径。
- 同步此前新增的技术与学习 Markdown。测试的项目数量改为读取配置，爱好别名测试比较实际正文，避免依赖已删标题。
- 本地浏览器验收 36 passed / 0 failed，覆盖源码与 Pages 构建的中英文页面。手机和软键盘检查仍为视口模拟，未实测实体手机。
