#!/usr/bin/env node
/**
 * 渲染冒烟测试：把 src/client/bundle.js 当成宿主那样加载（伪造 window.__ModuleLoader__
 * 与 `require('react')`），执行 apply() 拿到注册的插槽组件，再把它们真渲染一遍。
 *
 * 为什么需要它：组件曾经是「首参是 React」的工厂签名，被 h(Component, props) 当组件渲染时
 * React 只传 (props, context)，解构第二个参数直接 TypeError —— 面板与设置页双双白屏，
 * 而构建脚本、类型检查、服务端冒烟全都发现不了。这里用最小 React 桩把渲染跑通即可拦住同类回归。
 *
 * 用法：node scripts/smoke-render.mjs   （构建后运行；失败退出码 1）
 */

import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const failures = []
function check(name, condition, detail) {
  if (condition) return
  failures.push(name + (detail ? ' — ' + detail : ''))
}

/** 最小 React 桩：createElement + 让无状态组件与 useState 组件都能被渲染一次。 */
function makeReactStub() {
  let elementSeq = 0
  function createElement(type, props) {
    const flat = []
    for (let i = 2; i < arguments.length; i += 1) flatten(arguments[i], flat)
    const merged = { ...(props || {}) }
    if (flat.length > 0) merged.children = flat.length === 1 ? flat[0] : flat
    return { $$element: ++elementSeq, type, props: merged }
  }
  function flatten(value, out) {
    if (Array.isArray(value)) {
      for (const item of value) flatten(item, out)
      return
    }
    if (value === null || value === undefined || value === false || value === true) return
    out.push(value)
  }
  const noop = () => {}
  return {
    createElement,
    useState(initial) {
      return [typeof initial === 'function' ? initial() : initial, noop]
    },
    useEffect: noop,
    useLayoutEffect: noop,
    useMemo: factory => factory(),
    useCallback: fn => fn,
    useRef: initial => ({ current: initial === undefined ? null : initial }),
    Fragment: Symbol.for('react.fragment'),
    memo: component => component,
  }
}

/** 递归把元素树渲染成文本；函数组件被真调用，抛错就是白屏原因。 */
function renderToText(node, path = 'root') {
  if (node === null || node === undefined || node === false || node === true) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((item, index) => renderToText(item, path + '[' + index + ']')).join('')
  if (typeof node !== 'object') return String(node)
  const { type } = node
  if (typeof type === 'function') {
    let output
    try {
      output = type(node.props || {})
    } catch (cause) {
      throw new Error('组件 ' + (type.name || 'anonymous') + ' 在 ' + path + ' 渲染时抛错: ' + (cause && cause.stack ? cause.stack : String(cause)))
    }
    return renderToText(output, path + '>' + (type.name || 'Component'))
  }
  if (typeof type === 'string') {
    if (type === 'br') return '\n'
    if (type === 'style') return '' // 样式表不计入可见文本
    const props = node.props || {}
    if (type === 'input' || type === 'textarea' || type === 'select') {
      return props.value === undefined ? '' : String(props.value)
    }
    return renderToText(props.children, path + '>' + type)
  }
  return ''
}

/** 收集树里指定标签的元素（展开函数组件，用于断言样式表确实被渲染出来）。 */
function findElements(node, tagName, out = []) {
  if (node === null || node === undefined || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const item of node) findElements(item, tagName, out)
    return out
  }
  if (typeof node.type === 'function') {
    findElements(node.type(node.props || {}), tagName, out)
    return out
  }
  if (node.type === tagName) out.push(node)
  if (node.props && node.props.children !== undefined) findElements(node.props.children, tagName, out)
  return out
}

async function loadBundle(React) {
  const file = join(root, 'src', 'client', 'bundle.js')
  const source = await readFile(file, 'utf8')
  let definition = null
  const windowStub = { __ModuleLoader__: { load(value) { definition = value } } }
  const requireStub = id => {
    if (id === 'react') return React
    throw new Error('客户端不应 require 除 react 之外的模块，但收到: ' + id)
  }
  // eslint-disable-next-line no-new-func
  const run = new Function('window', 'require', 'module', 'exports', source + '\n//# sourceURL=bundle.js')
  run(windowStub, requireStub, { exports: {} }, {})
  if (!definition || typeof definition.factory !== 'function') {
    throw new Error('产物不是 __ModuleLoader__.load({ factory }) 形态')
  }
  // 宿主加载器的契约：factory(require) 直接返回客户端对象（bundle 内部已调用入口函数）。
  const client = definition.factory(requireStub)
  return { id: definition.id, client }
}

/**
 * 最小 DOM 桩：只为验证「样式是否真的贴进了页面」。
 * 这正是实机上出问题的链路 —— 宿主的 Web 宿主里没有 styles 服务，
 * 旧代码 ctx.get('styles') 拿不到就直接静默跳过，CSS 从未生效。
 */
function makeDom() {
  const appended = []
  const head = {
    querySelector(selector) {
      const match = /^style\[data-plugin-css="(.+)"\]$/.exec(selector)
      if (!match) return null
      return appended.find(tag => tag.attributes['data-plugin-css'] === match[1]) || null
    },
    appendChild(node) {
      appended.push(node)
      return node
    },
    removeChild(node) {
      const index = appended.indexOf(node)
      if (index >= 0) appended.splice(index, 1)
      return node
    },
  }
  const document = {
    head,
    createElement(tagName) {
      return {
        tagName,
        attributes: {},
        textContent: '',
        setAttribute(name, value) { this.attributes[name] = String(value) },
        get parentNode() { return appended.includes(this) ? head : null },
      }
    },
  }
  return { document, appended }
}

