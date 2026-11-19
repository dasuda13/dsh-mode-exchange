/**
 * 共享 UI 原子组件与样式表。
 * 所有组件都只用 React.createElement 构造，不依赖宿主内部组件库，
 * 避免版本差异导致的白屏。
 *
 * 视觉语言对齐宿主 dsh-client-ui-theme：文字/描边/圆角/动效取自 --dsw-* 语义 token，
 * 形状照抄宿主的卡片（.5px 描边 + radius-xl）与设置行（label 与值分列）。
 * 但「面」的底色由插件自己给：皮肤（如 blue-fantasy）会把 --dsw-alias-bg-layer-* 改成半透明，
 * 直接拿来当卡片底会让壁纸细节透到文字下面，所以表面色走自有的 --me-surface*。
 */

export const THEME = {
  panelWidth: 380,
  gap: 12,
  radius: 12,
}

/**
 * 宿主 React 实例。组件用模块级绑定而不是每个组件都收 React 参数 ——
 * 之前那种「首参是 React」的工厂签名，一旦被 h(Component, props) 当组件渲染，
 * React 只会传 (props, context)，第二个参数解构即崩，整页白屏。
 */
let ReactRef = null

/** 绑定宿主 React；必须在任何组件渲染前调用一次。 */
export function bindUiReact(React) {
  ReactRef = React
}

/** 组件内部的 createElement；未绑定时直接抛错，别再静默白屏。 */
function h() {
  if (ReactRef === null) {
    throw new Error('dsh-mode-exchange: UI 组件未绑定 React（请先调用 bindUiReact(React)）')
  }
  return ReactRef.createElement.apply(ReactRef, arguments)
}

