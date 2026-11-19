/**
 * 冒烟测试用的解析钩子。
 *
 * 插件源码里唯一的非相对导入是 `@deepseek-ai/schemastery`，它由宿主提供，
 * 本地 checkout 里没有 node_modules。为了让 `node scripts/smoke-*.mjs`
 * 能在不污染工作目录（不建 node_modules、不装依赖）的前提下真实加载
 * config.js，这里在第 0 层把该裸包名映射到 profile 里那份真实副本。
 *
 * 生产环境不走这条路：宿主自己有完整的解析器。
 */
import { pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

/** 按优先级找 schemastery 的真实位置。 */
function locateSchemastery() {
  const profile = process.env.DSH_PROFILE_DIR
    ?? join(homedir(), '.dsh', 'profiles', process.env.DSH_PROFILE ?? 'desktop')
  const candidates = [
    join(profile, 'node_modules', '@deepseek-ai', 'schemastery', 'lib', 'index.mjs'),
    join(homedir(), '.dsh', 'profiles', 'desktop', 'node_modules', '@deepseek-ai', 'schemastery', 'lib', 'index.mjs'),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@deepseek-ai/schemastery') {
    const found = locateSchemastery()
    if (found !== undefined) {
      return { url: pathToFileURL(found).href, shortCircuit: true, format: 'module' }
    }
  }
  return nextResolve(specifier, context)
}
