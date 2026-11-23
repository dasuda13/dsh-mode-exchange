#!/usr/bin/env node
/**
 * 迁移七步的「注入检查」回归测试。
 *
 * 背景（0.1.2 修的那个 bug）：
 *   workspaceRegistry / agentTeams / tools 都不在本插件的 inject 里，
 *   `ctx?.workspaceRegistry` 这种可选链挡不住 Cordis 的 Proxy —— 属性访问直接抛
 *   cannot get property "workspaceRegistry" without inject，
 *   于是第 4 步「导入日志为历史上下文」明明成功了，整次迁移却被判失败。
 *
 * 这个脚本用一个「像 Cordis」的 mock ctx（属性访问只放行 inject，
 * 服务本身都能用）把整条迁移链路真的跑一遍，并断言：
 *   · 第 4 步之后不再崩；
 *   · 挂工作区 / 团队 / 归档失败都不把整次迁移判失败；
 *   · 全绿时报告 ok、台账 done。
 *
 * 用法：node scripts/smoke-migrate.mjs
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const results = []
function check(name, condition, detail) {
  results.push({ name, ok: Boolean(condition), detail })
}

const mod = await import('../index.js')
const migrate = await import('../src/host/migrate.js')

/** 造几条合法事件（seq 连续、surface 事件带 surfaceOp、turn 闭合）。 */
function makeEvents() {
  const now = Date.now()
  return [
    { type: 'turn/start', seq: 0, time: now, data: { turn: 1 } },
    { type: 'step/start', seq: 1, time: now, data: { turn: 1, step: 1 } },
    {
      type: 'user/message',
      seq: 2,
      time: now,
      data: { id: 'm1', role: 'user', content: [{ type: 'text', text: '你好' }], source: { kind: 'user' } },
      surfaceOp: 'append',
    },
    { type: 'step/end', seq: 3, time: now, data: { turn: 1, step: 1 } },
    { type: 'turn/end', seq: 4, time: now, data: { turn: 1, reason: { kind: 'done' } } },
  ]
}

const events = makeEvents()
/** 每个场景自己的落盘区（新会话事件）。 */
const disks = new Map()
/**
 * 「惰性物化」额度：命中后 read 返回 detached 空事件，复刻宿主
 * jsonl 后端在首次 append 之前的形状。每个 sessionId 一份，用完即物化。
 */
const lazyBudget = new Map()
function consumeLazyRead(id) {
  const left = lazyBudget.get(id)
  if (left === undefined || left <= 0) return false
  lazyBudget.set(id, left - 1)
  return true
}