/** 返回面板样式表（字符串）。所有类名带 dsh-me- 前缀，避免污染宿主样式。 */
export function styleCss() {
  return `
/* 面板自带「面」，不读 bg-layer-* / settings-card-fill —— 皮肤（如 blue-fantasy）会把
   这些 token 改成半透明，壁纸细节会直接透到文字底下。这里用固定色 + 磨砂兜底。 */
.dsh-me-root {
  --me-hairline: rgba(15, 17, 21, .10);
  --me-surface: rgba(255, 255, 255, .88);
  --me-surface-strong: rgba(255, 255, 255, .96);
  --me-raise: #ffffff;
  --me-fill-soft: rgba(238, 242, 248, .92);
  --me-card-fill: var(--me-surface-strong);
  --me-shadow: 0 1px 2px rgba(15, 17, 21, .06), 0 10px 30px rgba(15, 17, 21, .07);
  --me-bd: var(--dsw-alias-border-l2, var(--me-hairline));
  --me-bd-soft: var(--dsw-alias-border-l1, rgba(15, 17, 21, .06));
  --me-card-bd: var(--dsw-alias-border-l4, var(--me-hairline));
  --me-label: var(--dsw-alias-label-primary, inherit);
  --me-label-2: var(--dsw-alias-label-secondary, rgba(128, 128, 128, .92));
  --me-label-3: var(--dsw-alias-label-tertiary, rgba(128, 128, 128, .76));
  --me-label-4: var(--dsw-alias-label-caption, rgba(128, 128, 128, .62));
  --me-hover: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, .1));
  --me-accent: var(--dsw-alias-state-business-primary, #4176e6);
  --me-ok: var(--dsw-alias-state-success-primary, #3f9d63);
  --me-warn: var(--dsw-alias-state-warn-primary, #d9a13b);
  --me-error: var(--dsw-alias-state-error-primary, #d05a5a);
  --me-ease: var(--ds-ease-in-out, cubic-bezier(.4, 0, .2, 1));
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 14px 14px 18px;
  overflow-y: auto;
  overscroll-behavior: contain;
  color: var(--me-label);
  font-family: var(--dsw-font-family, inherit);
  font-size: 13px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  /* 面板本体：近不透明底 + 磨砂，壁纸只剩光晕不透细节。 */
  max-width: 760px;
  margin-inline: auto;
  border-radius: var(--dsw-radius-lg, 16px);
  background: var(--me-surface);
  box-shadow: var(--me-shadow);
  -webkit-backdrop-filter: blur(20px) saturate(1.12);
  backdrop-filter: blur(20px) saturate(1.12);
}
body[data-ds-dark-theme] .dsh-me-root {
  --me-hairline: rgba(255, 255, 255, .12);
  --me-surface: rgba(22, 26, 36, .87);
  --me-surface-strong: rgba(34, 39, 52, .96);
  --me-raise: #414757;
  --me-fill-soft: rgba(47, 53, 70, .92);
  --me-shadow: 0 1px 2px rgba(0, 0, 0, .38), 0 10px 30px rgba(0, 0, 0, .34);
  --me-bd-soft: rgba(255, 255, 255, .07);
}
.dsh-me-root *,
.dsh-me-root *::before,
.dsh-me-root *::after { box-sizing: border-box; }
/* 设置页由宿主提供内边距，插件不再自垫一层。 */
.dsh-me-root[data-flat="true"] {
  height: auto;
  max-width: 720px;
  padding: 0;
  overflow: visible;
  gap: 12px;
  margin-inline: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
.dsh-me-root::-webkit-scrollbar { width: 6px; height: 6px; }
.dsh-me-root::-webkit-scrollbar-track { background: transparent; }
.dsh-me-root::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-scrollbar-bg-l2, rgba(128, 128, 128, .3));
  border-radius: 999px;
}
.dsh-me-root::-webkit-scrollbar-thumb:hover {
  background: var(--dsw-alias-scrollbar-hover-l2, rgba(128, 128, 128, .45));
}

/* ---------- 标题区 ---------- */
.dsh-me-head { display: flex; align-items: flex-start; gap: 10px; padding: 2px 2px 0; }
.dsh-me-headtext { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.dsh-me-title { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; letter-spacing: -.01em; color: var(--me-label); }
.dsh-me-sub { margin: 0; font-size: 12px; line-height: 18px; color: var(--me-label-3); overflow-wrap: anywhere; }
.dsh-me-head[data-size="lg"] { padding: 0; gap: 0; }
.dsh-me-head[data-size="lg"] .dsh-me-headtext { gap: 4px; }
.dsh-me-head[data-size="lg"] .dsh-me-title { font-size: 18px; line-height: 26px; }
.dsh-me-head[data-size="lg"] .dsh-me-sub { font-size: 13px; line-height: 20px; }
.dsh-me-iconbtn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: var(--dsw-radius-sm, 8px);
  background: transparent;
  color: var(--me-label-3);
  font: inherit;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition: background .16s var(--me-ease), color .16s var(--me-ease);
}
.dsh-me-iconbtn:hover:not(:disabled) { background: var(--me-hover); color: var(--me-label); }
.dsh-me-iconbtn:disabled { opacity: .4; cursor: not-allowed; }

/* ---------- 分段页签（宿主 navCell 的胶囊化） ---------- */
.dsh-me-tabs {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 2px;
  padding: 3px;
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--me-fill-soft);
}
.dsh-me-tab {
  appearance: none;
  min-width: 0;
  margin: 0;
  padding: 6px 8px;
  border: none;
  border-radius: calc(var(--dsw-radius-md, 12px) - 3px);
  background: transparent;
  color: var(--me-label-3);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: background .16s var(--me-ease), color .16s var(--me-ease);
}
/* 侧栏被拖窄时页签仍保证三个中文标签完整可读。 */
@media (max-width: 340px) {
  .dsh-me-tab { padding: 6px 4px; font-size: 12px; }
}
.dsh-me-tab:hover { color: var(--me-label); }
.dsh-me-tab[data-active="true"] {
  background: var(--me-raise);
  color: var(--me-label);
  box-shadow: 0 1px 2px rgba(15, 17, 21, .12);
}

/* ---------- 卡片 / 分组 ---------- */
.dsh-me-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: .5px solid var(--me-card-bd);
  border-radius: var(--dsw-radius-xl, 20px);
  background: var(--me-card-fill);
  box-shadow: 0 1px 2px rgba(15, 17, 21, .05);
  transition: border-color .16s var(--me-ease), background .16s var(--me-ease);
}
.dsh-me-card[data-tone="accent"] {
  border-color: var(--dsw-alias-border-selected, var(--me-accent));
  background: var(--me-fill-soft);
}
.dsh-me-card[data-tone="warn"] { border-color: color-mix(in srgb, var(--me-warn) 45%, transparent); }
.dsh-me-card[data-tone="error"] { border-color: color-mix(in srgb, var(--me-error) 45%, transparent); }
.dsh-me-section { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.dsh-me-sectionhead { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 2px; }
.dsh-me-sectiontitle {
  font-size: 12px;
  line-height: 17px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--me-label-3);
}
.dsh-me-stack { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.dsh-me-stack-sm { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.dsh-me-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.dsh-me-divider { height: 0; margin: 2px 0; border: none; border-top: .5px solid var(--me-bd-soft); }

/* ---------- 行 / 字段 ---------- */
.dsh-me-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-width: 0; }
.dsh-me-row-wrap { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dsh-me-field { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; min-width: 0; }
.dsh-me-fieldlabel { flex: none; font-size: 12px; line-height: 18px; color: var(--me-label-3); }
.dsh-me-fieldvalue {
  min-width: 0;
  text-align: right;
  font-size: 13px;
  line-height: 20px;
  color: var(--me-label);
  overflow-wrap: anywhere;
}
.dsh-me-label { font-size: 13px; font-weight: 500; color: var(--me-label); }
.dsh-me-hint { margin: 0; font-size: 12px; line-height: 18px; color: var(--me-label-3); overflow-wrap: anywhere; }
.dsh-me-dim { color: var(--me-label-3); }
.dsh-me-code {
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 11.5px;
  color: var(--me-label-2);
  word-break: break-word;
  overflow-wrap: anywhere;
}

/* ---------- 提示条 ---------- */
.dsh-me-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 9px 11px;
  border: .5px solid transparent;
  border-radius: var(--dsw-radius-md, 12px);
  background: color-mix(in srgb, var(--me-label) 6%, transparent);
  color: var(--me-label-2);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}
.dsh-me-noticedot { flex: none; width: 6px; height: 6px; margin-top: 6px; border-radius: 50%; background: var(--me-accent); }
.dsh-me-noticetext { min-width: 0; }
.dsh-me-notice[data-kind="ok"] {
  background: color-mix(in srgb, var(--me-ok) 9%, transparent);
  border-color: color-mix(in srgb, var(--me-ok) 22%, transparent);
}
.dsh-me-notice[data-kind="ok"] .dsh-me-noticedot { background: var(--me-ok); }
.dsh-me-notice[data-kind="warn"] {
  background: color-mix(in srgb, var(--me-warn) 11%, transparent);
  border-color: color-mix(in srgb, var(--me-warn) 26%, transparent);
}
.dsh-me-notice[data-kind="warn"] .dsh-me-noticedot { background: var(--me-warn); }
.dsh-me-notice[data-kind="error"] {
  background: color-mix(in srgb, var(--me-error) 9%, transparent);
  border-color: color-mix(in srgb, var(--me-error) 24%, transparent);
}
.dsh-me-notice[data-kind="error"] .dsh-me-noticedot { background: var(--me-error); }

/* ---------- 表单控件 ---------- */
.dsh-me-control { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.dsh-me-controllabel { font-size: 12px; line-height: 18px; font-weight: 500; color: var(--me-label-2); }
.dsh-me-selectwrap { position: relative; display: block; min-width: 0; }
.dsh-me-selectwrap::after {
  content: "";
  position: absolute;
  top: 50%;
  right: 12px;
  width: 6px;
  height: 6px;
  margin-top: -5px;
  border-right: 1.4px solid var(--me-label-3);
  border-bottom: 1.4px solid var(--me-label-3);
  transform: rotate(45deg);
  pointer-events: none;
}
.dsh-me-select,
.dsh-me-input,
.dsh-me-textarea {
  width: 100%;
  min-width: 0;
  height: 32px;
  margin: 0;
  padding: 0 10px;
  border: .5px solid var(--me-bd);
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--me-fill-soft);
  color: var(--me-label);
  font: inherit;
  font-size: 13px;
  line-height: 30px;
  outline: none;
  transition: border-color .16s var(--me-ease), background .16s var(--me-ease);
}
.dsh-me-select { appearance: none; padding-right: 28px; cursor: pointer; }
.dsh-me-textarea {
  height: auto;
  min-height: 62px;
  padding: 8px 10px;
  line-height: 1.55;
  resize: vertical;
}
.dsh-me-select:focus,
.dsh-me-input:focus,
.dsh-me-textarea:focus {
  border-color: var(--dsw-alias-border-selected, var(--me-accent));
  background: var(--me-raise);
}
.dsh-me-select:disabled,
.dsh-me-input:disabled,
.dsh-me-textarea:disabled { opacity: .5; cursor: not-allowed; }
.dsh-me-input::placeholder,
.dsh-me-textarea::placeholder { color: var(--me-label-4); }

/* 开关：34x20 轨道 + 14px 滑块，选中用品牌蓝 */
.dsh-me-toggle {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  cursor: pointer;
}
.dsh-me-toggle[data-disabled="true"] { opacity: .5; cursor: not-allowed; }
.dsh-me-toggletext { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dsh-me-togglelabel { font-size: 13px; line-height: 20px; color: var(--me-label); }
.dsh-me-togglehint { font-size: 12px; line-height: 17px; color: var(--me-label-3); overflow-wrap: anywhere; }
.dsh-me-switch {
  flex: none;
  appearance: none;
  position: relative;
  width: 34px;
  height: 20px;
  margin: 0;
  padding: 0;
  border: .5px solid var(--me-bd);
  border-radius: 999px;
  corner-shape: round;
  background: var(--me-fill-soft);
  cursor: pointer;
  transition: background .16s var(--me-ease), border-color .16s var(--me-ease);
}
.dsh-me-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--me-raise);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .22);
  transition: transform .16s var(--me-ease);
}
.dsh-me-switch:checked { background: var(--me-accent); border-color: transparent; }
.dsh-me-switch:checked::after { transform: translateX(14px); background: var(--dsw-alias-label-on-color, #fff); }
.dsh-me-switch:disabled { opacity: .45; cursor: not-allowed; }

/* ---------- 按钮 ---------- */
.dsh-me-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  margin: 0;
  padding: 0 12px;
  border: .5px solid var(--me-bd);
  border-radius: var(--dsw-radius-md, 12px);
  background: transparent;
  color: var(--me-label);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background .16s var(--me-ease), border-color .16s var(--me-ease), color .16s var(--me-ease), opacity .16s var(--me-ease);
}
.dsh-me-button:hover:not(:disabled) { background: var(--me-hover); }
.dsh-me-button:disabled { opacity: .45; cursor: not-allowed; }
.dsh-me-button[data-variant="primary"] {
  border-color: transparent;
  background: var(--dsw-alias-button-primary-fill, var(--me-accent));
  color: var(--dsw-alias-label-primary-foreground, #fff);
}
.dsh-me-button[data-variant="primary"]:hover:not(:disabled) {
  background: var(--dsw-alias-button-primary-hover, var(--me-accent));
  filter: brightness(1.04);
}
.dsh-me-button[data-variant="danger"] {
  border-color: color-mix(in srgb, var(--me-error) 42%, transparent);
  color: var(--me-error);
  background: transparent;
}
.dsh-me-button[data-variant="danger"]:hover:not(:disabled) {
  background: color-mix(in srgb, var(--me-error) 10%, transparent);
}
.dsh-me-button[data-variant="ghost"] { border-color: transparent; color: var(--me-label-2); }
.dsh-me-button[data-size="sm"] { height: 26px; padding: 0 9px; font-size: 12px; }

/* ---------- 步骤 ---------- */
.dsh-me-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0; }
.dsh-me-step {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 4px 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--me-label-4);
  transition: color .16s var(--me-ease);
}
.dsh-me-stepdot {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-top: 2px;
  border: 1px solid var(--me-bd);
  border-radius: 50%;
  background: transparent;
  color: transparent;
  font-size: 9px;
  line-height: 1;
}
.dsh-me-steptext { display: flex; align-items: baseline; gap: 6px; min-width: 0; flex-wrap: wrap; }
.dsh-me-step[data-state="active"] { color: var(--me-label); font-weight: 500; }
.dsh-me-step[data-state="active"] .dsh-me-stepdot {
  border-color: var(--me-accent);
  background: color-mix(in srgb, var(--me-accent) 16%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--me-accent) 12%, transparent);
}
.dsh-me-step[data-state="done"] { color: var(--me-label-2); }
.dsh-me-step[data-state="done"] .dsh-me-stepdot {
  border-color: transparent;
  background: var(--me-ok);
  color: var(--dsw-alias-label-on-color, #fff);
}
.dsh-me-step[data-state="failed"] { color: var(--me-error); }
.dsh-me-step[data-state="failed"] .dsh-me-stepdot {
  border-color: transparent;
  background: var(--me-error);
  color: var(--dsw-alias-label-on-color, #fff);
}

/* ---------- 表格 / 列表 / 徽标 ---------- */
.dsh-me-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.dsh-me-table th {
  padding: 0 6px 6px;
  border-bottom: .5px solid var(--me-bd);
  color: var(--me-label-4);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .04em;
  text-align: left;
  white-space: nowrap;
}
.dsh-me-table td {
  padding: 7px 6px;
  border-bottom: .5px solid var(--me-bd-soft);
  vertical-align: top;
  color: var(--me-label-2);
}
.dsh-me-table tr:last-child td { border-bottom: none; }
.dsh-me-history { display: flex; flex-direction: column; }
.dsh-me-historyrow {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0;
  border-bottom: .5px solid var(--me-bd-soft);
  min-width: 0;
}
.dsh-me-historyrow:last-child { border-bottom: none; padding-bottom: 2px; }
.dsh-me-historyhead { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
.dsh-me-historytitle {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 500;
  color: var(--me-label);
}
.dsh-me-historymeta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 11.5px; color: var(--me-label-4); }
.dsh-me-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; font-size: 12px; line-height: 18px; color: var(--me-label-3); }
.dsh-me-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border: .5px solid var(--me-bd);
  border-radius: 999px;
  corner-shape: round;
  font-size: 11px;
  line-height: 17px;
  font-weight: 500;
  color: var(--me-label-2);
  white-space: nowrap;
}
.dsh-me-badge[data-tone="ok"] {
  border-color: color-mix(in srgb, var(--me-ok) 35%, transparent);
  background: color-mix(in srgb, var(--me-ok) 10%, transparent);
  color: var(--me-ok);
}
.dsh-me-badge[data-tone="warn"] {
  border-color: color-mix(in srgb, var(--me-warn) 40%, transparent);
  background: color-mix(in srgb, var(--me-warn) 12%, transparent);
  color: var(--me-warn);
}
.dsh-me-badge[data-tone="error"] {
  border-color: color-mix(in srgb, var(--me-error) 38%, transparent);
  background: color-mix(in srgb, var(--me-error) 10%, transparent);
  color: var(--me-error);
}
.dsh-me-badge[data-tone="idle"] { border-color: var(--me-bd); color: var(--me-label-3); }

/* ---------- 空状态 ---------- */
.dsh-me-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 14px;
  border: .5px dashed var(--me-bd);
  border-radius: var(--dsw-radius-lg, 16px);
  text-align: center;
  color: var(--me-label-3);
}
.dsh-me-emptyicon { color: var(--me-label-4); }
.dsh-me-emptytitle { font-size: 13px; line-height: 20px; font-weight: 500; color: var(--me-label-2); }
.dsh-me-emptydesc { font-size: 12px; line-height: 18px; max-width: 260px; }
.dsh-me-spacer { flex: 1 1 auto; }
.dsh-me-details summary {
  cursor: pointer;
  font-size: 12px;
  color: var(--me-label-2);
  padding: 3px 0;
  list-style: none;
}
.dsh-me-details summary::-webkit-details-marker { display: none; }
.dsh-me-details summary::before {
  content: "\\25B8";
  display: inline-block;
  margin-right: 5px;
  color: var(--me-label-4);
  transition: transform .16s var(--me-ease);
}
.dsh-me-details[open] summary::before { transform: rotate(90deg); }

.dsh-me-root :focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--me-accent));
  outline-offset: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .dsh-me-root *,
  .dsh-me-root *::before,
  .dsh-me-root *::after { transition-duration: 0s !important; }
}
`
}

