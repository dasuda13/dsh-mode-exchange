/**
 * 「右键菜单发起迁移 → 面板接管」的离线冒烟测试。
 *
 * 两个组件之间只通过 store 里的 { job, jobSessionId } 交接，
 * 这里用真实的面板组件 + 手写的 React 桩把它跑通：
 *   1. 面板原本停在 session-a，菜单在 session-b 上发起了迁移（store.job = jobId）
 *      → 面板要把会话选择器切到 session-b，而不是把任务套到 session-a 头上；
 *   2. 切过去后自动落到「迁移重建」页签并开始轮询那个 jobId；
 *   3. 任务跑完后把 store 里的待接管标记清掉，避免下次打开面板又接管一遍。
 *
 * React 桩：useState 带真 setState，useEffect 带 deps 比较并把返回值当 cleanup 收好，
 * setInterval 被换成手动队列 —— 否则定时器会把进程吊住，也测不到「多轮轮询之后」的状态。
 */

import { bindUiReact } from '../src/client/ui.js'
import { makePanel } from '../src/client/panel.js'
import { setLocale, t } from '../src/client/i18n.js'

setLocale('zh')

const slots = []
let cursor = 0
let dirty = false
const pending = []
const timers = []
const cleanups = []
globalThis.setInterval = fn => { timers.push(fn); return timers.length }
globalThis.clearInterval = () => {}

const React = {
  createElement(type, props, ...kids) {
    const flat = []
    const walk = value => {
      if (Array.isArray(value)) return value.forEach(walk)
      if (value === null || value === undefined || value === false || value === true) return
      flat.push(value)
    }
    kids.forEach(walk)
    const merged = { ...(props || {}) }
    if (flat.length > 0) merged.children = flat.length === 1 ? flat[0] : flat
    return { type, props: merged }
  },
  useState(init) {
    const index = cursor++
    if (!(index in slots)) slots[index] = typeof init === 'function' ? init() : init
    const set = next => {
      const value = typeof next === 'function' ? next(slots[index]) : next
      if (value !== slots[index]) { slots[index] = value; dirty = true }
    }
    return [slots[index], set]
  },
  useEffect(fn, deps) {
    const index = cursor++
    const key = 'e' + index
    const previous = slots[key]
    const changed = !previous || !deps || deps.length !== previous.length || deps.some((item, at) => item !== previous[at])
    if (changed) { slots[key] = deps ? deps.slice() : []; pending.push(fn) }
  },
  useLayoutEffect() {},
  useMemo(factory) { cursor++; return factory() },
  useCallback(fn) { cursor++; return fn },
  useRef(init) {
    cursor++
    const key = 'r' + cursor
    if (!(key in slots)) slots[key] = { current: init === undefined ? null : init }
    return slots[key]
  },
  Fragment: Symbol('for-test-fragment'),
  memo: component => component,
}
bindUiReact(React)

const byId = {
  'session-a': { id: 'session-a', displayTitle: '重构登录页', retainedBy: { mainView: 1 } },
  'session-b': { id: 'session-b', displayTitle: '打包 npm 并发布', retainedBy: { mainView: 0 } },
}
const ctx = {
  get(name) {
    if (name === 'sessions') return { list: { getSnapshot: () => ({ byId }), subscribe: () => () => {} } }
    return undefined
  },
}

// 面板原本停在 session-a，而菜单是在 session-b 上发起迁移的。
const seed = {
  sessionId: 'session-a', title: '重构登录页', loading: false, loaded: true, error: null,
  currentMode: 'standard', switchable: true, blockedReason: null, switched: false, snapshot: null,
  modes: [{ id: 'standard', name: 'Standard' }],
  config: {}, capabilities: { teamSwitch: false, notes: [] }, migrations: [],
  job: 'job-99', jobSessionId: 'session-b',
  sessions: [
    { id: 'session-a', title: '重构登录页', cwd: 'C:/work/a', workspaceId: 'ws-1' },
    { id: 'session-b', title: '打包 npm 并发布', cwd: 'C:/work/b', workspaceId: 'ws-2' },
  ],
  workspaces: [
    { id: 'ws-1', title: '登录页项目', path: 'C:/work/a' },
    { id: 'ws-2', title: '插件仓库', path: 'C:/work/b' },
  ],
}

