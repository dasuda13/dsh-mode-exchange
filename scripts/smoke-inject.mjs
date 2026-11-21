#!/usr/bin/env node
/**
 * 复现宿主真实的 Cordis 服务语义，确认插件在「connection 晚于插件就绪」时不会变成「异常」。
 *
 * 背景：宿主里插件卡曾报 cannot get property "connection" without inject。
 * 真实 Cordis 的规则是：
 *   · 直接读 ctx.x —— 只有 x 在本插件 inject 里声明（或当前 fiber 已提供）才允许，否则抛错；
 *   · ctx.get(x) 默认 strict —— 只返回提供方 fiber 当前活跃的实现，服务晚到就是 undefined。
 * 这个脚本就按这两条建模，避免 mock 太宽松（smoke-apply.mjs 的 ctx 会直接返回服务，测不到这个坑）。
 */
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const results = []
function check(name, condition, detail) {
  results.push({ name, ok: Boolean(condition), detail })
}

const loggerLines = []
function makeLogger(tag) {
  const push = (level) => (message) => loggerLines.push('[' + level + ']' + (tag ? ' ' + tag : '') + ' ' + message)
  return { info: push('info'), warn: push('warn'), debug: push('debug'), error: push('error') }
}

/** 只保留本插件真的会调用的成员，形状对齐宿主。 */
function makeServices(sinks) {
  const tools = {
    guard(fn) { sinks.guards.push(fn); return () => {} },
    restrict() { return () => {} },
    definitions() { return new Map() },
    register() { return () => {} },
    get() { return undefined },
  }
  return {
    tools,
    systemPrompt: { section() { return () => {} } },
    agentTeams: { async setEnabled() {}, isEnabled() { return false } },
    workspaceRegistry: {
      archivedSessionIds: [],
      async create() { return { id: 'ws-mock' } },
      async get() { return undefined },
      async list() { return [] },
      async resolveByPath() { return undefined },
    },
    commands: { register(definition) { sinks.commands.push(definition); return () => {} } },
    agentPresets: {
      async list() { return [{ id: 'standard', name: 'Standard', description: '标准模式', isDefault: true }] },
      get defaultId() { return 'standard' },
      presetForSession() { return 'standard' },
      async resolve(id) { return { id } },
      async acquireScope() { return { key: {}, async [Symbol.asyncDispose]() {} } },
      async mount() {},
    },
    agents: { get() { return undefined }, async create() { return { agent: { id: 'x' }, dispose: async () => {} } } },
    sessionQuery: { async readSession() { throw new Error('mock: no session') } },
    sessionPersistence: { async stat() { return undefined }, async open() { throw new Error('mock: no session') } },
  }
}

const ROUTES = {
  fetch: {
    register(route) { sinks.routes.push(route); return async () => {} },
  },
}

const sinks = { commands: [], routes: [], guards: [], effects: [] }
const store = makeServices(sinks)
store.connection = ROUTES

/**
 * 造一个「像 Cordis」的 ctx：
 *   · 属性访问只对 injectList 里的服务放行，其余抛 cannot get property ... without inject；
 *   · get(name, strict=true) 在服务未提供/未活跃时返回 undefined。
 */