const STYLE_ID = 'dsh-mode-exchange/ui.css'

/** 样式文本只拼一次（模板串很大，避免每次渲染重复构造）。 */
let cssCache = null
export function styleText() {
  if (cssCache === null) cssCache = styleCss()
  return cssCache
}

/**
 * 把样式表作为 React 元素渲染进组件树 —— 宿主 UI 插件规范认可的做法，
 * 组件卸载即自动移除；不依赖宿主的 styles 服务（该服务在 Web 宿主里并不存在）。
 */
export function StyleTag() {
  return h('style', { 'data-plugin-css': STYLE_ID }, styleText())
}

/**
 * 兜底：直接贴一份到 document.head（宿主自带插件 dsh-free-search / dsh-ops 都是这个路子），
 * 按 data-plugin-css 去重，重复调用无副作用。
 * 这样即使面板 / 设置页还没渲染过，样式也已经生效。
 */
export function ensureGlobalStyle() {
  try {
    if (typeof document === 'undefined' || !document.head) return null
    const selector = 'style[data-plugin-css="' + STYLE_ID + '"]'
    if (document.head.querySelector(selector) !== null) return null
    const tag = document.createElement('style')
    tag.setAttribute('data-plugin-css', STYLE_ID)
    tag.textContent = styleText()
    document.head.appendChild(tag)
    return tag
  } catch (error) {
    void error
    return null
  }
}

