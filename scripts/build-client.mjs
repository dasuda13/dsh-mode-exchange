#!/usr/bin/env node
/**
 * 把 src/client/*.js 打成一个浏览器产物 src/client/bundle.js。
 *
 * 为什么自己写而不用 esbuild：本插件不允许引入构建依赖（profile 里没有 esbuild，
 * 安装也不需要跑 install 脚本）。客户端源码的模块结构非常简单——
 *   · 只有命名导入（`import { a, b } from './x.js'`），没有默认导入、没有动态导入
 *   · 唯一的外部模块是 `require('react')`，由宿主模块表提供，在 factory 里现取
 * 所以用「模块表 + 命名导出解构」就足够，产物是纯 CJS，零依赖。
 *
 * 产物形态必须与宿主一致（见 @deepseek-ai/dsh-client-ui-renderer 的加载器）：
 *   window.__ModuleLoader__.load({ id: '<包名>', factory(require) { ... return 导出对象 } })
 * id 必须等于 package.json 的 name。
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const clientDir = join(root, 'src', 'client')
const pkgPath = join(root, 'package.json')

/** 打包顺序 = 依赖拓扑顺序：被依赖者在前。 */
const ORDER = ['i18n.js', 'ui.js', 'api.js', 'store.js', 'panel.js', 'settings.js', 'menu.js', 'entry.js']

/** 每个模块导出的入口函数名（产物最后要调用它）。 */
const ENTRY_EXPORT = 'startModeExchangeClient'

/** `--check`：只比对产物是否最新，不写文件。 */
const CHECK_ONLY = process.argv.includes('--check')

const IMPORT_RE = /^[ \t]*import\s+\{([^}]*)\}\s+from\s+'(\.\/[^']+)'\s*$/gm
const EXPORT_DECL_RE = /^([ \t]*)export\s+(async\s+function|function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm
const EXPORT_LIST_RE = /^[ \t]*export\s+\{([^}]*)\}\s*;?[ \t]*$/gm

/** 校验源码只使用受支持的语法，避免静默打错包。 */
function assertSupported(name, source) {
  if (/^[ \t]*import\s+[^(]/.test(source.replace(IMPORT_RE, ''))) {
    const leftover = source.replace(IMPORT_RE, '').match(/^[ \t]*import\b/gm)
    if (leftover) throw new Error(`${name}: 发现未支持的 import 形式（只支持 import { a, b } from './x.js'）`)
  }
  if (/^[ \t]*export\s+default\b/m.test(source)) throw new Error(`${name}: 不支持 export default`)
  if (/^[ \t]*export\s+\*/m.test(source)) throw new Error(`${name}: 不支持 export *`)
  const external = source.match(/from\s+'(?!\.\/)[^']+'/g)
  if (external) throw new Error(`${name}: 客户端源码不允许从外部包导入 —— ${external.join(', ')}`)
}

/**
 * 把一个 ESM 模块改写成「返回导出对象的 IIFE」。
 * 依赖由外部以 `__mod_<name>` 常量注入。
 */
function transform(name, source, deps) {
  assertSupported(name, source)

  const exported = new Set()

  // 1) 命名导入 → 从依赖常量解构
  let code = source.replace(IMPORT_RE, (_match, names, spec) => {
    const depKey = spec.replace(/^\.\//, '').replace(/\.js$/, '')
    if (!deps.includes(depKey)) throw new Error(`${name}: 导入了未在打包顺序里的模块 '${spec}'`)
    const idents = names.split(',').map(part => part.trim()).filter(Boolean)
    if (idents.length === 0) return ''
    return `const { ${idents.join(', ')} } = __mod_${depKey};`
  })

  // 2) 收集 export { a, b } 并删除该语句
  code = code.replace(EXPORT_LIST_RE, (_match, names) => {
    for (const part of names.split(',')) {
      const ident = part.trim()
      if (ident) exported.add(ident)
    }
    return ''
  })

  // 3) export function/const/class → 去掉 export，并记入导出表
  code = code.replace(EXPORT_DECL_RE, (_match, indent, kind, ident) => {
    exported.add(ident)
    return `${indent}${kind} ${ident}`
  })

  if (exported.size === 0) throw new Error(`${name}: 没有识别到任何导出`)
  const returnPairs = [...exported].map(ident => `    ${ident}`).join(',\n')

  return `/* ---- ${name} ---- */
const __mod_${name.replace(/\.js$/, '')} = (() => {
${code}
  return {
${returnPairs},
  };
})();
`
}

async function main() {
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
  const pkgName = pkg.name
  if (!pkgName) throw new Error('package.json 缺少 name')

  const chunks = []
  const produced = []
  for (let index = 0; index < ORDER.length; index += 1) {
    const file = ORDER[index]
    const source = await readFile(join(clientDir, file), 'utf8')
    const deps = ORDER.slice(0, index).map(entry => entry.replace(/\.js$/, ''))
    chunks.push(transform(file, source, deps))
    produced.push(`${file} (${source.length}B)`)
  }

  const body = chunks.join('\n')

  const output = `/**
 * dsh-mode-exchange 客户端产物 —— 由 scripts/build-client.mjs 生成，请勿手工编辑。
 * 源文件：src/client/{${ORDER.join(', ')}}。
 * 生成时间：构建时写入，不参与逻辑；如需重新生成请运行 \`node scripts/build-client.mjs\`。
 */
window.__ModuleLoader__.load({
  id: ${JSON.stringify(pkgName)},
  factory: function factory(require) {
    var module = { exports: {} };
    var exports = module.exports;
    'use strict';
${body}
    Object.assign(module.exports, ${`__mod_${ORDER[ORDER.length - 1].replace(/\.js$/, '')}`});
    return module.exports.${ENTRY_EXPORT}(require);
  },
});
`

  const target = join(clientDir, 'bundle.js')

  // --check：只比对，不写文件；产物缺失或落后就让调用方拿到非零退出码。
  if (CHECK_ONLY) {
    let current
    try {
      current = await readFile(target, 'utf8')
    } catch {
      process.stderr.write(`产物缺失：${target}\n请运行 node scripts/build-client.mjs\n`)
      process.exitCode = 1
      return
    }
    if (current !== output) {
      process.stderr.write(`产物已过期：${target}\n请运行 node scripts/build-client.mjs\n`)
      process.exitCode = 1
      return
    }
    process.stdout.write(`产物是最新的：${target}（${Buffer.byteLength(output, 'utf8')} 字节）\n`)
    return
  }

  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, output, 'utf8')
  process.stdout.write(`已生成 ${target}（${Buffer.byteLength(output, 'utf8')} 字节）\n`)
  for (const line of produced) process.stdout.write(`  · ${line}\n`)
}

main().catch(error => {
  process.stderr.write(`构建失败：${error && error.message ? error.message : String(error)}\n`)
  process.exitCode = 1
})
