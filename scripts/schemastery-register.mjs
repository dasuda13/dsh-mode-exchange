/**
 * 为一个脚本注册 schemastery 解析钩子。
 *
 * 用法（任何 smoke 脚本第一行）：
 *   import './schemastery-register.mjs'
 *
 * 之所以要单独一层：`--import` 只执行模块，不会自动收集里面的 `resolve` 导出，
 * 必须显式调用 `module.register()` 才能真正参与解析。
 */
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register('./schemastery-loader.mjs', pathToFileURL(import.meta.filename))
