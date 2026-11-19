/**
 * 客户端入口。注册四个插槽与一份样式表：
 *   1. sidebar.panellist(id=mode-exchange) —— 侧栏图标入口（点击切到 main 面板）
 *   2. main(key=mode-exchange)             —— 中央面板承载模式切换与迁移重建
 *   3. settings.section(id=mode-exchange)  —— 插件设置页
 *   4. settings.section.icon               —— 设置页图标
 *
 * 全部注册都放在 ctx.effect() / ctx.slots.inject() 里，插件卸载时自动清理。
 * 样式走宿主提供的 styles.insert()，不向 document.body 追加节点。
 */

import { setLocale, registerLocale, t } from './i18n.js'
import { ensureGlobalStyle, dropGlobalStyle, bindUiReact } from './ui.js'
import { createApi } from './api.js'
import { createStore } from './store.js'
import { makePanel } from './panel.js'
import { makeSettings, makeSettingsIcon } from './settings.js'

export const PANEL_KEY = 'mode-exchange'
const SETTINGS_ID = 'mode-exchange'
const PANEL_ENTRY_ID = 'mode-exchange'

/**
 * 从 sessions 服务的列表快照里找出「当前主视图占用的会话」。
 * 依据：SessionSummary.retainedBy.mainView > 0 —— 这是宿主自己判定「当前会话」的口径。
 * 取不到返回 null，面板会提示用户先打开一个会话。
 */
export function mainViewSessionId(sessions) {
  try {
    const snapshot = sessions && sessions.list ? sessions.list.getSnapshot() : undefined
    const byId = snapshot ? snapshot.byId : undefined
    if (!byId) return null
    for (const row of Object.values(byId)) {
      if (!row) continue
      const retained = row.retainedBy ? row.retainedBy.mainView : 0
      if (typeof retained === 'number' && retained > 0) return String(row.id)
    }
    return null
  } catch (error) {
    void error
    return null
  }
}

/** 供 bundle 生成脚本调用的工厂。 */
export function startModeExchangeClient(require) {
  const React = require('react')
  const h = React.createElement
  // 先绑定 React，ui.js 里的共享组件依赖它（否则渲染即抛错 → 面板/设置页白屏）
  bindUiReact(React)

  return {
    inject: ['slots', 'sessions', 'locale', 'layout'],
    apply(ctx) {
      // ---- 语言：跟随宿主 locale，取不到回退中文 ----
      try {
        const locale = ctx.get('locale')
        if (locale && typeof locale.getSnapshot === 'function') {
          const snapshot = locale.getSnapshot()
          setLocale(snapshot && snapshot.locale ? snapshot.locale : 'zh')
        }
      } catch (error) {
        void error
      }
      registerLocale(ctx)

      const api = createApi(t)
      const store = createStore()
      const deps = { api, store, t, ctx, h }

      /**
       * ---- 样式：贴一份到 document.head ----
       * 宿主的 Web 宿主里没有 'styles' 服务（ctx.get('styles') 拿不到），
       * 也不存在 globalThis.__dshStylesInsert —— 之前那条链路是死的，CSS 从未生效，
       * 所以面板/设置页只剩纯文本堆叠。这里改为直接建 <style>（宿主自带插件都这么做），
       * 按 data-plugin-css 去重，并在每个面板/设置页根节点再渲染一份 <StyleTag/> 兜底。
       */
      ctx.effect(() => {
        const tag = ensureGlobalStyle()
        return () => { dropGlobalStyle(tag) }
      }, 'mode-exchange styles')

      /**
       * 订阅「当前会话」。sessions.list 是可观察快照，订阅后跟随主视图切换实时更新，
       * 不再用 location 正则去猜。
       */
      function useActiveSessionId() {
        const sessions = ctx.get('sessions')
        const read = () => mainViewSessionId(sessions)
        const [sessionId, setSessionId] = React.useState(read)
        React.useEffect(() => {
          if (!sessions || !sessions.list || typeof sessions.list.subscribe !== 'function') return undefined
          const sync = () => {
            const next = read()
            setSessionId(previous => (previous === next ? previous : next))
          }
          sync()
          const dispose = sessions.list.subscribe(sync)
          return () => { if (typeof dispose === 'function') dispose() }
        }, [])
        return sessionId
      }

      // ---- 中央面板 ----
      ctx.slots.inject('main', () => ctx.slots.register(
        { name: 'main', key: PANEL_KEY, order: 40 },
        function ModeExchangePanel(props) {
          const sessionId = useActiveSessionId()
          const Panel = makePanel(React, deps)
          return h(Panel, {
            sessionId: sessionId || (props && props.sessionId) || null,
            onClose: props && props.closePanel,
          })
        },
      ))

      // ---- 侧栏图标入口：id 与 main 的 key 同名，点击即切面板 ----
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
        {
          name: 'sidebar.panellist',
          id: PANEL_ENTRY_ID,
          order: 35,
          label: () => t('panel.title'),
        },
        function ModeExchangeIcon(props) {
          const size = props && typeof props.size === 'number' ? props.size : 18
          const active = props && props.active === true
          return h('svg', {
            viewBox: '0 0 16 16',
            width: size,
            height: size,
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: active ? 1.7 : 1.3,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            'aria-hidden': true,
            style: { display: 'block', pointerEvents: 'none' },
          },
          h('path', { d: 'M2.5 4.5h5.2' }),
          h('path', { d: 'M10.3 4.5h3.2' }),
          h('path', { d: 'M2.5 11.5h3.2' }),
          h('path', { d: 'M8.3 11.5h5.2' }),
          h('circle', { cx: 9, cy: 4.5, r: 1.5 }),
          h('circle', { cx: 7, cy: 11.5, r: 1.5 }),
          )
        },
      ))

      // ---- 设置页与图标 ----
      ctx.slots.inject('settings.section', () => ctx.slots.register(
        { name: 'settings.section', id: SETTINGS_ID, order: 62, label: () => t('settings.title') },
        makeSettings(React, deps),
      ))

      ctx.slots.inject('settings.section.icon', () => ctx.slots.register(
        { name: 'settings.section.icon', id: SETTINGS_ID, order: 62 },
        makeSettingsIcon(React),
      ))
    },
  }
}
