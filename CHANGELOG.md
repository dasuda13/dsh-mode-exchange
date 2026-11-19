# Changelog

本项目的所有重要变更都会记录在此文件中。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 开源准备

- 新增 `.gitignore`：排除 `node_modules/`、本地取证目录（`.verify/`、`.refs/`、
  `.dsh-vision-router/`，含桌面截图与宿主安装包转储）、运行期数据目录与临时文件。
- 新增 `LICENSE`（MIT），`package.json` 的 `private` 改为 `false` 并补 `license` 字段。
- 清除源码与文档中写死的开发机绝对路径：
  `scripts/smoke-seed.mjs` 改为相对导入，`scripts/smoke-host.mjs` 用 `import.meta.url` 解析，
  `scripts/probe.js` 改为优先读 `DSH_APP_ASAR`、否则按 `LOCALAPPDATA` 推断，
  `README.md` / `docs/LOCAL-DEV.md` 的安装示例改为 `<本仓库的绝对路径>` 占位符。
- 统一面板/设置页名称说明（侧栏与设置页标签是「模式迁移」，插件列表名是「模式交换」）。
- `package.json` 补 `repository` / `homepage` / `bugs` / `author`，LICENSE 署名对齐仓库所有者。
- 新增 `scripts/push-git.ps1`：一键 `init → add → commit → branch -M → remote add → push`，
  自动在 PATH 之外查找 `git.exe`（刚装完 git 没重开终端时也能跑），默认带 `--force`
  （远端 Initial commit 与本地无共同历史），支持 `-DryRun` / `-NoForce` / 身份参数。
- 新增 `docs/PUBLISH.md`：三条发布路径（REST 推送器 / git 脚本 / 网页上传）、PAT 权限、
  认证方式与本机特有的 schannel、代理、换行符等报错对照表。

### 修复

- **插件在宿主里被标成「异常」：`cannot get property "connection" without inject`**：
  `src/host/routes.js` 用 `ctx.get('connection') ?? ctx.connection` 取 Web 宿主服务。
  真实 Cordis 里，服务只要没在本插件的 `inject` 里声明，属性访问就会直接抛
  `cannot get property "connection" without inject`；而 `ctx.get(name)` 默认 strict，
  服务提供方 fiber 尚未激活时同样返回 `undefined`。Connection 由 Web 组合在启动过程中
  较晚提供，于是 `??` 走到右侧就抛错，整个 `apply` 失败、插件卡显示「异常」，
  侧栏面板与命令一起消失。现在：
  - 统一改用 `serviceOf(ctx, name)`（非 strict 读 store + try/catch 包住属性访问），
    `routes.js` 的 `connection` / `configEditor`、`switch.js` 的 `systemPrompt` 都走它；
  - `connection` 还没就绪时交给 `ctx.inject(['connection'], …)`，服务可用后再注册路由；
    插件本身不等服务，命令照常可用；
  - 新增 `scripts/smoke-inject.mjs`：按真实 Cordis 语义（注入检查 + strict `get`）建模，
    复现「connection 晚到」并断言 `apply` 不抛错、服务就绪后 10 条路由全量注册。
- **设置页与面板白屏**：`src/client/ui.js` 里的共享组件原先写成「首参是 React」的工厂签名
  （如 `PanelHead(React, { title })`），而 `panel.js` / `settings.js` 用
  `h(PanelHead, props)` 把它们当普通 React 组件渲染 —— React 调用函数组件只传
  `(props, context)`，第二个形参解构 undefined 直接 TypeError，渲染即崩，
  宿主错误边界把内容吞掉，于是「设置 → 模式迁移」和侧栏面板都是空白。
  现在组件改为标准的 `(props)` 签名，React 实例由 `bindUiReact(React)` 在
  `entry.js` 入口处一次性绑定；未绑定时抛明确错误而不是静默白屏。
