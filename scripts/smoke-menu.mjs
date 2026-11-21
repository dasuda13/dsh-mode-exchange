/**
 * 会话右键菜单的离线冒烟测试。
 *
 * 目的：宿主会话列表的右键菜单由 contextMenus 服务驱动，实机上点不点得出来无法离线验证，
 * 所以这里用与宿主 registry.ts 同构的最小桩，把「注册 → 解析 → 选中 → 执行」整条链路跑一遍：
 *   - 注册的 target / order / id 是否符合宿主约定（两个入口各一条贡献：切换 + 迁移）
 *   - resolve 是否同步返回、是否只在 target 有 sessionId 时才给菜单
 *   - 模式清单是后台拉的，resolve 第一次拿到的是「正在读取模式…」占位，刷新后才出现叶子项
 *   - 带 children 的父项被「点击」时不应执行 run（宿主 registry 的 select 语义）
 *   - 切换叶子调 POST /switch；迁移叶子调 POST /migrate 并把 jobId 交给面板
 *   - 迁移不看 switchable（没活 Agent / 已归档的会话恰恰最需要重建）
 *   - contextMenus 缺席时插件照常激活（不抛错）
 *
 * 直接跑源码（src/client/menu.js），不依赖 bundle，改源码后无需先构建。
 */

import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolvePath(here, '..')

const failures = []
function check(name, condition, detail) {
  if (!condition) failures.push(name + (detail ? ' — ' + detail : ''))
}

/** 等到所有已排队的 microtask / 一轮 setTimeout 都跑完。 */
const tick = () => new Promise(done => setTimeout(done, 0))

/** 最小可观察快照：只要 getSnapshot / subscribe。 */
function snapshot(initial) {
  let value = initial
  const listeners = new Set()
  return {
    getSnapshot: () => value,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
    set(next) { if (Object.is(next, value)) return; value = next; for (const l of Array.from(listeners)) l(value) },
  }
}

/** 复刻宿主 MenuRegistry 的注册与解析语义（见 dsh-client-ui-context-menu/src/client/registry.ts）。 */
function makeContextMenus() {
  const providers = new Map()
  const notices = []
  const contributions = []
  return {
    notices,
    contributions,
    registeredKinds: snapshot([]),
    active: snapshot(null),
    notify(text, success, action) { notices.push({ text, success: success === true, action }) },
    close() {},
    open() {},
    register(input) {
      const key = encodeURIComponent(input.target) + '/' + encodeURIComponent(input.id)
      if (providers.has(key)) throw new Error('Duplicate menu contribution: ' + key)
      const provider = { ...input, key }
      providers.set(key, provider)
      contributions.push({ target: input.target, id: input.id, order: input.order })
      return () => { providers.delete(key) }
    },
    resolve(target) {
      const list = [...providers.values()]
        .filter(item => item.target === target.kind)
        .sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id)))
      const collected = []
      for (const provider of list) {
        const raw = provider.resolve(target.value, new AbortController().signal)
        if (raw instanceof Promise) throw new Error('resolve 不应返回 Promise（宿主有 1000ms 超时）: ' + provider.id)
        const project = action => {
          const view = { id: action.id, label: action.label, disabled: action.disabled === true }
          if (action.children !== undefined) view.children = action.children.map(child => project(child))
          view.run = action.run
          view.raw = action
          return view
        }
        for (const action of raw) collected.push(project(action))
      }
      return collected
    },
  }
}

/** 最小 ctx：effect 立即执行工厂，get 只在 services 里查，inject 记录回调。 */
function makeCtx(services) {
  const effects = []
  const injections = []
  return {
    effects,
    injections,
    effect(factory, label) {
      const dispose = factory()
      effects.push({ label, dispose })
      return dispose
    },
    get(name) { return services[name] },
    inject(names, callback) { injections.push({ names, callback }); return () => {} },
    slots: ctx_slots(),
    [Symbol.iterator]() { return [][Symbol.iterator]() },
  }
}

const MODES = [
  { id: 'ptc', name: 'PTC', description: '' },
  { id: 'standard', name: 'Standard', description: '' },
  { id: 'broken-mode', name: 'Broken', description: '', broken: true },
]