function makeServices(options) {
  const sinks = options.sinks
  const created = []
  return {
    tools: {
      guard(fn) { sinks.guards.push(fn); return () => {} },
      restrict() { return () => {} },
      definitions() { return new Map() },
      register() { return () => {} },
      get() { return undefined },
    },
    systemPrompt: { section() { return () => {} } },
    agentTeams: {
      async setEnabled() { sinks.teamCalls.push(true) },
      isEnabled() { return options.teamWorks !== false },
    },
    workspaceRegistry: {
      archivedSessionIds: [],
      async create() { return { id: 'ws-mock' } },
      async get() { return undefined },
      async list() { return [] },
      async resolveByPath() {
        if (options.attachWorks === false) throw new Error('no workspace')
        return { attachSession: async (id) => { sinks.attached.push(id) } }
      },
      async archiveSession() {
        // 注意：错误文案里不能出现 activity/active —— 那会走进「排期重试」分支（算成功）。
        if (options.archiveWorks === false) throw new Error('拒绝归档：权限不足')
        sinks.archived.push(true)
      },
      async pinSession(id) {
        // 置顶只是排序上的锦上添花，失败不能影响迁移结论。
        if (options.pinWorks === false) throw new Error('拒绝置顶：权限不足')
        sinks.pinned.push(id)
        return { ok: true, value: { pinnedSessionIds: [id] } }
      },
    },
    commands: { register(definition) { sinks.commands.push(definition); return () => {} } },
    agentPresets: {
      async list() { return [{ id: 'ptc', name: 'PTC', description: 'PTC 模式', isDefault: true }] },
      get defaultId() { return 'ptc' },
      presetForSession() { return 'ptc' },
      async resolve(id) { return { id } },
      async acquireScope() { return { key: {}, async [Symbol.asyncDispose]() {} } },
      async mount() {},
    },
    agents: {
      get() { return undefined },
      async create(input) {
        created.push(input)
        disks.set(input.sessionId, input.seed.map(event => ({ ...event })))
        if (typeof options.detachedReads === 'number' && options.detachedReads > 0) {
          lazyBudget.set(input.sessionId, options.detachedReads)
        }
        return { agent: { id: input.sessionId }, dispose: async () => {} }
      },
    },
    sessionQuery: {
      async readSession() {
        return { session: { id: options.sessionId, cwd: options.cwd }, inheritedEventCount: 0, events }
      },
    },
    sessionPersistence: options.persistenceWithoutOpen === true ? {
      // 有 stat（能读会话头，迁移能启动）但没有 open（读不出正文，无法复核落盘）。
      async stat(id) { return id === options.sessionId ? { header: { id, cwd: options.cwd } } : undefined },
    } : {
      async stat(id) {
        if (id === options.sessionId) return { header: { id, cwd: options.cwd, agentPreset: 'standard' } }
        const disk = disks.get(id)
        if (disk === undefined) return undefined
        // 惰性物化：宿主对「只登记、未落盘」的会话不给 location / sizeBytes。
        const left = lazyBudget.get(id)
        if (left !== undefined && left > 0) return { header: { id }, revision: 0 }
        return { header: { id }, revision: 1, sizeBytes: 4096, location: { kind: 'jsonl', path: join(options.cwd, id) } }
      },
      async open(id) {
        const disk = disks.get(id)
        if (disk === undefined) throw new Error('mock: no session ' + id)
        if (consumeLazyRead(id)) {
          // 复刻宿主的 detached 句柄：物化之前读回 0 条事件。
          return {
            header: { id },
            async read() { return { eventState: 'detached', events: [] } },
            close() {},
          }
        }
        return {
          header: { id },
          async read() { return { eventState: 'ready', events: disk.map(event => ({ ...event })) } },
          close() {},
        }
      },
    },
    sessionTitle: { async get() { return '测试会话' } },
  }
}

/**
 * 像 Cordis 的 ctx：属性访问只放行 injectList（以及 fiber/logger/effect 等自有成员），
 * 其它一律抛 cannot get property ... without inject —— 哪怕服务确实存在。
 */
function makeCtx(injectList, services, sinks) {
  const base = {
    logger: () => ({ info: (m) => sinks.logs.push('[info] ' + m), warn: (m) => sinks.logs.push('[warn] ' + m), debug() {}, error: (m) => sinks.logs.push('[error] ' + m) }),
    fiber: { entry: { id: 'mode-exchange' } },
    get(name, strict = true) {
      void strict
      return services[name]
    },
    effect(callback, label) {
      const dispose = callback()
      sinks.effects.push({ label, dispose })
      return () => {}
    },
    on() { return () => {} },
    inject(deps, callback) {
      sinks.injections.push({ deps, callback })
      return { then() {} }
    },
  }
  return new Proxy(base, {
    get(target, prop) {
      if (typeof prop !== 'string') return Reflect.get(target, prop)
      if (Reflect.has(target, prop)) return Reflect.get(target, prop)
      if (injectList.includes(prop)) return services[prop]
      throw new Error('cannot get property "' + prop + '" without inject')
    },
  })
}

function makeSinks() {
  return { commands: [], guards: [], effects: [], injections: [], logs: [], attached: [], teamCalls: [], archived: [], pinned: [] }
}

