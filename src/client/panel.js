/**
 * 侧栏面板：模式切换 / 迁移重建 / 迁移历史 三个页签。
 * 组件通过 makePanel(React, deps) 构造，deps 提供 api、store、文案与 UI 原子。
 */

import {
  Notice, Field, Select, Toggle, TextArea, Button, PanelHead, StepList,
  Card, Section, Tabs, Badge, EmptyState, StyleTag,
  formatTime, formatElapsed, shortSessionId,
} from './ui.js'

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

export function makePanel(React, deps) {
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