/** 移除 ensureGlobalStyle() 贴上的那一份（插件卸载时调用）。 */
export function dropGlobalStyle(tag) {
  try {
    if (tag && tag.parentNode) tag.parentNode.removeChild(tag)
  } catch (error) {
    void error
  }
}

/** 标题 + 副标题 + 右侧关闭按钮；size = 'lg' 用于设置页（对齐宿主的 18px 区块标题）。 */
export function PanelHead({ title, subtitle, onClose, closeLabel, size }) {
  return h('div', { className: 'dsh-me-head', 'data-size': size },
    h('div', { className: 'dsh-me-headtext' },
      h('h2', { className: 'dsh-me-title' }, title),
      subtitle ? h('p', { className: 'dsh-me-sub' }, subtitle) : null,
    ),
    onClose
      ? h('button', {
        type: 'button',
        className: 'dsh-me-iconbtn',
        title: closeLabel,
        'aria-label': closeLabel,
        onClick: onClose,
      }, '\u00d7')
      : null,
  )
}

/** 小图标按钮（26x26）。 */
export function IconButton({ children, onClick, title, disabled }) {
  return h('button', {
    type: 'button',
    className: 'dsh-me-iconbtn',
    title,
    'aria-label': title,
    disabled: disabled === true,
    onClick: typeof onClick === 'function' ? onClick : undefined,
  }, children)
}

