#!/usr/bin/env node
/**
 * 能力探针。在不启动完整 Harness 的前提下，用它检查：
 *   1. 宿主安装目录里是否存在本插件依赖的服务包（只做存在性判断，不做 import）；
 *   2. profile 的 cordis.patch.yml 里是否已经挂载本插件；
 *   3. package.json 的 exports/icon/locale 是否指向真实存在的文件；
 *   4. 客户端产物 bundle.js 是否已生成、以及它的模块 id 是否等于包名。
 *
 * 用法：
 *   node scripts/probe.js           # 打印报告，有问题时退出码 1
 *   node scripts/probe.js --print   # 同上（package.json 的 npm run probe 用这个）
 */

import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

/** 本插件在宿主侧依赖的服务名（只用于提示，不做强制校验）。 */
const HOST_SERVICES = [
  'commands',
  'agentPresets',
  'agents',
  'sessionQuery',
  'sessionPersistence',
]
const OPTIONAL_HOST_SERVICES = [
  'tools',
  'systemPrompt',
  'agentTeams',
  'connection',
  'configEditor',
  'workspaceRegistry',
  'sessionTitle',
  'agentDefaultModel',
  'userQuestions',
]

const lines = []
let problems = 0

function ok(message) {
  lines.push(`  [ok]   ${message}`)
}
function warn(message) {
  lines.push(`  [warn] ${message}`)
}
function bad(message) {
  problems += 1
  lines.push(`  [FAIL] ${message}`)
}

async function exists(pathname) {
  try {
    await stat(pathname)
    return true
  } catch {
    return false
  }
}

async function readJson(pathname) {
  return JSON.parse(await readFile(pathname, 'utf8'))
}