const patches = []
const store = {
  getState: () => seed,
  subscribe: () => () => {},
  set(patch) { patches.push(patch); Object.assign(seed, patch) },
  settle() {}, fail() {}, reset() {},
}

let polls = 0
const api = {
  getState: async () => ({
    sessionId: 'session-b', title: '打包 npm 并发布', currentMode: 'ptc', switchable: true,
    modes: seed.modes, config: {}, capabilities: {}, migrations: [],
  }),
  listSessions: async () => ({ items: seed.sessions }),
  listWorkspaces: async () => ({ items: seed.workspaces }),
  jobStatus: async () => {
    polls += 1
    const running = polls < 3
    return {
      jobId: 'job-99',
      status: running ? 'running' : 'done',
      stepIndex: running ? 3 : 7,
      stepName: running ? '导入日志为历史上下文' : '写出报告',
      totalSteps: 7,
      message: running ? '正在导入…' : '迁移完成',
    }
  },
}

const Panel = makePanel(React, { api, store, t, ctx, h: React.createElement })

function toText(node) {
  if (node === null || node === undefined || node === false || node === true) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(toText).join('')
  if (typeof node !== 'object') return String(node)
  const { type } = node
  if (typeof type === 'function') return toText(type(node.props || {}))
  if (typeof type === 'string') {
    if (type === 'style') return ''
    if (type === 'br') return '\n'
    const props = node.props || {}
    if (type === 'input' || type === 'textarea' || type === 'select') {
      return props.value === undefined ? '' : String(props.value)
    }
    return toText(props.children)
  }
  return ''
}

function renderOnce() {
  cursor = 0
  pending.length = 0
  dirty = false
  return React.createElement(Panel, { sessionId: 'session-a' })
}

async function settle() {
  let text = ''
  for (let pass = 0; pass < 80; pass += 1) {
    const tree = renderOnce()
    text = toText(tree)
    const effects = pending.slice()
    if (effects.length === 0 && !dirty) return text
    for (const fn of effects) {
      const cleanup = fn()
      if (typeof cleanup === 'function') cleanups.push(cleanup)
    }
    await Promise.resolve()
    await Promise.resolve()
  }
  return text
}

const failures = []
function check(name, ok, detail) {
  if (!ok) failures.push(name + (detail ? ' — ' + detail : ''))
}

const first = await settle()
check('面板把会话选择器切到菜单发起迁移的那条会话', first.includes('打包 npm 并发布'), first.slice(0, 160))
check('面板自动落到「迁移重建」页签并显示进度', first.includes('迁移重建') && (first.includes('步骤') || first.includes('导入')), first.slice(0, 400))
check('面板开始轮询菜单给的任务号', polls >= 1, 'polls=' + polls)

// 推进几轮轮询，让任务从 running 走到 done。
for (let round = 0; round < 6; round += 1) {
  for (const fn of timers) fn()
  await Promise.resolve()
  await settle()
}
check('任务跑完后清掉 store 里的待接管标记', patches.some(patch => patch.job === null && patch.jobSessionId === null), JSON.stringify(patches.map(patch => Object.keys(patch).join('+'))))

if (failures.length > 0) {
  console.error('✗ 菜单→面板交接冒烟测试失败:')
  for (const failure of failures) console.error('  - ' + failure)
  process.exit(1)
}
console.log('✓ 菜单→面板交接冒烟测试通过（切会话 / 切页签 / 轮询 / 收尾清理）')
process.exit(0)