const CONFIG = { defaultMode: 'standard', deleteOldSession: true, enableTeam: true, keepExportCopy: false }

function makeApi(options) {
  const calls = { getState: [], switchMode: [], migrate: [] }
  const api = {
    calls,
    async getState(sessionId) {
      calls.getState.push(sessionId)
      if (options.failState) throw new Error('state down')
      if (sessionId === null || sessionId === undefined) {
        return { sessionId: null, modes: MODES, config: options.config === undefined ? CONFIG : options.config, capabilities: {} }
      }
      return {
        sessionId,
        currentMode: options.currentMode || 'ptc',
        switchable: options.switchable !== false,
        blockedReason: options.blockedReason || null,
        modes: MODES,
        config: options.config === undefined ? CONFIG : options.config,
        capabilities: {},
      }
    },
    async switchMode(sessionId, mode) {
      calls.switchMode.push({ sessionId, mode })
      if (options.failSwitch) throw new Error('拒绝切换')
      return { mode, notice: 'ok', snapshot: { sessionId, toMode: mode } }
    },
    migrate(request) {
      calls.migrate.push(request)
      if (options.failMigrate) return Promise.reject(new Error('迁移被拒绝'))
      if (options.needsResume) return Promise.resolve({ needsResume: true, ledger: { step: 0 } })
      if (options.deferMigrate) return new Promise((resolve, reject) => { api.deferred = { resolve, reject } })
      return Promise.resolve({ jobId: options.jobId || 'job-1' })
    },
  }
  return api
}

const SESSION = { kind: 'session', value: { sessionId: 'session-a', displayTitle: '重构登录页' } }
const OTHER = { kind: 'session', value: { sessionId: 'session-b', displayTitle: '打包 npm' } }
const HEADER = { kind: 'sessionHeader', value: { sessionId: 'session-a' } }

/** 从解析结果里按 id 取父项（每个入口一条贡献，所以会拿到多条）。 */
function parentOf(actions, id) {
  return actions.find(item => item.id === id)
}