- 新增 `scripts/smoke-render.mjs`（`npm test`）：像宿主那样加载 `bundle.js`，
  用最小 React 桩把设置页、中央面板、图标真渲染一遍并断言关键文案，
  拦住「组件签名与调用方式不匹配」这类构建期发现不了的回归。

## [0.1.0] - 2026-11-19

首个可运行版本：从零实现，能力 A（运行时软切换）与能力 B（迁移重建）全部打通。

### 新增

#### 能力 A —— 运行时模式切换

- `/switch-mode <模式名>`：在当前会话内软切换 Agent 模式。
  - 通过 `system-prompt/assemble` 瀑布替换系统提示词 section；
  - 通过 `agent.ctx.tools.restrict({ deny })` 把「当前模式有、目标模式没有」的工具
    从声明与派发两侧一起移除；
  - 通过 `agent.ctx.tools.register()` + `when` 门控补挂「目标模式有、当前没有」的工具；
  - 全部改动挂在会话作用域上，不影响全局 profile 与其它会话。
- `/switch-mode --revert`：按切换前的入口快照回退（工具限制、补挂、提示词一起撤销）。
- `/switch-mode --list`：运行时枚举全部可用模式（来自 `agentPresets.list()`，零硬编码），
  标出当前模式、运行时默认模式与装配失败（broken）的模式。
- 切换快照落盘到 `<数据目录>/state/switches.json`，因此改设置触发插件重建后
  （`apply` 重新执行）软切换状态会被读回并重建。
- 会话级 `tools.guard` 兜底：即使有路径绕开 schema 直接派发，也会按会话被拒绝。
- 对不可切换的会话（不存在、已归档、子代理来源、无活 Agent、无作用域）给出具体中文原因，
  不静默失败。

#### 能力 B —— 迁移重建

- `/migrate-session --mode <模式> [--delete-old true|false] [--team on|off] [--note <备注>] [--yes] [--resume]`：
  严格按七步执行，每步可观测（面板显示当前步骤、耗时与逐步时间线）。
  1. 导出：`<导出目录>/exports/<YYYYMMDD-HHmmss>-<短ID>.jsonl` + `.meta.json`（含 sha256）。
  2. 校验：逐行可解析、事件数一致、`seq` 从 0 连续、sha256 匹配；失败即中止并保留现场。
  3. 创建：以目标模式作为 `agentPreset` 创建新会话，并在 `setup` 里 `agentPresets.mount()`
     装配该模式的插件组合。
  4. 导入：把导出的**原生事件序列**作为新会话的 constructor seed 写入
     （`seed = 源事件前缀 + session/end-seed{inherited:true} + 收尾事件`，
     `inheritedEventCount` 只计源事件），未闭合的 turn/step 自动补 `step/end`、`turn/end`，
     未拿到结果的工具调用补 `isError` 的 `tool/result`（`TOOL_OUTCOME_UNKNOWN` / `TOOL_NOT_STARTED`）。
  5. 团队：`--team on` 时对新会话的根 Agent 调 `agentTeams.setEnabled(true)` 并回读 `isEnabled` 复核。
  6. 归档：`--delete-old true` 时先备份再归档旧会话（见「已知限制」——DSH 没有删除会话的 API）。
  7. 报告：新旧会话 ID、日志路径、消息数、工具调用数、团队状态、旧会话处置结果、耗时、时间线。
- 幂等：台账 `<数据目录>/migrations/<源会话ID>.json` 按源会话记录进度。
  同一会话重复执行不会产生第二个新会话，而是返回「续跑 / 放弃」提示。
- 失败可回滚：新会话已建但导入复核失败时，新会话与日志文件都保留，
  报告里给出可手动完成的剩余步骤。
- 来源标记（FR-12）：新会话追加一条 user 消息，记录「由会话 X 于时间 T 迁移而来、
  原模式 A → 新模式 B」，并附带 `--note` 内容。
