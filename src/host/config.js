/**
 * Config schema 与默认值。宿主在加载插件行时用 `static Config` 校验 config 字段，
 * 并把校验后的对象作为 `apply(ctx, config)` 的第二个参数传进来。
 *
 * 全部字段都是「非 volatile」：改设置会让插件 apply 重建（宿主行为）。
 * 因此切换快照与迁移台账必须落盘，并在 apply 启动时读回（见 snapshot.js / ledger.js）。
 */
import z from '@deepseek-ai/schemastery'
import { absoluteFrom, fallbackDataRoot } from './util.js'

/** 默认值集中在这一处，patch / 设置页 / 恢复默认都从这里取。 */
export const DEFAULTS = {
  /** 空字符串 = 取运行时默认模式（agentPresets.defaultId）。 */
  defaultMode: '',
  deleteOldSession: true,
  enableTeam: false,
  /** 空字符串 = `<cwd>/.dsh/mode-exchange`。 */
  exportDir: '',
  keepExportCopy: true,
  confirmBeforeMigrate: true,
}

export const Config = z.object({
  defaultMode: z.string()
    .description('默认目标模式；留空表示使用运行时默认模式。')
    .default(DEFAULTS.defaultMode),
  deleteOldSession: z.boolean()
    .description('迁移时默认是否归档旧会话。')
    .default(DEFAULTS.deleteOldSession),
  enableTeam: z.boolean()
    .description('迁移时默认是否对新会话启用智能体团队协作。')
    .default(DEFAULTS.enableTeam),
  exportDir: z.string()
    .description('日志导出根目录；留空表示 <工作目录>/.dsh/mode-exchange。')
    .default(DEFAULTS.exportDir),
  keepExportCopy: z.boolean()
    .description('是否保留导出的日志副本（关闭后成功迁移会删除导出文件）。')
    .default(DEFAULTS.keepExportCopy),
  confirmBeforeMigrate: z.boolean()
    .description('迁移前是否强制确认；关闭后归档旧会话将不再询问。')
    .default(DEFAULTS.confirmBeforeMigrate),
})

/**
 * 把可能不完整的 config 补成完整形态。
 * 宿主传来的 config 一般已经过 schema 校验，但命令与路由可能拿到部分对象。
 * @param {Partial<import('../../types/index.d.ts').ModeExchangeConfig> | undefined} config
 * @returns {import('../../types/index.d.ts').ModeExchangeConfig}
 */
export function normalizeConfig(config) {
  const source = config ?? {}
  return {
    defaultMode: typeof source.defaultMode === 'string' ? source.defaultMode : DEFAULTS.defaultMode,
    deleteOldSession: typeof source.deleteOldSession === 'boolean' ? source.deleteOldSession : DEFAULTS.deleteOldSession,
    enableTeam: typeof source.enableTeam === 'boolean' ? source.enableTeam : DEFAULTS.enableTeam,
    exportDir: typeof source.exportDir === 'string' ? source.exportDir : DEFAULTS.exportDir,
    keepExportCopy: typeof source.keepExportCopy === 'boolean' ? source.keepExportCopy : DEFAULTS.keepExportCopy,
    confirmBeforeMigrate: typeof source.confirmBeforeMigrate === 'boolean'
      ? source.confirmBeforeMigrate
      : DEFAULTS.confirmBeforeMigrate,
  }
}

/**
 * 计算数据根目录。
 * 顺序：config.exportDir（绝对或相对 cwd）→ `<cwd>/.dsh/mode-exchange` → 兜底目录。
 * @param {import('../../types/index.d.ts').ModeExchangeConfig} config
 * @param {string | undefined} cwd 会话/工作区的工作目录
 * @returns {string}
 */
export function dataRoot(config, cwd) {
  if (typeof config.exportDir === 'string' && config.exportDir.length > 0) {
    return absoluteFrom(config.exportDir, cwd ?? process.cwd())
  }
  if (typeof cwd === 'string' && cwd.length > 0) {
    return absoluteFrom('.dsh/mode-exchange', cwd)
  }
  return fallbackDataRoot()
}

/**
 * 数据根目录下的各子目录约定（全部由 dataRoot 派生，便于自定义导出口径）。
 * @param {string} root
 */
export function layout(root) {
  return {
    root,
    exports: absoluteFrom('exports', root),
    backups: absoluteFrom('backups', root),
    reports: absoluteFrom('reports', root),
    migrations: absoluteFrom('migrations', root),
    state: absoluteFrom('state', root),
    switchesFile: absoluteFrom('state/switches.json', root),
    jobsFile: absoluteFrom('state/jobs.json', root),
  }
}