/** 跑一次完整迁移并等它结束（startMigration 是后台跑，这里轮询 jobStatus）。 */
async function runOnce(options) {
  const sinks = makeSinks()
  const services = makeServices({ ...options, sinks })
  const ctx = makeCtx([...mod.inject, 'connection'], services, sinks)
  const config = {
    defaultMode: 'ptc',
    deleteOldSession: options.deleteOld === true,
    enableTeam: options.team === true,
    exportDir: options.exportDir,
    keepExportCopy: true,
    confirmBeforeMigrate: false,
  }
  const started = await migrate.startMigration(ctx, {
    sessionId: options.sessionId,
    mode: 'ptc',
    deleteOld: options.deleteOld === true,
    team: options.team === true,
    config,
    capabilities: { seedCreate: true, scopedRestrict: true, scopedPrompt: true, teamSwitch: true, attachSession: true, notes: [] },
    force: true,
  })
  if (started.ok !== true || typeof started.jobId !== 'string') return { started, sinks }
  for (let index = 0; index < 400; index += 1) {
    const status = migrate.jobStatus(started.jobId)
    if (status !== undefined && status.status !== 'running') return { started, sinks, status }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  return { started, sinks, status: migrate.jobStatus(started.jobId) }
}

// ---- 先用自检确认 mock ctx 真的是「像 Cordis」的 ---------------------------
// 如果它能放行 ctx.workspaceRegistry，下面三个场景就测不出本轮的 bug。
{
  const probeSinks = makeSinks()
  const probeServices = makeServices({
    sinks: probeSinks,
    sessionId: 'session-probe',
    cwd: join(tmpdir(), 'probe'),
  })
  const probeCtx = makeCtx([...mod.inject, 'connection'], probeServices, probeSinks)
  let directThrew = null
  try {
    void probeCtx.workspaceRegistry
  } catch (error) {
    directThrew = error
  }
  check('mock ctx 对未注入服务直接抛错（复现 cannot get property）', directThrew !== null && /without inject/.test(String(directThrew.message)), directThrew && String(directThrew.message))
  const services = await import('../src/host/services.js')
  check('serviceOf 能安全读到同一个服务', services.serviceOf(probeCtx, 'workspaceRegistry') !== undefined)
}

const root = await mkdtemp(join(tmpdir(), 'mode-exchange-migrate-'))
try {
  // ---- 场景 A：一切正常 -----------------------------------------------------
  const cwdA = join(root, 'ws-a')
  const sessionA = 'session-aaaa1111-0000-0000-0000-000000000001'
  const a = await runOnce({ sessionId: sessionA, cwd: cwdA, exportDir: join(root, 'data-a') })
  check('A 迁移开始成功', a.started.ok === true, JSON.stringify(a.started))
  check('A 迁移最终 done（第 4 步不再崩）', a.status?.status === 'done', a.status?.status + ' / ' + (a.status?.message ?? ''))
  check('A 报告 ok=true', a.status?.report?.ok === true, String(a.status?.report?.ok))
  check('A 第 4 步（导入）通过', a.status?.report?.timeline?.some(f => f.step.includes('导入日志') && f.ok === true))
  check('A 新会话挂上了工作区', a.status?.report?.target?.attachedToWorkspace === true)
  check('A 四个必需步骤都记了时间线', (a.status?.report?.timeline?.length ?? 0) >= 4, String(a.status?.report?.timeline?.length))
  check('A 新会话被置顶', a.status?.report?.target?.pinned === true)
  check('A 置顶走的是 workspaceRegistry.pinSession', a.sinks?.pinned?.length === 1, String(a.sinks?.pinned?.length ?? 0))
  const ledgerA = join(root, 'data-a', 'migrations', sessionA + '.json')
  check('A 台账落盘且 status=done', existsSync(ledgerA) && JSON.parse(await readFile(ledgerA, 'utf8')).status === 'done')

  // ---- 场景 B：挂工作区失败，但迁移仍然算成功 -------------------------------
  const sessionB = 'session-bbbb2222-0000-0000-0000-000000000002'
  const b = await runOnce({
    sessionId: sessionB,
    cwd: join(root, 'ws-b'),
    exportDir: join(root, 'data-b'),
    attachWorks: false,
  })
  check('B 挂工作区失败时迁移仍然 done', b.status?.status === 'done', b.status?.status + ' / ' + (b.status?.message ?? ''))
  check('B 报告里标注未挂上工作区', b.status?.report?.target?.attachedToWorkspace === false)
  check('B 时间线里挂载项存在但为 false', b.status?.report?.timeline?.some(f => f.step.includes('挂载工作区') && f.ok === false))

  // ---- 场景 C：团队 + 归档都失败，迁移仍然算成功 ----------------------------
  const sessionC = 'session-cccc3333-0000-0000-0000-000000000003'
  const c = await runOnce({
    sessionId: sessionC,
    cwd: join(root, 'ws-c'),
    exportDir: join(root, 'data-c'),
    team: true,
    deleteOld: true,
    teamWorks: false,
    archiveWorks: false,
  })
  check('C 团队/归档失败时迁移仍然 done', c.status?.status === 'done', c.status?.status + ' / ' + (c.status?.message ?? ''))
  check('C 报告标注团队未生效', c.status?.report?.team?.enabled === false)
  check('C 报告标注旧会话未归档', c.status?.report?.oldSession?.archived === false)

  // ---- 场景 D：惰性物化（前 2 次读回 detached），重试后仍然成功 --------------
  // 宿主的 jsonl 后端要到首次 append/flush 才落盘，命中 detached 句柄时
  // 读回 0 条 —— 0.1.3 之前会被判成「落盘 0 条」直接失败。
  const sessionD = 'session-dddd4444-0000-0000-0000-000000000004'
  const d = await runOnce({
    sessionId: sessionD,
    cwd: join(root, 'ws-d'),
    exportDir: join(root, 'data-d'),
    detachedReads: 2,
  })
  check('D 惰性物化时迁移仍然 done（重试生效）', d.status?.status === 'done', d.status?.status + ' / ' + (d.status?.message ?? ''))
  check('D 报告记下了真实落盘条数', d.status?.report?.target?.importedEventCount >= 5, String(d.status?.report?.target?.importedEventCount))

  // ---- 场景 E：惰性物化一直不完成 → 必须判失败，不能报假成功 ----------------
  const sessionE = 'session-eeee5555-0000-0000-0000-000000000005'
  const e = await runOnce({
    sessionId: sessionE,
    cwd: join(root, 'ws-e'),
    exportDir: join(root, 'data-e'),
    detachedReads: 99,
  })
  check('E 一直未物化时迁移判失败（不报假成功）', e.status?.status === 'failed', e.status?.status + ' / ' + (e.status?.message ?? ''))
  check('E 失败原因提到「尚未物化」', /尚未物化/.test(String(e.status?.message ?? '')), String(e.status?.message ?? '').slice(0, 80))
  check('E 报告本身带 error 字段（不只在 status.message 里）', /尚未物化/.test(String(e.status?.report?.error ?? '')), String(e.status?.report?.error ?? '').slice(0, 60))
  check('E 报告 remainingSteps 第一条就是失败原因', String(e.status?.report?.remainingSteps?.[0] ?? '').startsWith('失败原因：'), String(e.status?.report?.remainingSteps?.[0] ?? '').slice(0, 40))

  // ---- 场景 F：持久层连 open 都没有 → 不许报假成功 --------------------------
  const sessionF = 'session-ffff6666-0000-0000-0000-000000000006'
  const f = await runOnce({
    sessionId: sessionF,
    cwd: join(root, 'ws-f'),
    exportDir: join(root, 'data-f'),
    persistenceWithoutOpen: true,
  })
  check('F 无 open 时迁移判失败（不报假成功）', f.status?.status === 'failed', f.status?.status + ' / ' + (f.status?.message ?? ''))
  check('F 失败原因说明无法复核落盘', /无法确认新会话是否真的落盘/.test(String(f.status?.message ?? '')), String(f.status?.message ?? '').slice(0, 80))

  // ---- 场景 G：置顶失败，但迁移仍然算成功 --------------------------------
  const sessionG = 'session-gggg7777-0000-0000-0000-000000000007'
  const g = await runOnce({
    sessionId: sessionG,
    cwd: join(root, 'ws-g'),
    exportDir: join(root, 'data-g'),
    pinWorks: false,
  })
  check('G 置顶失败时迁移仍然 done', g.status?.status === 'done', g.status?.status + ' / ' + (g.status?.message ?? ''))
  check('G 报告标注未置顶', g.status?.report?.target?.pinned === false)
  check('G 时间线里置顶项存在但为 false', g.status?.report?.timeline?.some(f => f.step.includes('置顶新会话') && f.ok === false))
} finally {
  await rm(root, { recursive: true, force: true })
}

let failed = 0
for (const r of results) {
  if (!r.ok) failed += 1
  process.stdout.write((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.detail ? '  (' + r.detail + ')' : '') + '\n')
}
process.stdout.write('\n' + (failed === 0 ? '全部通过' : failed + ' 项失败') + '（共 ' + results.length + ' 项）\n')
if (failed > 0) process.exitCode = 1