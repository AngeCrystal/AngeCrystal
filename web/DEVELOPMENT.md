# 个人终端 · 第一版

在项目根目录运行 `npm run dev:web`（Node/npm 与 Python 3），访问 <http://127.0.0.1:8766/web/>。也可直接运行 `python3 -m http.server 8766 --bind 127.0.0.1`。不要通过 file:// 双击打开，Markdown 需要 HTTP 加载。`python3 -m http.server` 不发送缓存头，浏览器可能继续使用旧的 app.js 或测试模块；改代码后强制刷新，或使用 `.claude/launch.json` 中带 `Cache-Control: no-store` 的同端口服务。

已于 2026-10-11 部署至 https://angecrystal-terminal.angecrystal.chatgpt.site ，当前访问范围为公开，任何人均可访问。`web/` 为维护源目录，支持静态托管与子路径部署。

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

`README.md` 和 `README.en.md` 由 `node scripts/build-profile.cjs` 生成，不要手改。现在只保留封面、身份介绍、语言切换、交互终端入口和结尾语，不再重复折叠命令正文。原 README 中的 `/skill`、`/exit` 与 `/habit` 细节已迁入 `content/skill.md`、`content/exit.md`、`content/hobby.md`。生成后运行 `npm run build:preview`（需先 `npm install`）更新本地预览。

## 维护内容

编辑 `web/content/` 下的 Markdown，刷新网页或重新执行命令即可读取最新内容。无缓存，无服务端、AI 调用、分析追踪或持久化会话。

在 `commands.json` 中增加一项即可新增命令：

```json
{"command":"/example","aliases":["/demo"],"description":"一句话说明","file":"projects/example.md","category":"project"}
```

- `category: "project"` 自动进入 `/projects`。省略它则只进入 `/help`。
- 命令与别名须是小写 `/a-z0-9-`，不能重复或覆盖 `/help`、`/projects`、`/clear`。
- 文件路径相对 content，允许子目录，禁止绝对路径和 `..`。
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