/** 一段提示文本；kind = note | ok | warn | error 决定圆点与底色。 */
export function Notice({ kind = 'note', children }) {
  if (children === undefined || children === null || children === '') return null
  return h('p', { className: 'dsh-me-notice', 'data-kind': kind },
    h('span', { className: 'dsh-me-noticedot' }),
    h('span', { className: 'dsh-me-noticetext' }, children),
  )
}

/** 一行「标签 + 值」。 */
export function Field({ label, value, mono }) {
  const text = value === undefined || value === null || value === '' ? '\u2014' : String(value)
  return h('div', { className: 'dsh-me-field' },
    h('span', { className: 'dsh-me-fieldlabel' }, label),
    h('span', { className: mono ? 'dsh-me-fieldvalue dsh-me-code' : 'dsh-me-fieldvalue' }, text),
  )
}

/** 卡片容器；tone = warn | error 时描边换成状态色。 */
export function Card({ children, tone }) {
  return h('div', { className: 'dsh-me-card', 'data-tone': tone }, children)
}

/** 分组：小标题（可带右侧操作）+ 内容。 */
export function Section({ title, action, children }) {
  return h('section', { className: 'dsh-me-section' },
    title
      ? h('div', { className: 'dsh-me-sectionhead' },
        h('span', { className: 'dsh-me-sectiontitle' }, title),
        action || null,
      )
      : null,
    children,
  )
}