async function main() {
  lines.push('dsh-mode-exchange 能力探针')
  lines.push('')

  // ---- 1. package.json 与导出文件 ----
  const pkgPath = join(root, 'package.json')
  if (!existsSync(pkgPath)) {
    bad('package.json 缺失')
    return
  }
  const pkg = await readJson(pkgPath)
  lines.push(`包：${pkg.name}@${pkg.version}`)
  if (pkg.type !== 'module') bad('package.json 的 type 必须是 "module"')
  else ok('type = module')

  const targets = new Map()
  for (const [key, value] of Object.entries(pkg.exports || {})) {
    if (typeof value !== 'string') continue
    if (value.includes('*')) continue
    targets.set(key, value)
  }
  for (const [key, rel] of targets) {
    const abs = join(root, rel)
    if (await exists(abs)) ok(`exports["${key}"] → ${rel}`)
    else bad(`exports["${key}"] 指向不存在的文件 ${rel}`)
  }
  if (pkg.icon) {
    if (await exists(join(root, pkg.icon))) ok(`icon → ${pkg.icon}`)
    else bad(`icon 指向不存在的文件 ${pkg.icon}`)
  }

  // ---- 2. 清单元数据 ----
  const dsh = pkg.dsh || {}
  if (dsh.manifestVersion === 1) ok('dsh.manifestVersion = 1')
  else bad('dsh.manifestVersion 缺失或不为 1')
  if (dsh.bundle && dsh.bundle.patch) {
    if (await exists(join(root, dsh.bundle.patch))) ok(`bundle.patch → ${dsh.bundle.patch}`)
    else bad(`bundle.patch 指向不存在的文件 ${dsh.bundle.patch}`)
  } else {
    bad('dsh.bundle.patch 缺失')
  }
  if (dsh.client) {
    if (dsh.client.platform === 'web') ok('client.platform = web')
    else bad('client.platform 必须为 "web"')
    if (Array.isArray(dsh.client.inject) && dsh.client.inject.length > 0) {
      ok(`client.inject = ${dsh.client.inject.join(', ')}`)
    } else {
      bad('client.inject 必须是非空数组')
    }
  } else {
    bad('dsh.client 缺失')
  }

  // ---- 3. locale 元数据 ----
  for (const language of ['zh', 'en']) {
    const pathname = join(root, 'locale', `${language}.json`)
    if (!(await exists(pathname))) {
      bad(`locale/${language}.json 缺失`)
      continue
    }
    const dict = await readJson(pathname)
    const meta = dict.meta || {}
    if (!meta.title) bad(`locale/${language}.json 缺少 meta.title`)
    else if (!meta.description) bad(`locale/${language}.json 缺少 meta.description`)
    else ok(`locale/${language}.json → ${meta.title}`)
    if (meta.detail && !(await exists(join(root, meta.detail)))) {
      bad(`locale/${language}.json 的 meta.detail 指向不存在的文件 ${meta.detail}`)
    }
  }

  // ---- 4. 客户端产物 ----
  const bundlePath = join(root, 'src', 'client', 'bundle.js')
  if (!(await exists(bundlePath))) {
    bad('src/client/bundle.js 尚未生成，请运行 node scripts/build-client.mjs')
  } else {
    const text = await readFile(bundlePath, 'utf8')
    const match = text.match(/window\.__ModuleLoader__\.load\(\{\s*id:\s*"([^"]+)"/)
    if (!match) bad('bundle.js 里找不到 window.__ModuleLoader__.load({ id: ... })')
    else if (match[1] !== pkg.name) bad(`bundle.js 的模块 id "${match[1]}" 与包名 "${pkg.name}" 不一致`)
    else ok(`bundle.js 模块 id = ${match[1]}`)
    if (!text.includes('startModeExchangeClient')) bad('bundle.js 未导出 startModeExchangeClient')
    else ok('bundle.js 导出 startModeExchangeClient')
  }

  // ---- 5. 宿主安装目录中的服务包（仅提示） ----
  const asar = process.env.DSH_ASAR_PATH || defaultAsar()
  if (asar && existsSync(asar)) {
    lines.push('')
    lines.push(`宿主安装位置：${asar}`)
    lines.push(`  （服务名 ${HOST_SERVICES.join(' / ')} 需要宿主提供；下面只列出可选的补充能力包）`)
    for (const name of OPTIONAL_HOST_SERVICES) {
      lines.push(`  [info] 可选服务 ${name}`)
    }
  } else {
    warn('未找到 app.asar（可设置 DSH_ASAR_PATH 指向它）；跳过宿主包检查')
  }

  // ---- 6. profile 挂载状态（仅提示） ----
  const profileDir = process.env.DSH_PROFILE_DIR || defaultProfileDir()
  if (profileDir && existsSync(profileDir)) {
    // 安装有两条通路：
    //   a) plugin_manager install_bundle —— 只写 profile/package.json 的依赖，
    //      挂载行由插件管理器自己维护，profile 的 cordis.patch.yml 里【不会】出现包名；
    //   b) 开发期手工 insert —— 包名会直接写在 cordis.patch.yml 里。
    // 所以先看 package.json 依赖，再看 patch 文本，任一命中即算已挂载。
    const patch = join(profileDir, 'cordis.patch.yml')
    const profilePkg = join(profileDir, 'package.json')
    let installedViaManager = false
    if (existsSync(profilePkg)) {
      try {
        const deps = JSON.parse(await readFile(profilePkg, 'utf8'))?.dependencies ?? {}
        installedViaManager = typeof deps[pkg.name] === 'string'
      } catch {
        installedViaManager = false
      }
    }
    if (installedViaManager) {
      ok(`profile 的 package.json 依赖里已有 ${pkg.name}（plugin_manager 安装）`)
    } else if (existsSync(patch)) {
      const text = await readFile(patch, 'utf8')
      if (text.includes(pkg.name)) ok(`profile 的 cordis.patch.yml 里已出现 ${pkg.name}`)
      else warn(`profile 还没挂载 ${pkg.name}：用 plugin_manager 安装，或在 cordis.patch.yml 里手工 insert`)
    } else {
      warn(`profile 目录里没有 cordis.patch.yml：${profileDir}`)
    }
  } else {
    warn('未找到 profile 目录（可设置 DSH_PROFILE_DIR）；跳过挂载检查')
  }

  lines.push('')
  lines.push(problems === 0 ? '结论：全部检查通过。' : `结论：发现 ${problems} 个问题，见上面的 [FAIL]。`)
  process.stdout.write(lines.join('\n') + '\n')
  if (problems > 0) process.exitCode = 1
}

function defaultAsar() {
  const candidates = [
    // 显式指定优先（DSH_APP_ASAR=C:\...\resources\app.asar）
    process.env.DSH_APP_ASAR,
    // 常见安装位置：当前用户 LOCALAPPDATA（不写死用户名）
    process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, 'Programs', 'DeepSeek Harness', 'resources', 'app.asar')
      : null,
    '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar',
  ]
  return candidates.filter(Boolean).find(pathname => existsSync(pathname))
}

function defaultProfileDir() {
  const home = process.env.USERPROFILE || process.env.HOME
  if (!home) return null
  const candidate = join(home, '.dsh', 'profiles', 'desktop')
  return existsSync(candidate) ? candidate : null
}

main().catch(error => {
  process.stderr.write(`探针失败：${error && error.message ? error.message : String(error)}\n`)
  process.exitCode = 1
})
