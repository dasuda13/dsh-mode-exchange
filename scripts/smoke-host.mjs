// 宿主纯逻辑冒烟：util / config / ledger（不依赖任何 ctx 服务）。
// 用法：node scripts/smoke-host.mjs
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const base = new URL('../src/host/', import.meta.url).href
const util = await import(`${base}util.js`)
const config = await import(`${base}config.js`)
const ledger = await import(`${base}ledger.js`)

const checks = []
const check = (name, ok, detail = '') => checks.push({ name, ok, detail })

// ---------------------------------------------------------------- util
{
  const parsed = util.parseArgs('--mode ptc --delete-old false --note "切到 PTC 继续"')
  check('parseArgs 取到 --mode', parsed.flags.mode === 'ptc', String(parsed.flags.mode))
  check('parseArgs 取到 --delete-old', parsed.flags['delete-old'] === 'false', String(parsed.flags['delete-old']))
  check('parseArgs 保留带空格的引号值', parsed.flags.note === '切到 PTC 继续', JSON.stringify(parsed.flags.note))

  const inline = util.parseArgs('--mode=ptc --team=on')
  check('parseArgs 支持 --k=v', inline.flags.mode === 'ptc' && inline.flags.team === 'on')

  check('toBoolean(true 家族)', ['true', 'on', 'yes', 'y', '1'].every(v => util.toBoolean(v, false) === true))
  check('toBoolean(false 家族)', ['false', 'off', 'no', 'n', '0'].every(v => util.toBoolean(v, true) === false))
  check('toBoolean 未知值回退', util.toBoolean('随便', true) === true && util.toBoolean('随便', false) === false)

  check('shortId 去掉 session- 前缀并截断',
    util.shortId('session-12345678-90ab-cdef') === '12345678', util.shortId('session-12345678-90ab-cdef'))
  check('timestamp 形如 YYYYMMDD-HHmmss',
    /^\d{8}-\d{6}$/.test(util.timestamp(Date.UTC(2026, 10, 19, 7, 4, 5))),
    util.timestamp(Date.UTC(2026, 10, 19, 7, 4, 5)))
  check('sha256 稳定', util.sha256('abc') === util.sha256('abc') && util.sha256('abc').length === 64)
  check('formatDuration 有单位', /(毫秒|秒|分钟|小时|天)/.test(util.formatDuration(1500)), util.formatDuration(1500))
}

// ---------------------------------------------------------------- config
{
  check('DEFAULTS 七字段', Object.keys(config.DEFAULTS).length === 7, Object.keys(config.DEFAULTS).join(','))
  check('DEFAULTS.deleteOldSession = true', config.DEFAULTS.deleteOldSession === true)
  check('DEFAULTS.enableTeam = false', config.DEFAULTS.enableTeam === false)

  const cfg = config.normalizeConfig({ exportDir: '/tmp/x' })
  check('normalizeConfig 补齐缺省', cfg.keepExportCopy === true && cfg.exportDir === '/tmp/x')

  const root = config.dataRoot(config.normalizeConfig({}), 'C:/work')
  check('dataRoot 默认 <cwd>/.dsh/mode-exchange',
    root.replace(/\\/g, '/').endsWith('C:/work/.dsh/mode-exchange'), root)

  const custom = config.dataRoot(config.normalizeConfig({ exportDir: 'D:/logs' }), 'C:/work')
  check('dataRoot 尊重 exportDir', custom.replace(/\\/g, '/') === 'D:/logs', custom)

  const lay = config.layout(root)
  check('layout 六条子路径', ['exports', 'backups', 'reports', 'migrations', 'state'].every(k => typeof lay[k] === 'string'))
  check('layout.switchesFile 在 state 下',
    lay.switchesFile.replace(/\\/g, '/').endsWith('state/switches.json'), lay.switchesFile)
}

// ---------------------------------------------------------------- ledger
{
  const dir = await mkdtemp(join(tmpdir(), 'me-ledger-'))
  try {
    const dirs = config.layout(dir)
    check('STEP_COUNT = 7', ledger.STEP_COUNT === 7, String(ledger.STEP_COUNT))
    check('STEPS 长度 = 7', ledger.STEPS.length === 7)
    check('stepLabel(0) 有文案', ledger.stepLabel(0).length > 0, ledger.stepLabel(0))

    const srcId = 'session-abcd1234-0000-1111'
    check('ledgerPath 文件名安全',
      !/[\\/:*?"<>|]/.test(ledger.ledgerPath(dirs, srcId).split(/[\\/]/).pop()),
      ledger.ledgerPath(dirs, srcId).split(/[\\/]/).pop())

    check('read 不存在时返回 undefined', (await ledger.read(dirs, srcId)) === undefined)

    await ledger.write(dirs, { sourceSessionId: srcId, sourceMode: 'standard', targetMode: 'ptc', status: 'in-progress', step: 0 })
    const first = await ledger.read(dirs, srcId)
    check('write 落盘后可读回', first !== undefined && first.targetMode === 'ptc')
    check('write 补了 updatedAt', typeof first.updatedAt === 'number' && first.updatedAt > 0)

    await ledger.write(dirs, { sourceSessionId: srcId, step: 3, targetSessionId: 'session-new' })
    const merged = await ledger.read(dirs, srcId)
    check('write 是合并语义（旧字段不丢）',
      merged.sourceMode === 'standard' && merged.step === 3 && merged.targetSessionId === 'session-new')

    const inflight = await ledger.inProgress(dirs, srcId)
    check('inProgress 命中 in-progress', inflight !== undefined && inflight.status === 'in-progress')

    await ledger.settle(dirs, srcId, 'done', { step: 7 })
    const settled = await ledger.read(dirs, srcId)
    check('settle 改状态', settled.status === 'done' && settled.step === 7)
    check('settle 后 inProgress 不命中', (await ledger.inProgress(dirs, srcId)) === undefined)

    const list = await ledger.list(dirs)
    check('list 返回该条', list.length === 1 && list[0].sourceSessionId === srcId)

    const reportId = 'job-xyz'
    const reportPath = await ledger.writeReport(dirs, { jobId: reportId, ok: true, source: { sessionId: srcId } })
    check('writeReport 落盘', (await readFile(reportPath, 'utf8')).includes('job-xyz'))
    const readBack = await ledger.readReport(dirs, reportId)
    check('readReport 读回', readBack !== undefined && readBack.ok === true)
    check('readReport 缺失返回 undefined', (await ledger.readReport(dirs, 'nope')) === undefined)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

let failed = 0
for (const item of checks) {
  if (!item.ok) failed += 1
  process.stdout.write(`${item.ok ? '  [ok]  ' : '  [FAIL]'} ${item.name}${item.detail ? `  — ${item.detail}` : ''}\n`)
}
process.stdout.write(`\n${failed === 0 ? '全部通过' : `${failed} 项失败`}（共 ${checks.length} 项）\n`)
process.exitCode = failed === 0 ? 0 : 1