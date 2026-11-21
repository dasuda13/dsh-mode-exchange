#!/usr/bin/env node
/**
 * 冒烟：宿主的「热路径」模块只允许相对导入。
 *
 * ## 为什么需要这条检查
 *
 * 插件在本机是以符号链接装进 profile 的：
 *   ~/.dsh/profiles/desktop/node_modules/dsh-mode-exchange -> <本仓库>
 * Node 解析裸包名（bare specifier）时按 **realpath** 从**本仓库**往上找 node_modules，
 * 而 profile 的 node_modules 不在那条路径上。于是只要宿主侧代码（index.js / src/host）
 * 出现任何一句 `import x from 'some-package'`，仓库一旦没有 node_modules
 * （它本来就在 .gitignore 里），整个入口在 import 期就抛 ERR_MODULE_NOT_FOUND：
 * 插件管理器显示「启用中」，侧栏面板 / 设置页 / 命令 / 路由却全部消失，
 * 而报错只有一句「启动时没能加载」——0.1.3 的真实故障，排查花了一整轮。
 *
 * 这条检查把那个故障挡在提交前：宿主侧代码只许导入相对路径与 node: 内置模块。
 * 客户端 bundle 不受影响（它由自研打包器拼成一个文件，不经过 Node 解析）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

let failures = 0
function check(name, ok, detail) {
  if (ok) {
    console.log('ok   ' + name + (detail === undefined ? '' : '  (' + detail + ')'))
  } else {
    failures += 1
    console.log('FAIL ' + name + (detail === undefined ? '' : '  (' + detail + ')'))
  }
}

/**
 * 去掉注释后再扫导入说明符——注释里出现的 `import z from '@x/y'` 是文档，不是依赖。
 * 用一个简单的字符状态机，只为正确处理引号里的 // 与 /*。
 * @param {string} source
 * @returns {string}
 */
export function stripComments(source) {
  let out = ''
  let index = 0
  let quote = ''
  while (index < source.length) {
    const char = source[index]
    const next = source[index + 1]
    if (quote !== '') {
      out += char
      if (char === '\\') {
        out += next ?? ''
        index += 2
        continue
      }
      if (char === quote) quote = ''
      index += 1
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      out += char
      index += 1
      continue
    }
    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1
      continue
    }
    if (char === '/' && next === '*') {
      index += 2
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1
      index += 2
      continue
    }
    out += char
    index += 1
  }
  return out
}

/**
 * 找出所有非相对、非 node: 的导入说明符。
 * @param {string} source
 * @returns {Array<string>}
 */
export function scanSource(source) {
  const code = stripComments(source)
  const found = []
  const patterns = [
    /(?:^|[^\w$.])import\s+(?:[^'"()]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /(?:^|[^\w$.])export\s+[^'"()]*?\s+from\s+['"]([^'"]+)['"]/g,
    /(?:^|[^\w$.])import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(code))) found.push(match[1])
  }
  const isRelative = specifier => specifier.startsWith('./') || specifier.startsWith('../')
  const isBuiltin = specifier => specifier.startsWith('node:')
  return [...new Set(found.filter(specifier => !isRelative(specifier) && !isBuiltin(specifier)))]
}

// ---------------------------------------------------------------- 自检：扫描器本身
// 扫描器不能恒空，否则「全部通过」毫无意义。
const sample = [
  "import fs from 'node:fs'",
  "import { a } from './a.js'",
  "// import z from '@deepseek-ai/schemastery'",
  "/* import y from 'lodash' */",
  "import bad from 'some-package'",
  "const url = 'https://example.com'",
  "await import('dynamic-pkg')",
].join('\n')
const sampleHits = scanSource(sample)
check('扫描器能抓到裸包导入', sampleHits.includes('some-package'), sampleHits.join(','))
check('扫描器能抓动态 import 的裸包名', sampleHits.includes('dynamic-pkg'))
check('扫描器不误报注释里的导入', !sampleHits.includes('@deepseek-ai/schemastery') && !sampleHits.includes('lodash'))
check('扫描器不误报相对导入与 node: 内置', !sampleHits.includes('./a.js') && !sampleHits.includes('node:fs'))
check('扫描器不把 URL 当导入', !sampleHits.some(hit => hit.includes('example.com')))

// ---------------------------------------------------------------- 真实文件
const entry = path.join(root, 'index.js')
const hostDir = path.join(root, 'src', 'host')
const targets = [entry]
for (const name of fs.readdirSync(hostDir)) {
  if (name.endsWith('.js')) targets.push(path.join(hostDir, name))
}

check('找到了宿主侧源文件', targets.length >= 10, targets.length + ' 个')

const violations = []
for (const file of targets) {
  for (const specifier of scanSource(fs.readFileSync(file, 'utf8'))) {
    violations.push(path.relative(root, file).replace(/\\/g, '/') + ' -> ' + specifier)
  }
}
check('宿主侧代码没有裸包导入（link 安装下会 ERR_MODULE_NOT_FOUND）', violations.length === 0, violations.join(' | '))

// 反向确认：这条检查确实覆盖了 0.1.3 那次故障的形状。
const regression = "import z from '@deepseek-ai/schemastery'"
check('0.1.3 的故障写法会被拦下', scanSource(regression).includes('@deepseek-ai/schemastery'))

if (failures > 0) {
  console.log('\n失败 ' + failures + ' 项')
  process.exit(1)
}
console.log('\n全部通过（共 ' + (5 + 2 + 1) + ' 项）')
