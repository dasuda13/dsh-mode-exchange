/**
 * dsh-mode-exchange 客户端产物 —— 由 scripts/build-client.mjs 生成，请勿手工编辑。
 * 源文件：src/client/{i18n.js, ui.js, api.js, store.js, panel.js, settings.js, entry.js}。
 * 生成时间：构建时写入，不参与逻辑；如需重新生成请运行 `node scripts/build-client.mjs`。
 */
window.__ModuleLoader__.load({
  id: "dsh-mode-exchange",
  factory: function factory(require) {
    var module = { exports: {} };
    var exports = module.exports;
    'use strict';
/* ---- i18n.js ---- */
const __mod_i18n = (() => {
/**
 * 客户端文案表。所有面向用户的文字都在这里集中管理，并提供 t() 取值函数。
 *
 * 说明：宿主推荐通过 Client locale 服务注册文案，但该服务的 bind() 返回结构
 * 未在公开契约中固定，因此这里以本文件的字典作为唯一事实来源，同时在
 * entry.js 里尽力把同一份字典注册进 locale 服务（注册失败只记日志，不影响界面）。
 */

const NS = 'mode-exchange'

const ZH = {
  'panel.title': '模式迁移',
  'panel.subtitle': '切换当前会话的 Agent 模式，或迁移到新模式重建会话',
  'panel.close': '收起面板',
  'panel.tab.switch': '模式切换',
  'panel.tab.migrate': '迁移重建',
  'panel.tab.history': '迁移历史',

  'common.loading': '加载中…',
  'common.refresh': '刷新',
  'common.cancel': '取消',
  'common.confirm': '确认',
  'common.close': '关闭',
  'common.copy': '复制',
  'common.copied': '已复制',
  'common.none': '无',
  'common.unknown': '未知',
  'common.yes': '是',
  'common.no': '否',
  'common.working': '处理中…',
  'common.elapsed': '已耗时 {value}',

  'session.current': '当前会话',
  'session.mode': '生效模式',
  'session.modeFallback': '（未记录）',
  'session.switchable': '可切换',
  'session.notSwitchable': '不可切换',
  'session.notSwitchableReason': '原因：{reason}',

  'switch.statusTitle': '当前会话状态',
  'switch.heading': '运行时模式切换',
  'switch.softNotice': '说明：这是「软切换」——工具集在运行时按会话重新限制，系统提示词被替换；宿主的插件装配不会重建。',
  'switch.target': '目标模式',
  'switch.apply': '应用切换',
  'switch.applying': '正在切换…',
  'switch.revert': '回退到切换前',
  'switch.reverting': '正在回退…',
  'switch.snapshot': '已有切换快照',
  'switch.snapshotFrom': '切换前模式：{from}',
  'switch.snapshotTo': '切换后模式：{to}',
  'switch.snapshotAt': '时间：{at}',
  'switch.denied': '已拒绝的旧模式工具（{count} 个）：{names}',
  'switch.noneDenied': '没有需要拒绝的旧模式工具',
  'switch.selectModeFirst': '请先选择目标模式',
  'switch.sameMode': '目标模式与当前模式相同',
  'switch.success': '已切换至「{mode}」模式，工具集已变更。',
  'switch.reverted': '已回退到「{mode}」模式。',

  'migrate.heading': '迁移重建',
  'migrate.intro': '导出当前会话日志 → 以新模式创建新会话 → 把日志作为原生历史导入 → 可选启用团队协作 → 可选归档旧会话。',
  'migrate.target': '目标模式',
  'migrate.deleteOld': '完成后归档旧会话',
  'migrate.deleteOldHint': '宿主没有「删除会话」接口，此操作以「归档」实现：会话从界面隐藏并停止活动，日志文件仍保留在磁盘。',
  'migrate.team': '为新会话启用智能体团队协作',
  'migrate.teamUnsupported': '当前宿主未暴露团队协作开关，此项已禁用',
  'migrate.note': '备注（写入新会话首条上下文）',
  'migrate.notePlaceholder': '例如：从 standard 迁到 ptc，继续上一轮的调查',
  'migrate.run': '开始迁移',
  'migrate.running': '迁移进行中…',
  'migrate.confirmTitle': '确认迁移并归档旧会话？',
  'migrate.confirmBody': '即将把会话「{title}」迁移到「{mode}」模式。',
  'migrate.confirmMessages': '当前消息数：{count}',
  'migrate.confirmLog': '日志将导出到：{path}',
  'migrate.confirmIrreversible': '归档旧会话后，它不会出现在会话列表中（日志仍在磁盘，可由宿主恢复）。',
  'migrate.confirmBackup': '归档前先备份日志',
  'migrate.confirmOk': '确认迁移',
  'migrate.resumeTitle': '检测到未完成的迁移',
  'migrate.resumeBody': '上次迁移停在「{step}」这一步。可以继续执行，或放弃这次迁移记录。',
  'migrate.resumeContinue': '继续上次迁移',
  'migrate.resumeAbandon': '放弃这次记录',
  'migrate.finished': '迁移完成',
  'migrate.failed': '迁移失败',
  'migrate.cancelled': '迁移已取消',
  'migrate.step': '步骤 {index}/{total} · {name}',
  'migrate.cancel': '取消迁移',
  'migrate.source': '源会话',
  'migrate.target2': '新会话',
  'migrate.logPath': '日志路径',
  'migrate.messageCount': '消息数',
  'migrate.teamEnabled': '团队协作',
  'migrate.teamOn': '已启用',
  'migrate.teamOff': '未启用',
  'migrate.teamReason': '未启用的原因：{reason}',
  'migrate.oldArchived': '旧会话已归档',
  'migrate.oldKept': '旧会话未归档（已保留）',
  'migrate.oldReason': '说明：{reason}',
  'migrate.backupPath': '备份路径',
  'migrate.timeline': '执行时间线',
  'migrate.remaining': '剩余可手动完成的步骤',
  'migrate.openTarget': '打开新会话',
  'migrate.reportFile': '报告文件：{path}',

  'steps.export.name': '导出会话日志',
  'steps.verify.name': '校验导出文件',
  'steps.create.name': '创建新会话',
  'steps.import.name': '导入历史到新会话',
  'steps.team.name': '启用团队协作',
  'steps.archive.name': '归档旧会话',
  'steps.report.name': '生成迁移报告',

  'history.heading': '迁移历史',
  'history.empty': '还没有迁移记录',
  'history.emptyHint': '在「迁移重建」页开始一次迁移后，这里会列出历史记录与报告。',
  'history.time': '时间',
  'history.source': '源会话',
  'history.target': '新会话',
  'history.result': '结果',
  'history.action': '报告',
  'history.viewReport': '查看报告',
  'history.statusInProgress': '进行中',
  'history.statusDone': '已完成',
  'history.statusFailed': '失败',
  'history.statusCancelled': '已取消',
  'history.modeArrow': '{from} → {to}',

  'settings.title': '模式迁移',
  'settings.description': '切换与迁移的默认行为',
  'settings.defaultMode': '默认目标模式',
  'settings.defaultModeHint': '留空表示跟随宿主当前的默认模式',
  'settings.deleteOld': '默认归档旧会话',
  'settings.team': '默认启用团队协作',
  'settings.teamHint': '宿主不支持时该项不生效',
  'settings.exportDir': '日志导出目录',
  'settings.exportDirHint': '留空表示使用工作区内的 .dsh/mode-exchange',
  'settings.keepExportCopy': '保留导出日志副本',
  'settings.groupBehavior': '默认行为',
  'settings.groupExport': '导出与备份',
  'settings.groupSafety': '安全确认',
  'settings.deleteOldHint': '迁移成功并且新会话可用后，把旧会话归档',
  'settings.keepExportCopyHint': '关闭后迁移结束即删除导出的中间日志，只保留备份',
  'settings.confirmHint': '关闭后归档旧会话不再二次确认，建议保持开启',
  'settings.groupBehavior': '默认行为',
  'settings.groupExport': '导出与备份',
  'settings.groupSafety': '安全确认',
  'settings.deleteOldHint': '迁移成功并且新会话可用后，把旧会话归档',
  'settings.keepExportCopyHint': '关闭后迁移结束即删除导出的中间日志，只保留备份',
  'settings.confirmHint': '关闭后归档旧会话不再二次确认，建议保持开启',
  'settings.confirm': '迁移前强制确认',
  'settings.confirmWarn': '关闭后，归档旧会话将不再弹窗确认。确定要关闭吗？',
  'settings.save': '保存设置',
  'settings.saving': '正在保存…',
  'settings.saved': '设置已保存',
  'settings.failed': '保存失败：{reason}',
  'settings.followDefault': '跟随宿主默认',

  'error.network': '无法连接宿主：{reason}',
  'error.badResponse': '宿主返回了无法解析的响应',
  'error.unknown': '发生未知错误',
}

const EN = {
  'panel.title': 'Mode Exchange',
  'panel.subtitle': 'Switch the Agent mode of this session, or rebuild it in a new mode',
  'panel.close': 'Collapse panel',
  'panel.tab.switch': 'Switch',
  'panel.tab.migrate': 'Migrate',
  'panel.tab.history': 'History',

  'common.loading': 'Loading…',
  'common.refresh': 'Refresh',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
  'common.none': 'None',
  'common.unknown': 'Unknown',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.working': 'Working…',
  'common.elapsed': '{value} elapsed',

  'session.current': 'Current session',
  'session.mode': 'Active mode',
  'session.modeFallback': '(not recorded)',
  'session.switchable': 'Switchable',
  'session.notSwitchable': 'Not switchable',
  'session.notSwitchableReason': 'Reason: {reason}',

  'switch.statusTitle': 'Current session',
  'switch.heading': 'Runtime mode switch',
  'switch.softNotice': 'This is a soft switch: the tool set is re-restricted at runtime and the system prompt is replaced, but the host plugin composition is not rebuilt.',
  'switch.target': 'Target mode',
  'switch.apply': 'Apply switch',
  'switch.applying': 'Switching…',
  'switch.revert': 'Revert',
  'switch.reverting': 'Reverting…',
  'switch.snapshot': 'Switch snapshot',
  'switch.snapshotFrom': 'From: {from}',
  'switch.snapshotTo': 'To: {to}',
  'switch.snapshotAt': 'At: {at}',
  'switch.denied': 'Denied tools from the old mode ({count}): {names}',
  'switch.noneDenied': 'No old-mode tool needed denying',
  'switch.selectModeFirst': 'Pick a target mode first',
  'switch.sameMode': 'The target mode is already active',
  'switch.success': 'Switched to "{mode}"; the tool set changed.',
  'switch.reverted': 'Reverted to "{mode}".',

  'migrate.heading': 'Migrate & rebuild',
  'migrate.intro': 'Export this session log, create a session in the new mode, import the log as native history, optionally enable Team, optionally archive the old session.',
  'migrate.target': 'Target mode',
  'migrate.deleteOld': 'Archive the old session when done',
  'migrate.deleteOldHint': 'There is no delete-session API; this archives instead — the session leaves the UI and stops activity, and its log stays on disk.',
  'migrate.team': 'Enable Team mode for the new session',
  'migrate.teamUnsupported': 'This host exposes no Team switch, so this option is disabled',
  'migrate.note': 'Note (written as the new session first context)',
  'migrate.notePlaceholder': 'e.g. moved from standard to ptc to continue the investigation',
  'migrate.run': 'Start migration',
  'migrate.running': 'Migration running…',
  'migrate.confirmTitle': 'Migrate and archive the old session?',
  'migrate.confirmBody': 'Session "{title}" will be migrated to the "{mode}" mode.',
  'migrate.confirmMessages': 'Current message count: {count}',
  'migrate.confirmLog': 'Log will be exported to: {path}',
  'migrate.confirmIrreversible': 'Once archived, the old session no longer appears in the list (its log stays on disk and the host can restore it).',
  'migrate.confirmBackup': 'Back up the log before archiving',
  'migrate.confirmOk': 'Migrate',
  'migrate.resumeTitle': 'An unfinished migration exists',
  'migrate.resumeBody': 'The previous migration stopped at "{step}". Continue it, or drop the record.',
  'migrate.resumeContinue': 'Continue',
  'migrate.resumeAbandon': 'Drop the record',
  'migrate.finished': 'Migration finished',
  'migrate.failed': 'Migration failed',
  'migrate.cancelled': 'Migration cancelled',
  'migrate.step': 'Step {index}/{total} · {name}',
  'migrate.cancel': 'Cancel migration',
  'migrate.source': 'Source',
  'migrate.target2': 'New session',
  'migrate.logPath': 'Log path',
  'migrate.messageCount': 'Messages',
  'migrate.teamEnabled': 'Team',
  'migrate.teamOn': 'Enabled',
  'migrate.teamOff': 'Disabled',
  'migrate.teamReason': 'Not enabled because: {reason}',
  'migrate.oldArchived': 'Old session archived',
  'migrate.oldKept': 'Old session kept',
  'migrate.oldReason': 'Note: {reason}',
  'migrate.backupPath': 'Backup path',
  'migrate.timeline': 'Timeline',
  'migrate.remaining': 'Remaining manual steps',
  'migrate.openTarget': 'Open new session',
  'migrate.reportFile': 'Report file: {path}',

  'steps.export.name': 'Export session log',
  'steps.verify.name': 'Verify export',
  'steps.create.name': 'Create new session',
  'steps.import.name': 'Import history',
  'steps.team.name': 'Enable Team',
  'steps.archive.name': 'Archive old session',
  'steps.report.name': 'Write report',

  'history.heading': 'Migration history',
  'history.empty': 'No migrations yet',
  'history.emptyHint': 'Start a migration on the Migrate tab and its record and report will be listed here.',
  'history.time': 'Time',
  'history.source': 'Source',
  'history.target': 'New session',
  'history.result': 'Result',
  'history.action': 'Report',
  'history.viewReport': 'View report',
  'history.statusInProgress': 'In progress',
  'history.statusDone': 'Done',
  'history.statusFailed': 'Failed',
  'history.statusCancelled': 'Cancelled',
  'history.modeArrow': '{from} → {to}',

  'settings.title': 'Mode Exchange',
  'settings.description': 'Defaults for switching and migrating',
  'settings.defaultMode': 'Default target mode',
  'settings.defaultModeHint': 'Leave empty to follow the host default',
  'settings.deleteOld': 'Archive the old session by default',
  'settings.team': 'Enable Team by default',
  'settings.teamHint': 'Ignored when the host has no Team switch',
  'settings.exportDir': 'Log export directory',
  'settings.exportDirHint': 'Leave empty to use .dsh/mode-exchange in the workspace',
  'settings.keepExportCopy': 'Keep the exported log copy',
  'settings.groupBehavior': 'Defaults',
  'settings.groupExport': 'Export & backup',
  'settings.groupSafety': 'Safety confirmation',
  'settings.deleteOldHint': 'Archive the old session once migration succeeds and the new session is usable',
  'settings.keepExportCopyHint': 'Turn off to delete the intermediate export log after migration; only the backup is kept',
  'settings.confirmHint': 'Turn off to skip the extra confirmation when archiving; keeping it on is safer',
  'settings.confirm': 'Require confirmation before migrating',
  'settings.confirmWarn': 'When off, archiving the old session stops asking. Turn it off?',
  'settings.save': 'Save settings',
  'settings.saving': 'Saving…',
  'settings.saved': 'Settings saved',
  'settings.failed': 'Save failed: {reason}',
  'settings.followDefault': 'Follow host default',

  'error.network': 'Cannot reach the host: {reason}',
  'error.badResponse': 'The host returned an unparsable response',
  'error.unknown': 'Unexpected error',
}

const DICTS = { zh: ZH, en: EN }

let current = ZH

/** 选择语言；未知语言回退中文。 */
function setLocale(language) {
  const key = String(language || '').toLowerCase()
  current = DICTS[key.split('-')[0]] || ZH
  return current
}

/** 把同一份字典注册进 Client locale 服务；失败不抛错。 */
function registerLocale(ctx) {
  try {
    const locale = ctx.get('locale')
    if (locale && typeof locale.register === 'function') {
      locale.register(NS, { zh: ZH, en: EN })
    }
  } catch (error) {
    // 文案仍有本地字典兜底，注册失败只降级不报错。
    void error
  }
}

/** 取文案；缺失时回退中文再回退 key。 */
function t(key, vars) {
  let text = current[key] || ZH[key] || key
  if (vars === undefined) return text
  for (const [name, value] of Object.entries(vars)) {
    text = text.split('{' + name + '}').join(String(value))
  }
  return text
}

  return {
    NS,
    ZH,
    EN,
    DICTS,
    setLocale,
    registerLocale,
    t,
  };
})();

/* ---- ui.js ---- */
const __mod_ui = (() => {
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

const THEME = {
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
function bindUiReact(React) {
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
function styleCss() {
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
function styleText() {
  if (cssCache === null) cssCache = styleCss()
  return cssCache
}

/**
 * 把样式表作为 React 元素渲染进组件树 —— 宿主 UI 插件规范认可的做法，
 * 组件卸载即自动移除；不依赖宿主的 styles 服务（该服务在 Web 宿主里并不存在）。
 */
function StyleTag() {
  return h('style', { 'data-plugin-css': STYLE_ID }, styleText())
}

/**
 * 兜底：直接贴一份到 document.head（宿主自带插件 dsh-free-search / dsh-ops 都是这个路子），
 * 按 data-plugin-css 去重，重复调用无副作用。
 * 这样即使面板 / 设置页还没渲染过，样式也已经生效。
 */
function ensureGlobalStyle() {
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
function dropGlobalStyle(tag) {
  try {
    if (tag && tag.parentNode) tag.parentNode.removeChild(tag)
  } catch (error) {
    void error
  }
}

/** 标题 + 副标题 + 右侧关闭按钮；size = 'lg' 用于设置页（对齐宿主的 18px 区块标题）。 */
function PanelHead({ title, subtitle, onClose, closeLabel, size }) {
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
function IconButton({ children, onClick, title, disabled }) {
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
function Notice({ kind = 'note', children }) {
  if (children === undefined || children === null || children === '') return null
  return h('p', { className: 'dsh-me-notice', 'data-kind': kind },
    h('span', { className: 'dsh-me-noticedot' }),
    h('span', { className: 'dsh-me-noticetext' }, children),
  )
}

/** 一行「标签 + 值」。 */
function Field({ label, value, mono }) {
  const text = value === undefined || value === null || value === '' ? '\u2014' : String(value)
  return h('div', { className: 'dsh-me-field' },
    h('span', { className: 'dsh-me-fieldlabel' }, label),
    h('span', { className: mono ? 'dsh-me-fieldvalue dsh-me-code' : 'dsh-me-fieldvalue' }, text),
  )
}

/** 卡片容器；tone = warn | error 时描边换成状态色。 */
function Card({ children, tone }) {
  return h('div', { className: 'dsh-me-card', 'data-tone': tone }, children)
}

/** 分组：小标题（可带右侧操作）+ 内容。 */
function Section({ title, action, children }) {
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
function Tabs({ value, options, onChange }) {
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
function Badge({ children, tone }) {
  return h('span', { className: 'dsh-me-badge', 'data-tone': tone }, children)
}

/** 空状态：图标 + 标题 + 说明。 */
function EmptyState({ title, hint, icon }) {
  return h('div', { className: 'dsh-me-empty' },
    icon ? h('span', { className: 'dsh-me-emptyicon' }, icon) : null,
    title ? h('div', { className: 'dsh-me-emptytitle' }, title) : null,
    hint ? h('div', { className: 'dsh-me-emptydesc' }, hint) : null,
  )
}

/** 下拉框；options 为 [{ value, label, disabled?, hint? }]。 */
function Select({ label, value, options, onChange, disabled, hint }) {
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
function TextField({ label, value, onChange, placeholder, hint, disabled, mono }) {
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
function TextArea({ label, value, onChange, placeholder, hint, disabled }) {
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
function Toggle({ label, checked, onChange, disabled, hint, title }) {
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
function Button({ children, onClick, disabled, variant, size, title, type }) {
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
function StepList({ items }) {
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
function formatTime(value) {
  if (value === undefined || value === null || value === '') return '\u2014'
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = n => String(n).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
}

/** 毫秒时长格式化。 */
function formatElapsed(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '\u2014'
  if (ms < 1000) return ms + ' ms'
  const seconds = ms / 1000
  if (seconds < 60) return seconds.toFixed(1) + ' 秒'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds - minutes * 60)
  return minutes + ' 分 ' + rest + ' 秒'
}

/** 会话 ID 短显示。 */
function shortSessionId(value) {
  const text = String(value === undefined || value === null ? '' : value)
  if (text === '') return '\u2014'
  const tail = text.replace(/^session-/, '')
  return tail.length > 10 ? tail.slice(0, 10) : tail
}

  return {
    THEME,
    bindUiReact,
    styleCss,
    styleText,
    StyleTag,
    ensureGlobalStyle,
    dropGlobalStyle,
    PanelHead,
    IconButton,
    Notice,
    Field,
    Card,
    Section,
    Tabs,
    Badge,
    EmptyState,
    Select,
    TextField,
    TextArea,
    Toggle,
    Button,
    StepList,
    formatTime,
    formatElapsed,
    shortSessionId,
  };
})();

/* ---- api.js ---- */
const __mod_api = (() => {
/**
 * 客户端到宿主的 HTTP 通道封装。
 *
 * 宿主在 src/host/routes.js 里用 connection.fetch.register() 注册同一个前缀下的
 * 固定路径，返回 { ok: true, value } 或 { ok: false, error: { code, message } }。
 */

const ROUTE_PREFIX = '/api/mode-exchange'

const HEADERS = { 'content-type': 'application/json; charset=utf-8' }

/** 解析响应信封；无法解析时抛出带中文说明的错误。 */
async function parseEnvelope(response, t) {
  let body
  try {
    body = await response.json()
  } catch {
    throw new Error(t('error.badResponse'))
  }
  if (body && body.ok === true) return body.value
  const message = body && body.error && body.error.message
    ? String(body.error.message)
    : t('error.badResponse')
  const error = new Error(message)
  error.code = body && body.error ? body.error.code : undefined
  throw error
}

/** 发起一次调用。path 不带前缀，由本文件补上。 */
async function call(t, method, path, payload) {
  const init = {
    method,
    credentials: 'same-origin',
    headers: HEADERS,
    cache: 'no-store',
  }
  if (payload !== undefined) init.body = JSON.stringify(payload)
  let response
  try {
    response = await fetch(ROUTE_PREFIX + path, init)
  } catch (cause) {
    throw new Error(t('error.network', { reason: cause && cause.message ? cause.message : String(cause) }))
  }
  if (!response.ok && response.status !== 200) {
    // 宿主路由会自己编码业务错误；只有真正的传输层错误才走到这里。
    let text = ''
    try { text = await response.text() } catch { text = '' }
    const error = new Error(t('error.network', { reason: 'HTTP ' + response.status + (text ? ' ' + text.slice(0, 200) : '') }))
    error.status = response.status
    throw error
  }
  return parseEnvelope(response, t)
}

/** 构造 API 对象；t 是文案函数。 */
function createApi(t) {
  const query = params => {
    const entries = Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
    if (entries.length === 0) return ''
    return '?' + entries.map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value))).join('&')
  }

  return {
    /** 读取面板状态：当前模式、可切换性、模式清单、配置、能力、迁移历史。 */
    getState: sessionId => call(t, 'GET', '/state' + query({ sessionId })),
    /** 执行运行时模式切换。 */
    switchMode: (sessionId, mode) => call(t, 'POST', '/switch', { sessionId, mode }),
    /** 回退到切换前模式。 */
    revert: sessionId => call(t, 'POST', '/revert', { sessionId }),
    /** 启动迁移重建。 */
    migrate: request => call(t, 'POST', '/migrate', request),
    /** 查询迁移任务状态。 */
    jobStatus: jobId => call(t, 'GET', '/job' + query({ jobId })),
    /** 取消迁移任务。 */
    cancelJob: jobId => call(t, 'POST', '/cancel', { jobId }),
    /** 读取迁移历史。 */
    migrations: sessionId => call(t, 'GET', '/migrations' + query({ sessionId })),
    /** 读取某次迁移的报告。 */
    report: reportId => call(t, 'GET', '/report' + query({ reportId })),
    /** 仅归档旧会话（迁移最后一步的手动补救）。 */
    archiveOld: (sessionId, confirm, backup) => call(t, 'POST', '/archive-old', { sessionId, confirm, backup }),
    /** 保存插件配置。 */
    saveConfig: patch => call(t, 'POST', '/config', patch),
  }
}

  return {
    ROUTE_PREFIX,
    createApi,
  };
})();

/* ---- store.js ---- */
const __mod_store = (() => {
/**
 * 极简可观察状态容器。面板与设置页共用一份实例，保证两边开关状态同步（FR-15）。
 */

const EMPTY_STATE = {
  sessionId: null,
  loading: false,
  loaded: false,
  error: null,
  currentMode: null,
  switchable: false,
  blockedReason: null,
  switched: false,
  snapshot: null,
  modes: [],
  config: {},
  capabilities: { seedCreate: false, scopedRestrict: false, scopedPrompt: false, teamSwitch: false, attachSession: false, notes: [] },
  migrations: [],
  job: null,
}

function shallowEqualConfig(a, b) {
  const left = a || {}
  const right = b || {}
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if (left[key] !== right[key]) return false
  }
  return true
}

/** 创建 store；getState 返回快照，subscribe 返回退订函数。 */
function createStore() {
  let state = { ...EMPTY_STATE }
  const listeners = new Set()

  function emit() {
    for (const listener of Array.from(listeners)) {
      try {
        listener(state)
      } catch (error) {
        // 单个订阅者抛错不应影响其他订阅者。
        void error
      }
    }
  }

  return {
    getState() {
      return state
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    /** 局部更新；返回值无意义。 */
    set(patch) {
      const next = { ...state, ...patch }
      if (patch.config !== undefined && shallowEqualConfig(state.config, patch.config)) {
        next.config = state.config
      }
      state = next
      emit()
    },
    /** 整体替换（切换会话时用）。 */
    reset(sessionId) {
      state = { ...EMPTY_STATE, config: state.config, sessionId: sessionId || null }
      emit()
    },
    /** 清空错误与加载态，保留其余数据。 */
    settle(patch) {
      state = { ...state, loading: false, error: null, ...patch }
      emit()
    },
    /** 记录一次失败。 */
    fail(error) {
      state = { ...state, loading: false, error: error && error.message ? error.message : String(error) }
      emit()
    },
  }
}


  return {
    EMPTY_STATE,
    createStore,
  };
})();

/* ---- panel.js ---- */
const __mod_panel = (() => {
/**
 * 侧栏面板：模式切换 / 迁移重建 / 迁移历史 三个页签。
 * 组件通过 makePanel(React, deps) 构造，deps 提供 api、store、文案与 UI 原子。
 */

const { Notice, Field, Select, Toggle, TextArea, Button, PanelHead, StepList, Card, Section, Tabs, Badge, EmptyState, StyleTag, formatTime, formatElapsed, shortSessionId } = __mod_ui;
const STEP_KEYS = ['export', 'verify', 'create', 'import', 'team', 'archive', 'report']

function stepsOf(t, job) {
  const index = job ? Number(job.stepIndex) : -1
  const failed = job && job.status === 'failed'
  const done = job && job.status === 'done'
  return STEP_KEYS.map((key, i) => {
    let state = 'pending'
    if (done) state = 'done'
    else if (i < index) state = 'done'
    else if (i === index) state = failed ? 'failed' : 'active'
    return { key, label: t('steps.' + key + '.name'), state }
  })
}

function statusLabel(t, status) {
  if (status === 'in-progress') return t('history.statusInProgress')
  if (status === 'done') return t('history.statusDone')
  if (status === 'failed') return t('history.statusFailed')
  if (status === 'cancelled') return t('history.statusCancelled')
  return status || t('common.unknown')
}

/** 迁移状态 → 徽标色调。 */
function statusTone(status) {
  if (status === 'done') return 'ok'
  if (status === 'failed') return 'error'
  if (status === 'cancelled') return 'idle'
  return 'warn'
}

function makePanel(React, deps) {
  const h = React.createElement
  const { api, store, t } = deps

  function useStore() {
    const [snapshot, setSnapshot] = React.useState(store.getState())
    React.useEffect(() => store.subscribe(setSnapshot), [])
    return snapshot
  }

  function Panel(props) {
    const state = useStore()
    const sessionId = props.sessionId || state.sessionId
    const [tab, setTab] = React.useState('switch')
    const [target, setTarget] = React.useState('')
    const [busy, setBusy] = React.useState('')
    const [error, setError] = React.useState('')
    const [info, setInfo] = React.useState('')

    const [migrateMode, setMigrateMode] = React.useState('')
    const [deleteOld, setDeleteOld] = React.useState(true)
    const [team, setTeam] = React.useState(false)
    const [note, setNote] = React.useState('')
    const [confirming, setConfirming] = React.useState(null)
    const [backupFirst, setBackupFirst] = React.useState(true)
    const [resume, setResume] = React.useState(null)
    const [job, setJob] = React.useState(null)
    const [report, setReport] = React.useState(null)
    const [elapsed, setElapsed] = React.useState(0)

    const modeOptions = (state.modes || []).map(mode => ({
      value: mode.id,
      label: mode.name + (mode.id === state.currentMode ? '（当前）' : '') + (mode.broken ? '（不可用）' : ''),
      disabled: mode.broken === true,
      hint: mode.description || mode.id,
    }))

    // 首次进入：拉取状态，并用配置里的默认值初始化表单。
    React.useEffect(() => {
      if (!sessionId) return
      let cancelled = false
      store.set({ loading: true, sessionId })
      api.getState(sessionId)
        .then(value => {
          if (cancelled) return
          store.settle({
            sessionId: value.sessionId,
            currentMode: value.currentMode,
            switchable: value.switchable,
            blockedReason: value.blockedReason,
            switched: value.switched,
            snapshot: value.snapshot,
            modes: value.modes || [],
            config: value.config || {},
            capabilities: value.capabilities || {},
            migrations: value.migrations || [],
            loaded: true,
          })
        })
        .catch(cause => { if (!cancelled) store.fail(cause) })
      return () => { cancelled = true }
    }, [sessionId])

    // 用配置默认值填表单（只在首次或配置变化且用户没改过时）。
    React.useEffect(() => {
      const config = state.config || {}
      const fallback = config.defaultMode || state.currentMode || ''
      setTarget(previous => previous || fallback)
      setMigrateMode(previous => previous || fallback)
      if (typeof config.deleteOldSession === 'boolean') setDeleteOld(config.deleteOldSession)
      if (typeof config.enableTeam === 'boolean') setTeam(config.enableTeam && state.capabilities && state.capabilities.teamSwitch === true)
    }, [state.config, state.currentMode, state.capabilities])

    // 任务轮询：运行中每 800ms 读一次状态，同时更新耗时。
    React.useEffect(() => {
      if (!job || !job.jobId) return
      if (job.status !== 'running' && job.status !== 'pending') return
      let stopped = false
      const startedAt = Date.now()
      const tick = async () => {
        if (stopped) return
        try {
          const value = await api.jobStatus(job.jobId)
          if (stopped) return
          setJob(value)
          setElapsed(Date.now() - startedAt)
          if (value && value.report) setReport(value.report)
        } catch (cause) {
          if (!stopped) setError(cause.message || String(cause))
        }
      }
      const timer = setInterval(tick, 800)
      void tick()
      return () => { stopped = true; clearInterval(timer) }
    }, [job && job.jobId, job && job.status])

    const canSwitch = state.switchable !== false && !state.blockedReason

    async function applySwitch() {
      if (!target) { setError(t('switch.selectModeFirst')); return }
      setError(''); setInfo(''); setBusy('switch')
      try {
        const value = await api.switchMode(sessionId, target)
        store.set({
          currentMode: value.currentMode,
          switched: true,
          snapshot: value.snapshot,
        })
        setInfo(t('switch.success', { mode: value.modeName || target }))
      } catch (cause) {
        setError(cause.message || String(cause))
      } finally {
        setBusy('')
      }
    }

    async function applyRevert() {
      setError(''); setInfo(''); setBusy('revert')
      try {
        const value = await api.revert(sessionId)
        store.set({ currentMode: value.currentMode, switched: false, snapshot: null })
        setInfo(t('switch.reverted', { mode: value.modeName || value.currentMode || '' }))
      } catch (cause) {
        setError(cause.message || String(cause))
      } finally {
        setBusy('')
      }
    }

    function askMigrate() {
      if (!migrateMode) { setError(t('switch.selectModeFirst')); return }
      if (!canSwitch) { setError(t('session.notSwitchableReason', { reason: state.blockedReason || '' })); return }
      setError(''); setInfo('')
      if (state.config && state.config.confirmBeforeMigrate === false) {
        void runMigrate(true, true)
        return
      }
      setConfirming({ mode: migrateMode })
      setBackupFirst(state.config ? state.config.keepExportCopy !== false : true)
    }

    async function runMigrate(confirmed, backup) {
      setConfirming(null)
      setError(''); setInfo(''); setReport(null); setResume(null)
      setBusy('migrate')
      try {
        const request = {
          sessionId,
          mode: migrateMode,
          deleteOld: deleteOld === true,
          team: team === true,
          note: note || undefined,
          confirmDelete: deleteOld === true ? confirmed === true : undefined,
          backup: backup === true,
          resume: resume ? true : undefined,
        }
        const value = await api.migrate(request)
        if (value && value.needsResume) {
          setResume({ ledger: value.ledger || {} })
          setJob(null)
          setBusy('')
          return
        }
        if (value && value.jobId) {
          setJob({ jobId: value.jobId, status: 'running', stepIndex: 0, stepName: t('steps.export.name'), totalSteps: 7 })
          setElapsed(0)
          store.set({ job: value.jobId })
        } else {
          setInfo(t('migrate.finished'))
        }
      } catch (cause) {
        setError(cause.message || String(cause))
      } finally {
        if (!resume) setBusy('')
      }
    }

    async function cancelMigration() {
      if (!job || !job.jobId) return
      try {
        await api.cancelJob(job.jobId)
        setInfo(t('migrate.cancelled'))
      } catch (cause) {
        setError(cause.message || String(cause))
      }
    }

    async function openReport(reportId) {
      setError('')
      try {
        const value = await api.report(reportId || (report && report.jobId))
        setReport(value)
        setTab('history')
      } catch (cause) {
        setError(cause.message || String(cause))
      }
    }

    async function refreshHistory() {
      try {
        const rows = await api.migrations(sessionId)
        store.set({ migrations: rows || [] })
      } catch (cause) {
        setError(cause.message || String(cause))
      }
    }

    function openTargetSession() {
      const target_ = report && report.target && report.target.sessionId
      if (!target_) return
      try {
        const uiWorkspace = deps.ctx && typeof deps.ctx.get === 'function' ? deps.ctx.get('uiWorkspace') : null
        if (uiWorkspace && typeof uiWorkspace.openSession === 'function') {
          void uiWorkspace.openSession(target_)
          return
        }
      } catch (error) {
        void error
      }
      setError('无法自动切换会话，请从左侧会话列表手动打开 ' + target_)
    }

    const header = h(PanelHead, {
      title: t('panel.title'),
      subtitle: t('panel.subtitle'),
      onClose: typeof props.onClose === 'function' ? props.onClose : undefined,
      closeLabel: t('panel.close'),
    })

    const tabs = h(Tabs, {
      value: tab,
      onChange: setTab,
      options: [
        { value: 'switch', label: t('panel.tab.switch') },
        { value: 'migrate', label: t('panel.tab.migrate') },
        { value: 'history', label: t('panel.tab.history') },
      ],
    })

    const statusCard = h(Card, null,
      h('div', { className: 'dsh-me-row' },
        h('span', { className: 'dsh-me-label' }, t('switch.statusTitle')),
        canSwitch
          ? h(Badge, { tone: 'ok' }, t('session.switchable'))
          : h(Badge, { tone: 'warn' }, t('session.notSwitchable')),
      ),
      h('div', { className: 'dsh-me-stack-sm' },
        h(Field, { label: t('session.current'), value: shortSessionId(sessionId), mono: true }),
        h(Field, { label: t('session.mode'), value: state.currentMode || t('session.modeFallback'), mono: true }),
      ),
      canSwitch || !state.blockedReason
        ? null
        : h('p', { className: 'dsh-me-hint' }, t('session.notSwitchableReason', { reason: state.blockedReason })),
    )

    const switchTab = h('div', { className: 'dsh-me-stack' },
      statusCard,
      h(Notice, { kind: 'warn' }, t('switch.softNotice')),
      h(Section, { title: t('switch.heading') },
        h(Card, null,
          h(Select, {
            label: t('switch.target'),
            value: target,
            options: modeOptions.length > 0 ? modeOptions : [{ value: '', label: t('common.loading') }],
            onChange: setTarget,
            disabled: !canSwitch || busy !== '',
          }),
          h('div', { className: 'dsh-me-footer' },
            state.switched || state.snapshot
              ? h(Button, { onClick: applyRevert, disabled: busy !== '', variant: 'ghost' }, busy === 'revert' ? t('switch.reverting') : t('switch.revert'))
              : null,
            h(Button, {
              variant: 'primary',
              disabled: !canSwitch || busy !== '' || !target,
              onClick: applySwitch,
            }, busy === 'switch' ? t('switch.applying') : t('switch.apply')),
          ),
        ),
      ),
      state.snapshot
        ? h(Section, { title: t('switch.snapshot') },
          h(Card, null,
            h('div', { className: 'dsh-me-stack-sm' },
              h(Field, { label: t('switch.snapshotFrom'), value: state.snapshot.fromMode, mono: true }),
              h(Field, { label: t('switch.snapshotTo'), value: state.snapshot.toMode, mono: true }),
              h(Field, { label: t('switch.snapshotAt'), value: formatTime(state.snapshot.at) }),
            ),
            h('hr', { className: 'dsh-me-divider' }),
            state.snapshot.denied && state.snapshot.denied.length > 0
              ? h('p', { className: 'dsh-me-hint' }, t('switch.denied', {
                count: state.snapshot.denied.length,
                names: state.snapshot.denied.join(', '),
              }))
              : h('p', { className: 'dsh-me-hint' }, t('switch.noneDenied')),
          ),
        )
        : null,
    )

    const currentJob = job
    const running = !!(currentJob && currentJob.jobId
      && (currentJob.status === 'running' || currentJob.status === 'pending'))

    const migrateTab = h('div', { className: 'dsh-me-stack' },
      h(Notice, null, t('migrate.intro')),
      h(Section, { title: t('migrate.heading') },
        h(Card, null,
          h(Select, {
            label: t('migrate.target'),
            value: migrateMode,
            options: modeOptions.length > 0 ? modeOptions : [{ value: '', label: t('common.loading') }],
            onChange: setMigrateMode,
            disabled: busy !== '' || !canSwitch,
          }),
          h('hr', { className: 'dsh-me-divider' }),
          h('div', { className: 'dsh-me-stack-sm' },
            h(Toggle, {
              label: t('migrate.deleteOld'),
              checked: deleteOld,
              onChange: setDeleteOld,
              hint: t('migrate.deleteOldHint'),
              disabled: busy !== '',
            }),
            h(Toggle, {
              label: t('migrate.team'),
              checked: team,
              onChange: setTeam,
              disabled: busy !== '' || !(state.capabilities && state.capabilities.teamSwitch === true),
              hint: state.capabilities && state.capabilities.teamSwitch === true ? undefined : t('migrate.teamUnsupported'),
              title: state.capabilities && state.capabilities.teamSwitch === true ? undefined : t('migrate.teamUnsupported'),
            }),
          ),
          h('hr', { className: 'dsh-me-divider' }),
          h(TextArea, {
            label: t('migrate.note'),
            value: note,
            placeholder: t('migrate.notePlaceholder'),
            disabled: busy !== '',
            onChange: setNote,
          }),
          h('div', { className: 'dsh-me-footer' },
            running ? h(Button, { variant: 'danger', onClick: cancelMigration }, t('migrate.cancel')) : null,
            h(Button, {
              variant: 'primary',
              disabled: busy !== '' || !canSwitch || !migrateMode,
              onClick: askMigrate,
            }, busy === 'migrate' ? t('migrate.running') : t('migrate.run')),
          ),
        ),
      ),
      resume
        ? h(Card, { tone: 'warn' },
          h('div', { className: 'dsh-me-row' },
            h('span', { className: 'dsh-me-label' }, t('migrate.resumeTitle')),
            h(Badge, { tone: 'warn' }, t('history.statusInProgress')),
          ),
          h(Notice, { kind: 'warn' }, t('migrate.resumeBody', {
            step: (resume.ledger && resume.ledger.step !== undefined) ? String(resume.ledger.step + 1) : '?',
          })),
          h('div', { className: 'dsh-me-footer' },
            h(Button, { onClick: () => { setResume(null); setMigrateMode('') } }, t('migrate.resumeAbandon')),
            h(Button, { variant: 'primary', onClick: () => runMigrate(true, true) }, t('migrate.resumeContinue')),
          ),
        )
        : null,
      currentJob && currentJob.jobId
        ? h(Card, null,
          h('div', { className: 'dsh-me-row' },
            h('span', { className: 'dsh-me-label' }, t('migrate.step', {
              index: Number(currentJob.stepIndex || 0) + 1,
              total: currentJob.totalSteps || 7,
              name: currentJob.stepName || '',
            })),
            h(Badge, currentJob.status === 'failed'
              ? { tone: 'error' }
              : currentJob.status === 'done' ? { tone: 'ok' } : { tone: 'warn' }, statusLabel(t, currentJob.status)),
          ),
          h('p', { className: 'dsh-me-hint' }, t('common.elapsed', { value: formatElapsed(elapsed || currentJob.elapsedMs || 0) })),
          h(StepList, { items: stepsOf(t, currentJob) }),
          currentJob.message ? h(Notice, { kind: 'note' }, currentJob.message) : null,
        )
        : null,
      report ? renderReport(report) : null,
      confirming ? renderConfirm() : null,
    )

    function renderConfirm() {
      const snapshot = report || {}
      const messageCount = snapshot.source ? snapshot.source.messageCount : undefined
      return h(Card, { tone: 'warn' },
        h('div', { className: 'dsh-me-row' },
          h('span', { className: 'dsh-me-label' }, t('migrate.confirmTitle')),
          h(Badge, { tone: 'warn' }, '⚠'),
        ),
        h('p', { className: 'dsh-me-hint' }, t('migrate.confirmBody', {
          title: state.title || shortSessionId(sessionId),
          mode: confirming.mode,
        })),
        messageCount !== undefined
          ? h(Field, { label: t('migrate.confirmMessages'), value: String(messageCount) })
          : null,
        h('p', { className: 'dsh-me-hint' }, t('migrate.confirmIrreversible')),
        h('hr', { className: 'dsh-me-divider' }),
        h(Toggle, { label: t('migrate.confirmBackup'), checked: backupFirst, onChange: setBackupFirst }),
        h('div', { className: 'dsh-me-footer' },
          h(Button, { onClick: () => setConfirming(null) }, t('common.cancel')),
          h(Button, { variant: 'danger', onClick: () => runMigrate(true, backupFirst) }, t('migrate.confirmOk')),
        ),
      )
    }

    function renderReport(value) {
      const log = value.log || {}
      const oldSession = value.oldSession || {}
      const teamInfo = value.team || {}
      return h(Card, value.ok ? null : { tone: 'error' },
        h('div', { className: 'dsh-me-row' },
          h('span', { className: 'dsh-me-label' }, value.ok ? t('migrate.finished') : t('migrate.failed')),
          h(Badge, { tone: value.ok ? 'ok' : 'error' },
            oldSession.archived ? t('migrate.oldArchived') : t('migrate.oldKept')),
        ),
        h('div', { className: 'dsh-me-stack-sm' },
          value.source ? h(Field, { label: t('migrate.source'), value: shortSessionId(value.source.sessionId), mono: true }) : null,
          value.target ? h(Field, { label: t('migrate.target2'), value: shortSessionId(value.target.sessionId), mono: true }) : null,
          value.source ? h(Field, { label: t('migrate.messageCount'), value: String(value.source.messageCount) }) : null,
          h(Field, { label: t('migrate.teamEnabled'), value: teamInfo.enabled ? t('migrate.teamOn') : t('migrate.teamOff') }),
          log.path ? h(Field, { label: t('migrate.logPath'), value: log.path, mono: true }) : null,
          oldSession.backupPath ? h(Field, { label: t('migrate.backupPath'), value: oldSession.backupPath, mono: true }) : null,
        ),
        teamInfo.reason ? h(Notice, { kind: 'warn' }, t('migrate.teamReason', { reason: teamInfo.reason })) : null,
        oldSession.reason ? h(Notice, { kind: 'note' }, t('migrate.oldReason', { reason: oldSession.reason })) : null,
        value.remainingSteps && value.remainingSteps.length > 0
          ? h('div', { className: 'dsh-me-stack-sm' },
            h('span', { className: 'dsh-me-sectiontitle' }, t('migrate.remaining')),
            h('ul', { className: 'dsh-me-list' }, value.remainingSteps.map((step, i) => h('li', { key: String(i) }, step))),
          )
          : null,
        value.timeline && value.timeline.length > 0
          ? h('details', { className: 'dsh-me-details' },
            h('summary', null, t('migrate.timeline')),
            h('ul', { className: 'dsh-me-list' }, value.timeline.map((entry, i) => h('li', { key: String(i), className: 'dsh-me-dim' },
              formatTime(entry.at) + ' · ' + (entry.ok ? '✓ ' : '✗ ') + (entry.detail || '')))),
          )
          : null,
        value.jobId ? h('p', { className: 'dsh-me-hint' }, t('migrate.reportFile', { path: String(value.jobId) })) : null,
        value.target && value.target.sessionId
          ? h('div', { className: 'dsh-me-footer' },
            h(Button, { onClick: openTargetSession, variant: 'primary' }, t('migrate.openTarget')))
          : null,
      )
    }

    const rows = state.migrations || []

    const historyTab = h('div', { className: 'dsh-me-stack' },
      h(Section, {
        title: t('history.heading'),
        action: h(Button, {
          onClick: refreshHistory,
          variant: 'ghost',
          size: 'sm',
          disabled: state.loading === true,
        }, t('common.refresh')),
      },
      rows.length === 0
        ? h(EmptyState, {
          title: t('history.empty'),
          hint: t('history.emptyHint'),
          icon: h('svg', {
            width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none',
            stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round',
          },
            h('circle', { cx: 12, cy: 12, r: 8.4 }),
            h('path', { d: 'M12 7.6v4.9l3.1 1.8' }),
          ),
        })
        : h('div', { className: 'dsh-me-history' },
          rows.map(row => h('div', { key: row.jobId || row.sourceSessionId, className: 'dsh-me-historyrow' },
            h('div', { className: 'dsh-me-historyhead' },
              h('span', { className: 'dsh-me-historytitle' }, row.sourceTitle || shortSessionId(row.sourceSessionId)),
              h(Badge, { tone: statusTone(row.status) }, statusLabel(t, row.status)),
            ),
            h('div', { className: 'dsh-me-historymeta' },
              h('span', { className: 'dsh-me-code' }, t('history.modeArrow', {
                from: row.sourceMode || '?',
                to: row.targetMode || '?',
              })),
              h('span', null, '·'),
              h('span', { className: 'dsh-me-code' }, shortSessionId(row.targetSessionId)),
              h('span', null, '·'),
              h('span', null, formatTime(row.ts || row.updatedAt)),
            ),
            h('div', { className: 'dsh-me-footer' },
              h(Button, {
                onClick: () => openReport(row.jobId || row.reportId),
                variant: 'ghost',
                size: 'sm',
              }, t('history.viewReport')),
            ),
          )),
        ),
      ),
      report ? renderReport(report) : null,
    )

    return h('div', { className: 'dsh-me-root' },
      h(StyleTag, { key: 'style' }),
      header,
      tabs,
      error ? h(Notice, { kind: 'error' }, error) : null,
      info ? h(Notice, { kind: 'ok' }, info) : null,
      state.loading && !state.loaded ? h(Notice, null, t('common.loading')) : null,
      tab === 'switch' ? switchTab : null,
      tab === 'migrate' ? migrateTab : null,
      tab === 'history' ? historyTab : null,
    )
  }

  return Panel
}

  return {
    makePanel,
  };
})();

/* ---- settings.js ---- */
const __mod_settings = (() => {
/**
 * 插件设置页（注册到 settings.section）。六个配置项与侧栏面板共用同一份 store，
 * 保存后立即回写 store，保证两边开关状态同步（FR-15）。
 */

const { Notice, Select, Toggle, TextField, Button, Card, Section, PanelHead, StyleTag } = __mod_ui;
const FIELDS = ['defaultMode', 'deleteOldSession', 'enableTeam', 'exportDir', 'keepExportCopy', 'confirmBeforeMigrate']

function pickConfig(source) {
  const next = {}
  for (const key of FIELDS) {
    if (source && source[key] !== undefined) next[key] = source[key]
  }
  return next
}

function makeSettings(React, deps) {
  const h = React.createElement
  const { api, store, t } = deps

  function useStore() {
    const [snapshot, setSnapshot] = React.useState(store.getState())
    React.useEffect(() => store.subscribe(setSnapshot), [])
    return snapshot
  }

  function Settings(props) {
    const state = useStore()
    const [draft, setDraft] = React.useState(() => pickConfig(state.config))
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState('')
    const [saved, setSaved] = React.useState(false)
    const [confirmWarn, setConfirmWarn] = React.useState(null)
    const [dirty, setDirty] = React.useState(false)

    // 配置从宿主读回后同步到草稿（用户未改动时）。
    React.useEffect(() => {
      if (!dirty) setDraft(pickConfig(state.config))
    }, [state.config, dirty])

    const modeOptions = [{ value: '', label: t('settings.followDefault') }].concat(
      (state.modes || []).map(mode => ({ value: mode.id, label: mode.name || mode.id, disabled: mode.broken === true })),
    )

    function patch(key, value) {
      setDirty(true)
      setSaved(false)
      setDraft(previous => ({ ...previous, [key]: value }))
    }

    async function save() {
      setBusy(true); setError(''); setSaved(false)
      try {
        const payload = { ...draft }
        if (confirmWarn !== null) payload.disableConfirmAcknowledged = confirmWarn === 'yes'
        const value = await api.saveConfig(payload)
        const nextConfig = (value && value.config) || draft
        store.set({ config: nextConfig })
        setDraft(pickConfig(nextConfig))
        setDirty(false)
        setSaved(true)
        setConfirmWarn(null)
      } catch (cause) {
        setError(t('settings.failed', { reason: cause && cause.message ? cause.message : String(cause) }))
      } finally {
        setBusy(false)
      }
    }

    function onConfirmToggle(checked) {
      if (checked === false) {
        // 关闭「迁移前强制确认」需要二次警告（FR-14）。
        setConfirmWarn('ask')
        return
      }
      setConfirmWarn(null)
      patch('confirmBeforeMigrate', true)
    }

    const teamSupported = state.capabilities && state.capabilities.teamSwitch === true

    return h('div', { className: 'dsh-me-root', 'data-flat': 'true' },
      h(StyleTag, { key: 'style' }),
      h(PanelHead, {
        title: t('settings.title'),
        subtitle: t('settings.description'),
        size: 'lg',
      }),

      error ? h(Notice, { kind: 'error' }, error) : null,
      saved ? h(Notice, { kind: 'ok' }, t('settings.saved')) : null,

      h(Section, { title: t('settings.groupBehavior') },
        h(Card, null,
          h(Select, {
            label: t('settings.defaultMode'),
            value: draft.defaultMode || '',
            options: modeOptions,
            onChange: value => patch('defaultMode', value),
            hint: t('settings.defaultModeHint'),
          }),
          h('hr', { className: 'dsh-me-divider' }),
          h('div', { className: 'dsh-me-stack-sm' },
            h(Toggle, {
              label: t('settings.deleteOld'),
              hint: t('settings.deleteOldHint'),
              checked: draft.deleteOldSession !== false,
              onChange: value => patch('deleteOldSession', value),
            }),
            h(Toggle, {
              label: t('settings.team'),
              checked: draft.enableTeam === true,
              onChange: value => patch('enableTeam', value),
              disabled: !teamSupported,
              hint: teamSupported ? t('settings.teamHint') : t('migrate.teamUnsupported'),
            }),
          ),
        ),
      ),

      h(Section, { title: t('settings.groupExport') },
        h(Card, null,
          h(TextField, {
            label: t('settings.exportDir'),
            value: draft.exportDir || '',
            placeholder: '.dsh/mode-exchange',
            onChange: value => patch('exportDir', value),
            hint: t('settings.exportDirHint'),
            mono: true,
          }),
          h('hr', { className: 'dsh-me-divider' }),
          h(Toggle, {
            label: t('settings.keepExportCopy'),
            hint: t('settings.keepExportCopyHint'),
            checked: draft.keepExportCopy !== false,
            onChange: value => patch('keepExportCopy', value),
          }),
        ),
      ),

      h(Section, { title: t('settings.groupSafety') },
        confirmWarn === null
          ? h(Card, null,
            h(Toggle, {
              label: t('settings.confirm'),
              hint: t('settings.confirmHint'),
              checked: draft.confirmBeforeMigrate !== false,
              onChange: onConfirmToggle,
            }),
          )
          : h(Card, { tone: 'warn' },
            h(Notice, { kind: 'warn' }, t('settings.confirmWarn')),
            h('div', { className: 'dsh-me-footer' },
              h(Button, { onClick: () => setConfirmWarn(null) }, t('common.cancel')),
              h(Button, {
                variant: 'danger',
                onClick: () => { setConfirmWarn('yes'); patch('confirmBeforeMigrate', false) },
              }, t('common.confirm')),
            ),
          ),
      ),

      h('div', { className: 'dsh-me-footer' },
        typeof props.close === 'function' ? h(Button, { onClick: props.close }, t('common.close')) : null,
        h(Button, { variant: 'primary', onClick: save, disabled: busy }, busy ? t('settings.saving') : t('settings.save')),
      ),
    )
  }

  return Settings
}

/** 设置页图标（settings.section.icon）。size 由宿主给出，active 表示当前选中。 */
function makeSettingsIcon(React) {
  const h = React.createElement
  return function SettingsIcon(props) {
    const size = props && typeof props.size === 'number' ? props.size : 16
    const active = props && props.active === true
    return h('svg', {
      viewBox: '0 0 16 16',
      width: size,
      height: size,
      'aria-hidden': true,
      style: { display: 'block', opacity: active ? 1 : 0.78 },
    },
    h('path', {
      d: 'M2.5 4.5h8M13.5 4.5h0M2.5 11.5h2M7.5 11.5h6',
      stroke: 'currentColor',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      fill: 'none',
    }),
    h('circle', { cx: 11.5, cy: 4.5, r: 1.8, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 }),
    h('circle', { cx: 5.5, cy: 11.5, r: 1.8, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 }),
    )
  }
}

  return {
    makeSettings,
    makeSettingsIcon,
  };
})();

/* ---- entry.js ---- */
const __mod_entry = (() => {
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

const { setLocale, registerLocale, t } = __mod_i18n;
const { ensureGlobalStyle, dropGlobalStyle, bindUiReact } = __mod_ui;
const { createApi } = __mod_api;
const { createStore } = __mod_store;
const { makePanel } = __mod_panel;
const { makeSettings, makeSettingsIcon } = __mod_settings;
const PANEL_KEY = 'mode-exchange'
const SETTINGS_ID = 'mode-exchange'
const PANEL_ENTRY_ID = 'mode-exchange'

/**
 * 从 sessions 服务的列表快照里找出「当前主视图占用的会话」。
 * 依据：SessionSummary.retainedBy.mainView > 0 —— 这是宿主自己判定「当前会话」的口径。
 * 取不到返回 null，面板会提示用户先打开一个会话。
 */
function mainViewSessionId(sessions) {
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
function startModeExchangeClient(require) {
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

  return {
    PANEL_KEY,
    mainViewSessionId,
    startModeExchangeClient,
  };
})();

    Object.assign(module.exports, __mod_entry);
    return module.exports.startModeExchangeClient(require);
  },
});
