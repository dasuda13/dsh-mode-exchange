/**
 * 用一个最小 mock ctx 真正执行 apply()，确认插件在宿主里会做的事都做了：
 * 注册 /switch-mode 与 /migrate-session、注册 10 条 HTTP 路由、安装 tools.guard。
 *
 * 这个脚本不接触真实会话，只验证「接线」是否正确 —— 配合宿主里看到的
 * fiberPhase: active，可以确认插件装进去之后命令和面板后端都可用了。
 */

const results = []
function check(name, condition, detail) {
  results.push({ name, ok: Boolean(condition), detail })
}

// ---- mock ctx -------------------------------------------------------------
const registeredCommands = []
const registeredRoutes = []
const guards = []
const loggerLines = []

function makeLogger() {
  const emit = (level) => (message) => loggerLines.push(`[${level}] ${message}`)
  return { info: emit('info'), warn: emit('warn'), debug: emit('debug'), error: emit('error') }
}

const toolsService = {
  guard(fn) { guards.push(fn); return () => {} },
  restrict() { return () => {} },
  definitions() { return new Map() },
  register() { return () => {} },
  get() { return undefined },
}

const connectionService = {
  fetch: {
    register(route) {
      registeredRoutes.push(route)
      return async () => {}
    },
  },
}

const commandsService = {
  register(definition) {
    registeredCommands.push(definition)
    return () => {}
  },
}

const agentPresetsService = {
  async list() {
    return [
      { id: 'standard', name: 'Standard', description: '标准模式', isDefault: true },
      { id: 'ptc', name: 'PTC', description: 'PTC 模式' },
    ]
  },
  get defaultId() { return 'standard' },
  presetForSession() { return 'standard' },
  async resolve(id) { return { id } },
  async acquireScope() { return { key: {}, async [Symbol.asyncDispose]() {} } },
  async mount() {},
}

const agentsService = {
  get() { return undefined },
  async create() { return { agent: { id: 'x' }, dispose: async () => {} } },
}

const sessionQueryService = {
  async readSession() { throw new Error('mock: no session') },
}

const sessionPersistenceService = {
  async stat() { return undefined },
  async open() { throw new Error('mock: no session') },
}

const systemPromptService = {
  section() { return () => {} },
}

const agentTeamsService = {
  async setEnabled() {},
  isEnabled() { return false },
}

const workspaceRegistryService = {
  archivedSessionIds: [],
  async create() { return { id: 'ws-mock' } },
  async get() { return undefined },
  async list() { return [] },
  async resolveByPath() { return undefined },
}

const configEditorService = {
  async edit() {},
}

const services = {
  tools: toolsService,
  systemPrompt: systemPromptService,
  agentTeams: agentTeamsService,
  connection: connectionService,
  configEditor: configEditorService,
  workspaceRegistry: workspaceRegistryService,
  commands: commandsService,
  agentPresets: agentPresetsService,
  agents: agentsService,
  sessionQuery: sessionQueryService,
  sessionPersistence: sessionPersistenceService,
}

const effects = []
const ctx = {
  // 宿主的 ctx.logger 是「传标签、返回 logger 实例」的函数，mock 也照这个形状。
  logger: (tag) => {
    const inner = makeLogger()
    const wrap = (fn) => (message) => {
      loggerLines.push(`[${tag}] ${message}`)
      fn(message)
    }
    return { info: wrap(inner.info), warn: wrap(inner.warn), debug: wrap(inner.debug), error: wrap(inner.error) }
  },
  fiber: { entry: { id: 'mode-exchange' } },
  get(name) { return services[name] },
  effect(callback, label) {
    const dispose = callback()
    effects.push({ label, dispose })
    return () => {}
  },
  on() { return () => {} },
  // Cordis 会把 inject 里的服务直接挂到 ctx 上（ctx.commands / ctx.agentPresets …），
  // 插件正是这样用的，所以 mock 也要照做。
  ...services,
}