- 导出副本保留策略：`keepExportCopy=false` 时，成功结束后删除导出文件；失败时一律保留。

#### 界面

- 侧栏面板（`sidebar.panellist` + `main`，id/key 均为 `mode-exchange`）：
  - 「切换」页签：当前会话、当前生效模式、可否切换、目标模式下拉 + 应用/回退按钮、
    入口快照卡片、软切换警示；
  - 「迁移」页签：目标模式、归档旧会话开关（默认开）、团队协作开关（不支持时置灰并说明原因）、
    备注输入、执行按钮、取消按钮、续跑卡片、七步进度与耗时、报告卡片；
  - 「历史」页签：迁移记录列表（时间、源会话、目标会话、结果），可查看报告详情、
    一键打开目标会话。
  - 归档确认对话框展示旧会话标题、消息数、日志路径，并提供「先备份」开关。
- 设置页（`settings.section` + `settings.section.icon`）：默认目标模式、默认是否归档旧会话、
  默认是否启用团队协作、日志导出目录、是否保留导出日志副本、是否在迁移前强制确认
  （关闭时二次警告）。

#### 命令与接口

- `/switch-mode`、`/migrate-session` 两个命令（`ctx.commands.register`）。
- `/api/mode-exchange/*` 十条 HTTP 路由（`ctx.connection.fetch.register`）：
  `GET /state`、`POST /switch`、`POST /revert`、`POST /migrate`、`GET /job`、
  `POST /cancel`、`GET /migrations`、`GET /report`、`POST /archive-old`、`POST /config`。
  统一 `{ ok: true, value }` / `{ ok: false, error: { code, message } }` 信封，带同源校验。

#### 工程

- 零依赖客户端打包器 `scripts/build-client.mjs`（`src/client/*.js` → `src/client/bundle.js`），
  不引入 esbuild，不需要 install 脚本。
- `scripts/probe.js`：校验 manifest、exports、icon、locale、bundle 产物与 profile 挂载状态。
- TypeScript 类型声明 `types/index.d.ts`、`types/client.d.ts`。
- 中英双语 locale（`locale/zh.json`、`locale/en.json`），详情页 `docs/DETAIL.md`、`docs/DETAIL.en.md`。
- 本地加载与调试说明 `docs/LOCAL-DEV.md`。

### 已知限制

- **能力 A 是「软切换」**：插件组合、工具执行器（native / PTC `run_code` 传输层）、
  子代理与团队都不会随切换改变。目标模式若只差「有哪些工具、提示词怎么写」，软切换够用；
  若差在工具如何执行（PTC 就是这类），只有能力 B 能给到真行为。
- **FR-9 的「删除旧会话」实现为归档**：DSH 没有删除会话的 API，
  只有 `archiveSession` / `unarchiveSession` / `pinSession`；`workspaceRegistry.delete()`
  删的是工作区而非会话。归档后会话从分组与置顶列表隐藏、活动被停止，
  但会话日志文件仍在磁盘上，可用 `unarchiveSession` 反悔。
- **归档可能延后**：`/migrate-session` 跑在旧会话的 Agent 里，当场归档自己会打断工作，
  因此实现为「先尝试停止活动再归档；若宿主要求当前回合结束后才能停，则排期重试」，
  报告里标记为「已排期」。
- **FR-1 的 Tab 补全无法做成结构化候选**：宿主 `CommandInputDescriptor` 只有 `hint` 字符串，
  没有参数级枚举字段。替代方案是把运行时枚举结果写进 hint、`--list` 与错误文案，
  交互式选择由侧栏面板的下拉框承担。
- **团队协作开关有约束**：`agentTeams.setEnabled` 只接受 root Session 的活 Agent，
  且新值在「下一次 step 准备」时才影响工具可见性。运行时探测不到该能力时，
  面板置灰并说明原因，报告记「未启用 + 原因」而不伪造成功。