function makeCtx(registrations, menus) {
  const services = {
    locale: { getSnapshot: () => ({ locale: 'zh' }), register: () => {} },
    sessions: { list: { getSnapshot: () => ({ byId: {} }), subscribe: () => () => {} } },
    styles: { insert: () => () => {} },
    layout: { getSnapshot: () => ({}), subscribe: () => () => {} },
    // 宿主 contextMenus 的最小桩：只记录注册，不渲染弹窗。
    contextMenus: {
      register(input) { if (menus) menus.push(input); return () => {} },
      notify() {},
      open() {},
      close() {},
    },
  }
  return {
    effect(factory) {
      return factory()
    },
    get(name) {
      return services[name]
    },
    slots: {
      inject(_type, factory) {
        return typeof factory === 'function' ? factory() : undefined
      },
      register(config, component) {
        const name = config && config.name ? config.name : 'unknown'
        if (!registrations[name]) registrations[name] = []
        registrations[name].push({ config, component })
        return { dispose() {} }
      },
    },
  }
}

async function main() {
  const React = makeReactStub()
  const { id, client } = await loadBundle(React)
  check('bundle id 等于包名', id === 'dsh-mode-exchange', '实际为 ' + id)
  check('出厂形态是 inject/apply 契约', Boolean(client && Array.isArray(client.inject) && typeof client.apply === 'function'))

  // 真机同构：带 document 的 ctx，验证 apply() 会把 <style> 贴进 head。
  const { document, appended } = makeDom()
  const globalScope = globalThis
  const previousDocument = Object.prototype.hasOwnProperty.call(globalScope, 'document') ? globalScope.document : undefined
  globalScope.document = document
  const registrations = {}
  const menus = []
  const ctx = makeCtx(registrations, menus)
  client.apply(ctx)
  const injected = appended.filter(tag => tag.attributes['data-plugin-css'] === 'dsh-mode-exchange/ui.css')
  check('apply() 把样式表贴进 document.head', appended.length === 1, '贴入 ' + appended.length + ' 个 <style>')
  check('贴入的样式表含 .dsh-me-root 规则', injected.length === 1 && injected[0].textContent.includes('.dsh-me-root'))
  if (previousDocument === undefined) delete globalScope.document
  else globalScope.document = previousDocument

  check('注册了 main 面板', (registrations.main || []).length === 1)
  check('注册了设置页', (registrations['settings.section'] || []).length === 1)
  check('注册了设置页图标', (registrations['settings.section.icon'] || []).length === 1)
  check('注册了侧栏入口', (registrations['sidebar.panellist'] || []).length === 1)
  // 两个入口（切换 / 迁移）× 两个 target = 四条贡献。
  const menuKeys = menus.map(item => item.target + '/' + item.id).sort()
  check('注册了会话右键菜单（两个入口 × 两个 target）',
    menus.length === 4 &&
    new Set(menus.map(item => item.id)).size === 2 &&
    menus.every(item => item.id === 'mode-exchange.switch' || item.id === 'mode-exchange.migrate') &&
    menuKeys.join(' ') === [
      'session/mode-exchange.migrate',
      'session/mode-exchange.switch',
      'sessionHeader/mode-exchange.migrate',
      'sessionHeader/mode-exchange.switch',
    ].join(' '),
    JSON.stringify(menuKeys))

  // 回归点：样式表必须作为 <style> 元素随组件渲染出来（宿主里没有 styles 服务）。
  for (const [label, reg] of [['设置页', (registrations['settings.section'] || [])[0]], ['中央面板', (registrations.main || [])[0]]]) {
    if (!reg) continue
    const tree = React.createElement(reg.component, { sessionId: null })
    const styles = findElements(tree, 'style')
    check(label + '渲染 <style> 样式表', styles.length === 1, '找到 ' + styles.length + ' 个')
    const css = styles.length === 1 ? String(styles[0].props.children || '') : ''
    check(label + '样式表含 .dsh-me-root 规则', css.includes('.dsh-me-root'), '长度 ' + css.length)
    check(label + '样式表非空（> 5KB）', css.length > 5000, '长度 ' + css.length)
  }

  const settings = (registrations['settings.section'] || [])[0]
  if (settings) {
    const text = renderToText(React.createElement(settings.component, {}))
    check('设置页能渲染', text.length > 100, '渲染文本长度 ' + text.length)
    check('设置页含标题「模式迁移」', text.includes('模式迁移'), '渲染结果: ' + text.slice(0, 200))
    check('设置页含副标题', text.includes('切换与迁移的默认行为'))
  }

  const panel = (registrations.main || [])[0]
  if (panel) {
    const text = renderToText(React.createElement(panel.component, { sessionId: null }))
    check('中央面板能渲染', text.length > 100, '渲染文本长度 ' + text.length)
    check('面板含标题「模式迁移」', text.includes('模式迁移'), '渲染结果: ' + text.slice(0, 200))
    check('面板含页签', text.includes('模式切换') && text.includes('迁移重建'))
  }

  const icon = (registrations['settings.section.icon'] || [])[0]
  if (icon) {
    const text = renderToText(React.createElement(icon.component, { size: 16, active: true }))
    check('设置页图标能渲染', typeof text === 'string')
  }

  if (failures.length > 0) {
    console.error('✗ 渲染冒烟测试失败:')
    for (const failure of failures) console.error('  - ' + failure)
    process.exitCode = 1
    return
  }
  console.log('✓ 渲染冒烟测试通过（设置页 / 中央面板 / 图标均可渲染）')
}

main().catch(error => {
  console.error('✓? 渲染冒烟测试异常:')
  console.error(error && error.stack ? error.stack : String(error))
  process.exitCode = 1
})