// ---- 执行 apply ------------------------------------------------------------
const mod = await import('../index.js')
check('index.js 导出 apply 函数', typeof mod.apply === 'function')
// Config 是手写的 standard-schema v1 对象（不是 schemastery 的工厂函数）：
// 宿主走 Config['~standard'].validate(config)，0.1.4 起插件不再有第三方依赖。
check(
  'index.js 导出的 Config 是 standard-schema v1',
  typeof mod.Config === 'object' && mod.Config !== null && typeof mod.Config['~standard']?.validate === 'function',
  JSON.stringify(Object.keys(mod.Config ?? {})),
)
{
  const probe = mod.Config['~standard'].validate({ enableTeam: 'yes' })
  check('Config 拒绝类型错误的字段', Array.isArray(probe.issues) && probe.issues[0]?.path?.[0] === 'enableTeam', JSON.stringify(probe))
  const filled = mod.Config['~standard'].validate({})
  check('Config 补齐六个默认值', filled.value?.confirmBeforeMigrate === true && Object.keys(filled.value ?? {}).length === 6, JSON.stringify(filled.value))
}
check(
  'inject 含五个必需服务',
  Array.isArray(mod.inject) && ['commands', 'agentPresets', 'agents', 'sessionQuery', 'sessionPersistence'].every((k) => mod.inject.includes(k)),
  JSON.stringify(mod.inject),
)

await mod.apply(ctx, {})

// ---- 命令 ------------------------------------------------------------------
const names = registeredCommands.map((c) => c.name)
check('注册了 /switch-mode', names.includes('switch-mode'), names.join(', '))
check('注册了 /migrate-session', names.includes('migrate-session'))

const switchCmd = registeredCommands.find((c) => c.name === 'switch-mode')
const migrateCmd = registeredCommands.find((c) => c.name === 'migrate-session')
check('switch-mode 有 description', typeof switchCmd?.description === 'string' && switchCmd.description.length > 0)
check('switch-mode 有 input.hint', typeof switchCmd?.input?.hint === 'string' && switchCmd.input.hint.includes('--revert'))
check('migrate-session 有 input.hint', typeof migrateCmd?.input?.hint === 'string' && migrateCmd.input.hint.includes('--mode'))
check('两个命令都带 handler', typeof switchCmd?.handler === 'function' && typeof migrateCmd?.handler === 'function')

// ---- 路由 ------------------------------------------------------------------
check('注册了 12 条 HTTP 路由', registeredRoutes.length === 12, `实际 ${registeredRoutes.length} 条`)
check(
  '路由全部挂在 /api/mode-exchange 前缀下',
  registeredRoutes.every((r) => r.path.startsWith('/api/mode-exchange')),
)
check(
  '路由路径都是固定 path（没有 : 参数）',
  registeredRoutes.every((r) => !r.path.includes(':')),
  registeredRoutes.map((r) => r.path).join(' '),
)
check(
  '所有路由 requestBody 都是 buffered',
  registeredRoutes.every((r) => r.requestBody === 'buffered'),
)
check(
  '所有路由都有 fetch 处理函数',
  registeredRoutes.every((r) => typeof r.fetch === 'function'),
)
const expectedPaths = [
  '/api/mode-exchange/state',
  '/api/mode-exchange/switch',
  '/api/mode-exchange/revert',
  '/api/mode-exchange/migrate',
  '/api/mode-exchange/job',
  '/api/mode-exchange/cancel',
  '/api/mode-exchange/migrations',
  '/api/mode-exchange/report',
  '/api/mode-exchange/archive-old',
  '/api/mode-exchange/config',
  '/api/mode-exchange/sessions',
  '/api/mode-exchange/workspaces',
]
const actualPaths = registeredRoutes.map((r) => r.path)
check(
  '路由表与面板/设置页用到的 12 个端点一致',
  expectedPaths.every((p) => actualPaths.includes(p)),
  actualPaths.filter((p) => !expectedPaths.includes(p)).join(' ') || '全部命中',
)

// ---- guard -----------------------------------------------------------------
check('安装了 tools.guard（会话级工具拦截）', guards.length === 1, `实际 ${guards.length} 个`)

// ---- 能力探测 --------------------------------------------------------------
check(
  '日志里有能力探测行',
  loggerLines.some((l) => l.includes('能力探测')),
  loggerLines.filter((l) => l.includes('能力探测')).join(' | '),
)
check(
  '日志里有路由注册行',
  loggerLines.some((l) => l.includes('HTTP 路由')),
  loggerLines.filter((l) => l.includes('路由')).join(' | '),
)

// ---- 输出 ------------------------------------------------------------------
let failed = 0
for (const r of results) {
  if (!r.ok) failed += 1
  const mark = r.ok ? 'ok  ' : 'FAIL'
  process.stdout.write(`${mark} ${r.name}${r.detail ? `  (${r.detail})` : ''}\n`)
}
process.stdout.write(`\n${failed === 0 ? '全部通过' : `${failed} 项失败`}（共 ${results.length} 项）\n`)
if (failed > 0) process.exitCode = 1