/** 分段页签；options 为 [{ value, label }]。 */
export function Tabs({ value, options, onChange }) {
  const items = Array.isArray(options) ? options : []
  return h('div', { className: 'dsh-me-tabs', role: 'tablist' },
    items.map(item => h('button', {
      key: String(item.value),
      type: 'button',
      role: 'tab',
      className: 'dsh-me-tab',
      'data-active': item.value === value ? 'true' : 'false',
      'aria-selected': item.value === value ? 'true' : 'false',
      onClick: () => { if (typeof onChange === 'function') onChange(item.value) },
    }, item.label)),
  )
}

/** 状态徽标；tone = ok | warn | error | idle。 */
export function Badge({ children, tone }) {
  return h('span', { className: 'dsh-me-badge', 'data-tone': tone }, children)
}

/** 空状态：图标 + 标题 + 说明。 */
export function EmptyState({ title, hint, icon }) {
  return h('div', { className: 'dsh-me-empty' },
    icon ? h('span', { className: 'dsh-me-emptyicon' }, icon) : null,
    title ? h('div', { className: 'dsh-me-emptytitle' }, title) : null,
    hint ? h('div', { className: 'dsh-me-emptydesc' }, hint) : null,
  )
}

/** 下拉框；options 为 [{ value, label, disabled?, hint? }]。 */
export function Select({ label, value, options, onChange, disabled, hint }) {
  const items = Array.isArray(options) ? options : []
  return h('label', { className: 'dsh-me-control' },
    label ? h('span', { className: 'dsh-me-controllabel' }, label) : null,
    h('span', { className: 'dsh-me-selectwrap' },
      h('select', {
        className: 'dsh-me-select',
        value: value === undefined || value === null ? '' : String(value),
        disabled: disabled === true,
        onChange(event) {
          if (typeof onChange === 'function') onChange(event.target.value)
        },
      },
      items.map(option => h('option', {
        key: String(option.value),
        value: String(option.value),
        disabled: option.disabled === true,
        title: option.hint,
      }, option.label)),
      ),
    ),
    hint ? h('span', { className: 'dsh-me-hint' }, hint) : null,
  )
}