function makeCtx(options) {
  const { injectList, provided, active, withInject, strictProps } = options
  const injections = []
  const isActive = (name) => (active ?? provided).has(name)
  const base = {
    logger: (tag) => makeLogger(tag),
    fiber: { entry: { id: 'mode-exchange' } },
    get(name, strict = true) {
      if (!provided.has(name)) return undefined
      if (strict && !isActive(name)) return undefined
      return store[name]
    },
    effect(callback, label) {
      const dispose = callback()
      sinks.effects.push({ label, dispose })
      return () => {}
    },
    on() { return () => {} },
  }
  if (withInject !== false) {
    base.inject = (deps, callback) => {
      injections.push({ deps, callback })
      return { then() {} }
    }
  } else {
    // 真实运行时里 ctx.inject 由 registry mixin 提供；这里显式抹掉，模拟老版本未提供。
    base.inject = undefined
  }
  const proxy = new Proxy(base, {
    get(target, prop) {
      if (typeof prop !== 'string') return Reflect.get(target, prop)
      if (Reflect.has(target, prop)) return Reflect.get(target, prop)
      // strictProps：只让 inject 声明的服务通过属性访问，其它一律抛错。
      // 这是真实宿主里「服务已提供、但没写进 inject」的情形 —— 也就是
      // cannot get property "workspaceRegistry" without inject 那个 bug 的形状。
      if (injectList.includes(prop) || (!strictProps && provided.has(prop))) return store[prop]
      throw new Error('cannot get property "' + prop + '" without inject')
    },
    has(target, prop) {
      return Reflect.has(target, prop) || injectList.includes(prop) || provided.has(prop)
    },
  })
  return { ctx: proxy, injections }
}

const mod = await import('../index.js')
const REQUIRED = ['commands', 'agentPresets', 'agents', 'sessionQuery', 'sessionPersistence']

// ---- 场景 1：connection 尚未提供（宿主启动早期的真实时序） -----------------
const provided = new Set([...REQUIRED, 'tools', 'systemPrompt', 'agentTeams', 'workspaceRegistry'])
const case1 = makeCtx({ injectList: mod.inject, provided })
let threw = null
try {
  await mod.apply(case1.ctx, {})
} catch (error) {
  threw = error
}
check('apply 不因 connection 未就绪而抛错', threw === null, threw && String(threw.message))
check('命令照常注册（2 个）', sinks.commands.length === 2, '实际 ' + sinks.commands.length)
check('此时还没有注册路由', sinks.routes.length === 0, '实际 ' + sinks.routes.length)
check('用 ctx.inject 等到 connection 就绪', case1.injections.length === 1 && case1.injections[0].deps.includes('connection'), JSON.stringify(case1.injections.map((i) => i.deps)))

// ---- 场景 2：服务就绪后回调运行，路由全量注册 ------------------------------
const ready = makeCtx({
  injectList: [...mod.inject, 'connection'],
  provided: new Set([...provided, 'connection']),
})
case1.injections[0].callback(ready.ctx)
check('注入回调里注册了 12 条路由', sinks.routes.length === 12, '实际 ' + sinks.routes.length)
check('路由前缀正确', sinks.routes.every((r) => r.path.startsWith('/api/mode-exchange')))

// ---- 场景 3：缺 configEditor 时，保存配置接口优雅降级 ----------------------
const configRoute = sinks.routes.find((r) => r.path.endsWith('/config'))
let configResult = null
if (configRoute !== undefined) {
  const response = await configRoute.fetch(new Request('http://127.0.0.1/api/mode-exchange/config', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ patch: { defaultMode: 'standard' } }),
  }))
  configResult = await response.json()
}
check('缺 configEditor 时返回 config-unavailable 而不是 500', configResult?.ok === false && configResult?.error?.code === 'config-unavailable', JSON.stringify(configResult))

// ---- 场景 4：运行时完全没有 connection 且不支持 inject ---------------------
const bare = makeCtx({
  injectList: mod.inject,
  provided: new Set([...REQUIRED, 'tools', 'systemPrompt', 'agentTeams', 'workspaceRegistry']),
  withInject: false,
})
loggerLines.length = 0
let threw2 = null
try {
  await mod.apply(bare.ctx, {})
} catch (error) {
  threw2 = error
}
check('无 connection 且无 ctx.inject 时 apply 不抛错', threw2 === null, threw2 && String(threw2.message))
check('给出降级告警', loggerLines.some((l) => l.includes('connection')), loggerLines.filter((l) => l.includes('connection')).join(' | '))