async function main() {
  const modulePath = pathToFileURL(resolvePath(root, 'src', 'client', 'menu.js')).href
  const menu = await import(modulePath)
  check('menu.js 导出 mountSessionMenu', typeof menu.mountSessionMenu === 'function', '实际: ' + Object.keys(menu).join(','))

  // ---- 场景 A：常规路径 ----
  {
    const menus = makeContextMenus()
    const api = makeApi({})
    const store = { getState: () => ({ sessionId: 'session-a', snapshot: null }), set(patch) { store.patched = { ...(store.patched || {}), ...patch } } }
    const ctx = makeCtx({ contextMenus: menus, slots: ctx_slots() })
    menu.mountSessionMenu(ctx, { api, store, t: (key, vars) => key + (vars && vars.mode ? ':' + vars.mode : vars && vars.reason ? ':' + vars.reason : ''), h: () => null })

    const targets = [...new Set(menus.contributions.map(item => item.target))].sort()
    check('A 注册了 session 与 sessionHeader 两个 target', targets.join(',') === 'session,sessionHeader', JSON.stringify(targets))
    check('A 每个 target 两条贡献（切换 + 迁移）', menus.contributions.length === 4, JSON.stringify(menus.contributions))
    const ids = new Set(menus.contributions.map(item => item.id))
    check('A 两条贡献 id 不同', ids.size === 2 && ids.has('mode-exchange.switch') && ids.has('mode-exchange.migrate'), JSON.stringify([...ids]))
    check('A 菜单 order 落在 fork(300) 与 copy session id(450) 之间', menus.contributions.every(item => item.order >= 350 && item.order < 450), JSON.stringify(menus.contributions))

    // 第一次解析：模式清单还在后台拉，只能拿到占位项。
    const first = menus.resolve(SESSION)
    check('A 首次解析返回切换与迁移两个父项', first.length === 2 && first.map(item => item.id).join(',') === 'switch,migrate', JSON.stringify(first.map(item => item.id)))
    const firstSwitch = parentOf(first, 'switch')
    const firstMigrate = parentOf(first, 'migrate')
    check('A 父项带 children（子菜单列模式）', Array.isArray(firstSwitch.children) && Array.isArray(firstMigrate.children))
    check('A 模式未就绪时切换项占位被禁用', firstSwitch.children.length === 1 && firstSwitch.children[0].disabled === true, JSON.stringify(firstSwitch.children))
    check('A 模式未就绪时迁移项也占位', firstMigrate.children.length === 1 && firstMigrate.children[0].disabled === true, JSON.stringify(firstMigrate.children))
    check('A 父项自身没有 run（宿主只执行叶子）', firstSwitch.raw.run === undefined && firstMigrate.raw.run === undefined)

    await tick()
    await tick()
    const second = menus.resolve(SESSION)
    const switchNode = parentOf(second, 'switch')
    const migrateNode = parentOf(second, 'migrate')
    const leaves = switchNode.children.filter(item => item.disabled === false)
    check('A 切换项刷新后列出全部模式', switchNode.children.filter(item => String(item.id).startsWith('mode:')).length === 3, JSON.stringify(switchNode.children.map(item => item.id)))
    check('A 迁移项刷新后列出全部模式', migrateNode.children.filter(item => String(item.id).startsWith('migrate:')).length === 3, JSON.stringify(migrateNode.children.map(item => item.id)))
    check('A 切换项里 broken 模式被禁用', switchNode.children.find(item => item.id === 'mode:broken-mode').disabled === true)
    check('A 迁移项里 broken 模式也被禁用', migrateNode.children.find(item => item.id === 'migrate:broken-mode').disabled === true)
    check('A 切换项里当前模式标注为当前并禁用', switchNode.children.find(item => item.id === 'mode:ptc').label.includes('menu.currentMode') && switchNode.children.find(item => item.id === 'mode:ptc').disabled === true, JSON.stringify(switchNode.children.find(item => item.id === 'mode:ptc')))
    check('A 迁移项里当前模式仍可选（同模式重建）', migrateNode.children.find(item => item.id === 'migrate:ptc').disabled === false, JSON.stringify(migrateNode.children.find(item => item.id === 'migrate:ptc')))
    check('A 切换项只有一个可点模式', leaves.length === 1 && leaves[0].id === 'mode:standard', JSON.stringify(leaves.map(item => item.id)))
    check('A /state 被请求了模式清单与当前会话', api.calls.getState.includes(null) && api.calls.getState.includes('session-a'), JSON.stringify(api.calls.getState))

    // 点击切换叶子 → 调 POST /switch → 提示成功。
    await switchNode.children.find(item => item.id === 'mode:standard').run()
    check('A 切换调用带上会话与目标模式', api.calls.switchMode.length === 1 && api.calls.switchMode[0].sessionId === 'session-a' && api.calls.switchMode[0].mode === 'standard', JSON.stringify(api.calls.switchMode))
    check('A 成功后提示已切换', menus.notices.length === 1 && menus.notices[0].success === true && menus.notices[0].text.includes('menu.switched'), JSON.stringify(menus.notices))
    check('A 面板 store 同步了新模式', store.patched && store.patched.currentMode === 'standard', JSON.stringify(store.patched))

    // 切换后同一会话的缓存已更新，再解析时 standard 变成当前项。
    const third = menus.resolve(SESSION)
    check('A 切换后当前模式标记跟随更新', parentOf(third, 'switch').children.find(item => item.id === 'mode:standard').label.includes('menu.currentMode'), JSON.stringify(parentOf(third, 'switch').children.map(item => item.id + '=' + item.label)))

    // 标题「更多」菜单：带分隔线。
    const header = menus.resolve(HEADER)
    check('A sessionHeader 的两项都带 separatorBefore', header.length === 2 && header.every(item => item.raw.separatorBefore === true), JSON.stringify(header.map(item => item.raw.separatorBefore)))
    check('A session 的项不带分隔线', menus.resolve(OTHER).every(item => item.raw.separatorBefore === undefined))

    // 没有 sessionId 的目标不该长出菜单。
    check('A 缺 sessionId 时返回空菜单', menus.resolve({ kind: 'session', value: {} }).length === 0)

    // ---- 点击迁移叶子 ----
    // 注意：一次迁移会连发两条提示（先「正在迁移…」再「已开始迁移…」），所以取最后一条。
    const before = menus.notices.length
    await parentOf(menus.resolve(SESSION), 'migrate').children.find(item => item.id === 'migrate:standard').run()
    const call = api.calls.migrate[0]
    check('A 迁移调用带上会话与目标模式', api.calls.migrate.length === 1 && call.sessionId === 'session-a' && call.mode === 'standard', JSON.stringify(api.calls.migrate))
    check('A 迁移参数取配置默认值（归档旧会话 / 团队 / 保留导出副本）', call.deleteOld === true && call.team === true && call.backup === false, JSON.stringify(call))
    check('A 迁移把 confirmDelete 置为 true（菜单里无法二次确认）', call.confirmDelete === true, JSON.stringify(call))
    const fresh = menus.notices.slice(before)
    check('A 先提示正在迁移', fresh.length >= 1 && fresh[0].text.includes('menu.migrating'), JSON.stringify(fresh.map(item => item.text)))
    const started = fresh[fresh.length - 1]
    check('A 迁移成功后提示并带「查看进度」动作', started && started.success === true && started.text.includes('menu.migrateStarted') && started.action && started.action.label === 'menu.viewProgress', JSON.stringify(started))
    check('A 迁移把 jobId 交给面板', store.patched && store.patched.job === 'job-1' && store.patched.jobSessionId === 'session-a', JSON.stringify(store.patched))

    // 「查看进度」按钮：layout 缺席时点它不能抛错（插件在精简宿主里也要活着）。
    let threw = null
    try { started.action.run() } catch (error) { threw = error }
    check('A 查看进度在 layout 缺席时不抛错', threw === null, threw && threw.message)
  }

  // ---- 场景 A2：「查看进度」能选中本插件面板 ----
  {
    const menus = makeContextMenus()
    const api = makeApi({})
    let selected = null
    const ctx = makeCtx({ contextMenus: menus, slots: ctx_slots(), layout: { selectPanel: id => { selected = id } } })
    menu.mountSessionMenu(ctx, { api, store: null, t: key => key, h: () => null })
    menus.resolve(SESSION)
    await tick(); await tick()
    await parentOf(menus.resolve(SESSION), 'migrate').children.find(item => item.id === 'migrate:ptc').run()
    const notice = menus.notices[menus.notices.length - 1]
    notice.action.run()
    check('A2 查看进度选中 mode-exchange 面板', selected === 'mode-exchange', String(selected))
  }

  // ---- 场景 A3：迁移进行中把叶子禁掉，避免重复发起 ----
  {
    const menus = makeContextMenus()
    const api = makeApi({ deferMigrate: true })
    const ctx = makeCtx({ contextMenus: menus, slots: ctx_slots() })
    menu.mountSessionMenu(ctx, { api, store: null, t: key => key, h: () => null })
    menus.resolve(SESSION)
    await tick(); await tick()
    const leaf = parentOf(menus.resolve(SESSION), 'migrate').children.find(item => item.id === 'migrate:standard')
    const pending = leaf.run()
    const during = parentOf(menus.resolve(SESSION), 'migrate')
    check('A3 迁移中所有模式叶子被禁用', during.children.filter(item => String(item.id).startsWith('migrate:')).every(item => item.disabled === true), JSON.stringify(during.children.map(item => item.id + '=' + item.disabled)))
    check('A3 迁移中多一条进行中说明', during.children.some(item => item.id === 'migrating' && item.disabled === true))
    await tick()
    api.deferred.resolve({ jobId: 'job-9' })
    await pending
    const after = parentOf(menus.resolve(SESSION), 'migrate')
    check('A3 迁移结束后叶子恢复可点', after.children.filter(item => String(item.id).startsWith('migrate:') && item.disabled === false).length === 2, JSON.stringify(after.children.map(item => item.id + '=' + item.disabled)))
  }

  // ---- 场景 B：会话不可切换（切换禁用，但迁移仍可用）----
  {
    const menus = makeContextMenus()
    const api = makeApi({ switchable: false, blockedReason: '该会话当前没有活着的 Agent' })
    const ctx = makeCtx({ contextMenus: menus, slots: ctx_slots() })
    menu.mountSessionMenu(ctx, { api, store: null, t: key => key, h: () => null })
    menus.resolve(SESSION)
    await tick(); await tick()
    const actions = menus.resolve(SESSION)
    const switchNode = parentOf(actions, 'switch')
    const migrateNode = parentOf(actions, 'migrate')
    const leaves = switchNode.children.filter(item => String(item.id).startsWith('mode:') && item.disabled === false)
    check('B 不可切换时没有任何可点的切换模式', leaves.length === 0, JSON.stringify(leaves.map(item => item.id)))
    check('B 不可切换时给出原因说明', switchNode.children.some(item => item.id === 'blocked' && item.label.includes('menu.blocked')), JSON.stringify(switchNode.children.map(item => item.id)))
    const migrateLeaves = migrateNode.children.filter(item => String(item.id).startsWith('migrate:') && item.disabled === false)
    check('B 不可切换的会话仍可迁移重建', migrateLeaves.length === 2, JSON.stringify(migrateNode.children.map(item => item.id + '=' + item.disabled)))
  }

  // ---- 场景 C：切换失败 ----
  {
    const menus = makeContextMenus()
    const api = makeApi({ failSwitch: true })
    const ctx = makeCtx({ contextMenus: menus, slots: ctx_slots() })
    menu.mountSessionMenu(ctx, { api, store: null, t: (key, vars) => key + (vars && vars.reason ? ':' + vars.reason : ''), h: () => null })
    menus.resolve(SESSION)
    await tick(); await tick()
    const leaf = parentOf(menus.resolve(SESSION), 'switch').children.find(item => item.id === 'mode:standard')
    await leaf.run()
    check('C 失败时提示原因', menus.notices.length === 1 && menus.notices[0].success === false && menus.notices[0].text.includes('拒绝切换'), JSON.stringify(menus.notices))
  }

  // ---- 场景 C2：迁移失败与需要续跑 ----
  {
    const menus = makeContextMenus()
    const ctx = makeCtx({ contextMenus: menus, slots: ctx_slots() })
    menu.mountSessionMenu(ctx, { api: makeApi({ failMigrate: true }), store: null, t: (key, vars) => key + (vars && vars.reason ? ':' + vars.reason : ''), h: () => null })
    menus.resolve(SESSION)
    await tick(); await tick()
    await parentOf(menus.resolve(SESSION), 'migrate').children.find(item => item.id === 'migrate:standard').run()
    const notice = menus.notices[menus.notices.length - 1]
    check('C2 迁移失败提示原因', notice.success === false && notice.text.includes('迁移被拒绝'), JSON.stringify(notice))
    check('C2 迁移失败也给「查看进度」入口', notice.action && notice.action.label === 'menu.viewProgress', JSON.stringify(notice.action))
  }
  {
    const menus = makeContextMenus()
    const ctx = makeCtx({ contextMenus: menus, slots: ctx_slots() })
    menu.mountSessionMenu(ctx, { api: makeApi({ needsResume: true }), store: null, t: key => key, h: () => null })
    menus.resolve(SESSION)
    await tick(); await tick()
    await parentOf(menus.resolve(SESSION), 'migrate').children.find(item => item.id === 'migrate:standard').run()
    const notice = menus.notices[menus.notices.length - 1]
    check('C2 有未完成迁移时提示去面板续跑', notice.text === 'menu.migrateResume' && notice.action && notice.action.label === 'menu.viewProgress', JSON.stringify(notice))
  }

  // ---- 场景 D：宿主没有 contextMenus（可选依赖缺席） ----
  {
    const ctx = makeCtx({ slots: ctx_slots() })
    let threw = null
    try { menu.mountSessionMenu(ctx, { api: makeApi({}), store: null, t: key => key, h: () => null }) } catch (error) { threw = error }
    check('D 缺 contextMenus 时不抛错', threw === null, threw && threw.message)
    check('D 缺 contextMenus 时退到 ctx.inject 等就绪', ctx.injections.length === 1 && ctx.injections[0].names.includes('contextMenus'), JSON.stringify(ctx.injections.map(item => item.names)))
  }

  // ---- 场景 E：ctx.inject 就绪后注册 ----
  {
    const menus = makeContextMenus()
    const ctx = makeCtx({ slots: ctx_slots() })
    menu.mountSessionMenu(ctx, { api: makeApi({}), store: null, t: key => key, h: () => null })
    check('E 就绪前没有注册', menus.contributions.length === 0)
    const scope = makeCtx({ contextMenus: menus, slots: ctx_slots() })
    ctx.injections[0].callback(scope)
    check('E 就绪后补注册了四条贡献（两入口 × 两 target）', menus.contributions.length === 4, JSON.stringify(menus.contributions))
  }

  // ---- 场景 F：/state 不可用时不炸 ----
  {
    const menus = makeContextMenus()
    const ctx = makeCtx({ contextMenus: menus, slots: ctx_slots() })
    menu.mountSessionMenu(ctx, { api: makeApi({ failState: true }), store: null, t: key => key, h: () => null })
    menus.resolve(SESSION)
    await tick(); await tick()
    const actions = menus.resolve(SESSION)
    check('F 状态接口失败时仍有菜单（占位项）', actions.length === 2 && actions.every(item => item.children.length >= 1), JSON.stringify(actions.map(item => item.children)))
  }

  // ---- 场景 G：重复挂载必须幂等（宿主对同一 target+id 会抛 Duplicate） ----
  {
    const menus = makeContextMenus()
    const ctx = makeCtx({ contextMenus: menus, slots: ctx_slots() })
    const deps = { api: makeApi({}), store: null, t: key => key, h: () => null }
    menu.mountSessionMenu(ctx, deps)
    let threw = null
    try { menu.mountSessionMenu(ctx, deps) } catch (error) { threw = error }
    check('G 重复挂载不抛错', threw === null, threw && threw.message)
    check('G 重复挂载不会重复注册', menus.contributions.length === 4, JSON.stringify(menus.contributions))
  }

  // ---- 场景 H：注册被宿主拒绝（例如已有同名贡献）不能拖垮 apply ----
  {
    const menus = makeContextMenus()
    const ctx = makeCtx({ contextMenus: menus, slots: ctx_slots() })
    // 先把两个 target 的切换入口占掉，模拟「另一个实例已经注册过」。
    menus.register({ id: 'mode-exchange.switch', target: 'session', order: 350, resolve: () => [] })
    menus.register({ id: 'mode-exchange.switch', target: 'sessionHeader', order: 350, resolve: () => [] })
    let threw = null
    try {
      menu.mountSessionMenu(ctx, { api: makeApi({}), store: null, t: key => key, h: () => null })
    } catch (error) { threw = error }
    check('H 宿主拒绝注册时不抛错（菜单缺席但插件活着）', threw === null, threw && threw.message)
    check('H 被拒的切换入口不影响迁移入口', menus.contributions.filter(item => item.id === 'mode-exchange.migrate').length === 2, JSON.stringify(menus.contributions))
  }

  if (failures.length > 0) {
    console.error('✗ 右键菜单冒烟测试失败:')
    for (const failure of failures) console.error('  - ' + failure)
    process.exitCode = 1
    return
  }
  console.log('✓ 右键菜单冒烟测试通过（注册 / 解析 / 切换 / 迁移 / 降级 共 A–H 十组场景）')
}

function ctx_slots() {
  return {
    inject(_type, factory) {
      const iterator = typeof factory === 'function' ? factory() : null
      if (iterator && typeof iterator.next === 'function') {
        for (let step = iterator.next(); !step.done; step = iterator.next()) void step.value
      }
      return () => {}
    },
    register() { return { dispose() {} } },
  }
}

main().catch(error => {
  console.error('✗ 右键菜单冒烟测试异常:')
  console.error(error && error.stack ? error.stack : String(error))
  process.exitCode = 1
})