/** 单行输入。 */
export function TextField({ label, value, onChange, placeholder, hint, disabled, mono }) {
  return h('label', { className: 'dsh-me-control' },
    label ? h('span', { className: 'dsh-me-controllabel' }, label) : null,
    h('input', {
      className: mono ? 'dsh-me-input dsh-me-code' : 'dsh-me-input',
      type: 'text',
      value: value === undefined || value === null ? '' : String(value),
      placeholder,
      disabled: disabled === true,
      onChange(event) {
        if (typeof onChange === 'function') onChange(event.target.value)
      },
    }),
    hint ? h('span', { className: 'dsh-me-hint' }, hint) : null,
  )
}

/** 多行输入。 */
export function TextArea({ label, value, onChange, placeholder, hint, disabled }) {
  return h('label', { className: 'dsh-me-control' },
    label ? h('span', { className: 'dsh-me-controllabel' }, label) : null,
    h('textarea', {
      className: 'dsh-me-textarea',
      value: value === undefined || value === null ? '' : String(value),
      placeholder,
      disabled: disabled === true,
      onChange(event) {
        if (typeof onChange === 'function') onChange(event.target.value)
      },
    }),
    hint ? h('span', { className: 'dsh-me-hint' }, hint) : null,
  )
}

/** 开关行：文案在左、开关在右。 */
export function Toggle({ label, checked, onChange, disabled, hint, title }) {
  return h('label', {
    className: 'dsh-me-toggle',
    title,
    'data-disabled': disabled === true ? 'true' : 'false',
  },
  h('span', { className: 'dsh-me-toggletext' },
    h('span', { className: 'dsh-me-togglelabel' }, label),
    hint ? h('span', { className: 'dsh-me-togglehint' }, hint) : null,
  ),
  h('input', {
    className: 'dsh-me-switch',
    type: 'checkbox',
    checked: checked === true,
    disabled: disabled === true,
    onChange(event) {
      if (typeof onChange === 'function') onChange(event.target.checked)
    },
  }),
  )
}