// ---- 场景 5：服务都已提供、但没写进 inject（本轮 bug 的形状） --------------
// 真实宿主里 workspaceRegistry / tools / agentTeams 都存在，只是不在 inject 声明里。
// Cordis 的 Proxy 对这种属性访问直接抛错，可选链挡不住 —— 这就是
// cannot get property "workspaceRegistry" without inject 的来源。
sinks.commands.length = 0
sinks.routes.length = 0
sinks.guards.length = 0
sinks.effects.length = 0
const strict = makeCtx({ injectList: mod.inject, provided, strictProps: true })
let threw3 = null
try {
  await mod.apply(strict.ctx, {})
} catch (error) {
  threw3 = error
}
check('服务已提供但未写进 inject 时 apply 不抛错', threw3 === null, threw3 && String(threw3.message))
check('strictProps 下 guard 仍然装上', sinks.guards.length === 1, '实际 ' + sinks.guards.length)
check('strictProps 下命令照常注册', sinks.commands.length === 2, '实际 ' + sinks.commands.length)
check('strictProps 下用 ctx.inject 等 connection', strict.injections.length === 1, JSON.stringify(strict.injections.map((i) => i.deps)))
const strictReady = makeCtx({
  injectList: [...mod.inject, 'connection'],
  provided: new Set([...provided, 'connection']),
  strictProps: true,
})
strict.injections[0].callback(strictReady.ctx)
check('strictProps 下注入后注册 12 条路由', sinks.routes.length === 12, '实际 ' + sinks.routes.length)

// ---- 静态反模式扫描：src/host 里不允许裸读可选服务 -------------------------
const HOST_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'host')
const SERVICE_NAMES = [
  'tools', 'systemPrompt', 'agentTeams', 'connection', 'configEditor', 'workspaceRegistry',
  'sessionTitle', 'agentDefaultModel', 'userQuestions', 'sessions', 'workspaces',
  'commands', 'agentPresets', 'agents', 'sessionQuery', 'sessionPersistence',
]
const violations = []
for (const name of await readdir(HOST_DIR)) {
  if (!name.endsWith('.js')) continue
  const text = await readFile(join(HOST_DIR, name), 'utf8')
  text.split('\n').forEach((line, index) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
    const pattern = /(^|[^.\w])ctx\??\.([A-Za-z_$][\w$]*)/g
    let hit
    while ((hit = pattern.exec(line)) !== null) {
      if (SERVICE_NAMES.includes(hit[2])) violations.push(`${name}:${index + 1} ${trimmed}`)
    }
  })
}
check('src/host 里没有裸 ctx.<服务> 访问', violations.length === 0, violations.slice(0, 4).join(' | '))

// 扫描器自检：确保它真的能抓到反模式（而不是恒为空）。
function scanText(text) {
  const found = []
  text.split('\n').forEach((line, index) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
    const pattern = /(^|[^.\w])ctx\??\.([A-Za-z_$][\w$]*)/g
    let hit
    while ((hit = pattern.exec(line)) !== null) {
      if (SERVICE_NAMES.includes(hit[2])) found.push(`bad.js:${index + 1} ${trimmed}`)
    }
  })
  return found
}
const selfBad = [
  'const registry = ctx?.workspaceRegistry',
  'const tools = ctx.tools ?? ctx.get("tools")',
  'const teams = ctx.agentTeams',
].join('\n')
const selfGood = [
  '// 直接写 ctx?.workspaceRegistry 会被 Cordis 的注入检查抛错。',
  'const registry = serviceOf(ctx, "workspaceRegistry")',
  'const dispose = agent.ctx.tools.restrict({ deny })',
].join('\n')
check('反模式扫描器能抓到 ctx?.workspaceRegistry 这类写法', scanText(selfBad).length === 3, scanText(selfBad).join(' | '))
check('反模式扫描器不误报注释与 agent 作用域', scanText(selfGood).length === 0, scanText(selfGood).join(' | '))

let failed = 0
for (const r of results) {
  if (!r.ok) failed += 1
  process.stdout.write((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.detail ? '  (' + r.detail + ')' : '') + '\n')
}
process.stdout.write('\n' + (failed === 0 ? '全部通过' : failed + ' 项失败') + '（共 ' + results.length + ' 项）\n')
if (failed > 0) process.exitCode = 1