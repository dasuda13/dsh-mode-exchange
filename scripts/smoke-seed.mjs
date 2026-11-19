// seed.js 冒烟测试：构造一段「有未闭合 turn + 未回应的工具调用」的事件序列，
// 验证 buildSeed 产出的形状符合 dsh-session 的构造期校验要求。
// 用法：node %TEMP%\seed-smoke.mjs
import { buildSeed, inspectSeed, isBalanced, openTurnClosers } from '../src/host/seed.js'

const A = (seq, time, type, data, extra = {}) => ({ type, seq, time, data, ...extra })

/** 一段典型历史：turn/start → step/start → 用户消息 → 助手消息(带 tool-call) → tool/call（无 result）。 */
const events = [
  A(0, 1000, 'turn/start', { turn: 1 }),
  A(1, 1001, 'step/start', { turn: 1, step: 1 }),
  A(2, 1002, 'user/message', {
    id: 'm-user-1',
    role: 'user',
    content: [{ type: 'text', text: '帮我读一下 a.txt' }],
    source: { kind: 'user' },
  }, { surfaceOp: 'append' }),
  A(3, 1003, 'assistant/message', {
    turn: 1,
    step: 1,
    message: {
      id: 'm-asst-1',
      role: 'assistant',
      content: [{ type: 'tool-call', id: 'call-1', name: 'read_file', arguments: '{"path":"a.txt"}' }],
      source: { kind: 'model', provider: 'deepseek', model: 'v4' },
    },
    stream: [],
  }, { surfaceOp: 'append' }),
  A(4, 1004, 'tool/call', { turn: 1, step: 1, callId: 'call-1', name: 'read_file', arguments: '{"path":"a.txt"}' }),
]

const result = buildSeed(events)
const checks = []
const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail })
}

check('isBalanced(源) === false（确实有未闭合 turn）', isBalanced(events) === false)
check('sourceCount = 5', result.sourceCount === 5, String(result.sourceCount))
// inheritedEventCount 只数「被复制的源事件」，不含 marker 与 closers
// （fork.ts:19 注释：closers 在计数之外）。marker 正好坐在 index = inheritedEventCount 上。
check('inheritedEventCount = 5（只数源事件）', result.inheritedEventCount === 5, String(result.inheritedEventCount))
check('seed 长度 > inheritedEventCount（有 closers）', result.seed.length > result.inheritedEventCount,
  `${result.seed.length} > ${result.inheritedEventCount}`)

// marker 必须正好落在 index === inheritedEventCount
const marker = result.seed[result.inheritedEventCount]
check('marker 落在 index = inheritedEventCount',
  marker !== undefined && marker.type === 'session/end-seed' && marker.data?.inherited === true,
  JSON.stringify(marker?.type))

// seq 必须从 0 连续
const contiguous = result.seed.every((event, index) => event.seq === index)
check('seq 从 0 连续', contiguous)

// 源事件前缀必须原样（前 5 条）
const prefixSame = events.every((event, index) => {
  const got = result.seed[index]
  return JSON.stringify(got) === JSON.stringify(event)
})
check('前 5 条与源事件逐字相同', prefixSame)

// closers：必须给 call-1 补一条 isError 的 tool/result，再补 step/end、turn/end
const closers = result.seed.slice(result.inheritedEventCount + 1)
const toolResult = closers.find(event => event.type === 'tool/result')
check('补了一条 tool/result', toolResult !== undefined)
check('tool/result 的 callId = call-1', toolResult?.data?.message?.toolCallId === 'call-1',
  String(toolResult?.data?.message?.toolCallId))
check('tool/result 的 message.isError = true', toolResult?.data?.message?.isError === true)
check('tool/result 带 surfaceOp = append', toolResult?.surfaceOp === 'append')
check('tool/result 的 error.code = TOOL_OUTCOME_UNKNOWN（已 started）',
  toolResult?.data?.error?.code === 'TOOL_OUTCOME_UNKNOWN', String(toolResult?.data?.error?.code))
check('tool/result 的 source.kind = tool 且与 toolCallId 一致',
  toolResult?.data?.message?.source?.kind === 'tool'
  && toolResult?.data?.message?.source?.callId === toolResult?.data?.message?.toolCallId)
check('tool/result 带 sourceEventSeqs（指向 tool/call 的 seq）',
  Array.isArray(toolResult?.sourceEventSeqs) && toolResult.sourceEventSeqs[0] === 4,
  JSON.stringify(toolResult?.sourceEventSeqs))

const stepEnd = closers.find(event => event.type === 'step/end')
const turnEnd = closers.find(event => event.type === 'turn/end')
check('补了 step/end', stepEnd !== undefined)
check('补了 turn/end', turnEnd !== undefined)
check('turn/end 的 reason.kind = forked', turnEnd?.data?.reason?.kind === 'forked', String(turnEnd?.data?.reason?.kind))

// 补完之后整体必须是闭合的
check('seed 整体闭合（isBalanced === true）', isBalanced(result.seed) === true)

// inspectSeed 不应报问题
const problems = inspectSeed(result.seed, result.inheritedEventCount)
check('inspectSeed 无问题', problems.length === 0, problems.join('；'))

// openTurnClosers 对已闭合序列应返回空数组
check('openTurnClosers(已闭合) === []', openTurnClosers(result.seed, 'forked').length === 0)

let failed = 0
for (const item of checks) {
  if (!item.ok) failed += 1
  process.stdout.write(`${item.ok ? '  [ok]  ' : '  [FAIL]'} ${item.name}${item.detail ? `  — ${item.detail}` : ''}\n`)
}
process.stdout.write(`\n${failed === 0 ? '全部通过' : `${failed} 项失败`}（共 ${checks.length} 项）\n`)
process.exitCode = failed === 0 ? 0 : 1