/** 按钮；variant = primary | danger | ghost，size = md | sm。 */
export function Button({ children, onClick, disabled, variant, size, title, type }) {
  return h('button', {
    type: type || 'button',
    className: 'dsh-me-button',
    'data-variant': variant || undefined,
    'data-size': size || undefined,
    disabled: disabled === true,
    title,
    onClick: typeof onClick === 'function' ? onClick : undefined,
  }, children)
}

/** 七步进度列表；items 为 [{ key, label, state, detail? }]。 */
export function StepList({ items }) {
  const list = Array.isArray(items) ? items : []
  return h('ul', { className: 'dsh-me-steps' },
    list.map(item => h('li', { key: item.key, className: 'dsh-me-step', 'data-state': item.state },
      h('span', { className: 'dsh-me-stepdot' },
        item.state === 'done' ? '\u2713' : item.state === 'failed' ? '\u2715' : ''),
      h('span', { className: 'dsh-me-steptext' },
        h('span', null, item.label),
        item.detail ? h('span', { className: 'dsh-me-dim' }, item.detail) : null,
      ),
    )),
  )
}

/** 时间戳格式化（YYYY-MM-DD HH:mm:ss）。 */
export function formatTime(value) {
  if (value === undefined || value === null || value === '') return '\u2014'
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = n => String(n).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
}

/** 毫秒时长格式化。 */
export function formatElapsed(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '\u2014'
  if (ms < 1000) return ms + ' ms'
  const seconds = ms / 1000
  if (seconds < 60) return seconds.toFixed(1) + ' 秒'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds - minutes * 60)
  return minutes + ' 分 ' + rest + ' 秒'
}

/** 会话 ID 短显示。 */
export function shortSessionId(value) {
  const text = String(value === undefined || value === null ? '' : value)
  if (text === '') return '\u2014'
  const tail = text.replace(/^session-/, '')
  return tail.length > 10 ? tail.slice(0, 10) : tail
}
