# 发布本插件（GitHub 托管 / npm 在线安装）

目标仓库：`https://github.com/dasuda13/dsh-mode-exchange`。

本文分两条线：**托管源码**用方案 A/B/C（推到 GitHub），**让别人在 DSH 里按包名装**
用方案 D（发到 npm registry）。

---

## 方案 A：用仓库自带的 REST 推送器（不需要 git，推荐）

`.verify/push-github.mjs` 走 GitHub REST API：逐个文件建 blob → 建 tree → 建 commit
（父提交 = 远端当前 head）→ 移动 `main` 分支。**一次提交**把 45 个文件全部写上去，
远端已有的 `LICENSE` / `README.md` / `.gitignore` 会被本目录的版本覆盖（内容已对齐）。

### 1. 建一个 PAT

GitHub → 右上头像 → Settings → Developer settings → Personal access tokens →
**Fine-grained tokens** → Generate new token：

- Repository access：Only select repositories → `dasuda13/dsh-mode-exchange`
- Permissions → Repository permissions → **Contents: Read and write**
- 有效期按需（建议 7 天，用完即删）

> Classic token 也可以，勾 `repo` 即可。

### 2. 先在本地确认会传哪些文件

```powershell
cd <你的插件仓库目录>
node .verify/push-github.mjs --dry-run
```

输出应为 `文件 45 个 / 440 KB`。`.verify/`、`.refs/`、`.dsh-vision-router/`、`node_modules/`
都在忽略表里，不会上传。

### 3. 推送

```powershell
$env:GITHUB_TOKEN = "<把你的 token 粘这里>"
node .verify/push-github.mjs --message "feat: 完整插件源码、客户端 UI 与宿主实现"
Remove-Item Env:\GITHUB_TOKEN     # 用完清掉
```

成功后会打印 `完成：https://github.com/dasuda13/dsh-mode-exchange/commit/<sha>`。

可选参数：`--owner` `--repo` `--branch` `--message`。

> 注意：本机 PowerShell 的 `Invoke-WebRequest` / `curl.exe` 走 schannel 会报
> `SEC_E_NO_CREDENTIALS`，本机系统代理（例如 Clash 的 127.0.0.1:7897）也不通。这个脚本用 Node 的
> `https` 直连，实测 `api.github.com` 可用，不受影响。

---

## 方案 B：用 git 推送（推荐，仓库自带脚本）

本机当前**没有安装 git**（`Get-Command git` 为空，`C:\Program Files\Git`、
`C:\Program Files (x86)\Git`、`%LOCALAPPDATA%\Programs\Git`、scoop shims 都没有 `git.exe`），
所以先装 git，再用仓库里的 [scripts/push-git.ps1](../scripts/push-git.ps1) 一条命令推完。

### 1. 装 Git for Windows

<https://git-scm.com/download/win> → 下载 64-bit 安装包 → 一路默认下一步即可。
装完**必须新开一个终端**（PATH 只在新进程里刷新），否则 `git` 仍然「找不到命令」。

验证：

```powershell
git --version
```

### 2. 先干跑一次（不写 .git、不发任何请求）

```powershell
cd <你的插件仓库目录>
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\push-git.ps1 -DryRun
```

脚本会依次打印 6 步：定位 git → init → 身份 → 暂存提交 → 分支与远端 → push。
`-DryRun` 只把要执行的 `git` 命令打出来，不落盘、不联网。

### 3. 真正推送

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\push-git.ps1 `
  -UserName dasuda13 -UserEmail you@example.com `
  -Message "feat: 完整插件源码、客户端 UI 与宿主实现"
```

脚本做的事，等价于下面这段（想手动敲就用这段）：

```powershell
cd <你的插件仓库目录>
git init
git config core.autocrlf false
git config user.name  "dasuda13"
git config user.email "you@example.com"          # 换成你的 GitHub 邮箱
git add -A
git commit -m "feat: 完整插件源码、客户端 UI 与宿主实现"
git branch -M main
git remote add origin https://github.com/dasuda13/dsh-mode-exchange.git
git push -u origin main --force
```

**第一次必须 `--force`**：远端那个 Initial commit 是网页端提交的，和本目录没有共同历史，
不 force 会被 `non-fast-forward` 拒绝。脚本默认带 `--force`，加 `-NoForce` 可关掉。

### 4. 认证：把 PAT 当密码

push 时会弹凭据窗口（或命令行提示）：

- Username：`dasuda13`
- Password：**粘贴 PAT**，不是账号密码

PAT 在这里建：GitHub → Settings → Developer settings → Personal access tokens →
Fine-grained tokens → 只授权 `dasuda13/dsh-mode-exchange` → **Contents: Read and write**

Windows 上会由 Git Credential Manager 存进「Windows 凭据管理器」，之后不用再输。

### 5. 之后日常更新

```powershell
git add -A
git commit -m "fix: ..."
git push
```

### 常见报错

| 报错 | 原因 | 处理 |
|---|---|---|
| `git : 无法将"git"项识别为 cmdlet` | 刚装完没重开终端，PATH 没刷新 | 关掉终端重开；或直接用脚本（它会自己找 `git.exe`） |
| `non-fast-forward` / `fetch first` | 远端有网页端的 Initial commit | 加 `--force`，或 `git pull --allow-unrelated-histories` 后再推 |
| `Authentication failed` | 密码填了账号密码，或 PAT 过期 | 重新生成 PAT，权限给 Contents: Read and write |
| `SEC_E_NO_CREDENTIALS` / `schannel` | 本机 schannel 与代理不兼容 | `git config --local http.sslBackend openssl`；再 `git config --local http.proxy ""` |
| `OpenSSL SSL_read: Connection reset` | 系统代理（如 `127.0.0.1:7897`）走 HTTPS 会重置 | 同上，清掉 git 的 http.proxy |
| `Recv failure: Connection was reset` | **不是配置问题**——链路被中间设备重置。GitHub 的 IP 段在国内常被间歇性阻断，同一秒能通、下一秒被 reset | 直接重跑；本次实测重试 1~3 次必成功。连失败 5 次以上再看下面「网络不稳」一节 |
| `LF will be replaced by CRLF` | 换行符警告 | 脚本已设 `core.autocrlf false`，可忽略 |

> 本机实测：`Invoke-WebRequest` 与 `curl.exe` 走 schannel 都失败
> （`SEC_E_NO_CREDENTIALS`），系统代理走 HTTPS 一律 ECONNRESET。
> git 自带 OpenSSL 与自己的代理配置，所以上面的 `http.sslBackend openssl` /
> `http.proxy ""` 就是针对这一点——**不要指望 PowerShell 的网络栈能替你验证连通性**。

### 网络不稳怎么办

本机到 `github.com` 的链路是**间歇性**的（同一分钟里有的请求成功、有的被 reset），
不是配置错。三种判断手段，从便宜到贵：

```powershell
$git = "C:\Program Files\Git\cmd\git.exe"

# 1) 只读探测，不碰凭据：连上就算链路通
& $git ls-remote --heads origin        # 成功会打印 40 位 SHA

# 2) 若 1) 反复失败，看是不是 TLS 后端的问题（本机系统级默认是 schannel）
& $git -c http.sslBackend=openssl ls-remote --heads origin

# 3) 走完整推送链路但用假凭据：收到 "Invalid username or token" 说明
#    网络 + receive-pack 全通，剩下的只是登录凭据
$env:GIT_TERMINAL_PROMPT = "0"
& $git -c credential.helper= push https://fake-user:fake-token@github.com/dasuda13/dsh-mode-exchange.git main
$env:GIT_TERMINAL_PROMPT = $null
```

判断结论：

- 1) 成功 / 3) 报 `Invalid username or token` → **网络没问题，直接重跑 `git push`**。
  本次实测在 4 分钟里 `push` 失败 1 次、紧接着 5 次假凭据探测全部收到 401，
  说明是链路瞬断，不是仓库或配置问题。
- 1) `SEC_E_NO_CREDENTIALS` → 是 TLS 后端问题，先 `git config --local http.sslBackend openssl`
  （本仓库已设好，见 `.git/config`）。
- 1) 稳定成功但 `push` 一直 reset → 换成 SSH 通道（`ssh.github.com:443` 本机可达）：
  `git remote set-url origin git@github.com:dasuda13/dsh-mode-exchange.git`，
  先配好 SSH key。
- 一直失败且急着交付 → 走本文档「方案 C：网页拖拽上传」，或「方案 A：GITHUB_TOKEN + Node 脚本」。

`.gitignore` 已合并本地规则 + GitHub 的 Node 模板，`git add .` 不会带入
`.verify/`（21 MB 桌面截图）、`.refs/`（宿主 asar 抽取副本）、`.dsh-vision-router/`
以及运行时数据目录（`.dsh/` `exports/` `backups/` `reports/` `migrations/`）。

## 方案 C：网页拖拽上传（不装 git、不给 token）

仓库页 → `Add file` → `Upload files` → 把 `src`、`scripts`、`docs`、`locale`、
`types` 五个文件夹和根目录下的 `index.js`、`package.json`、
`cordis.patch.yml`、`icon.svg`、`CHANGELOG.md`、`LICENSE`、`README.md`、`.gitignore`
一起拖进去，填提交信息后 Commit。

缺点：浏览器上传对隐藏文件（`.gitignore`）和大量文件不友好，最容易漏文件；
`node_modules` 若被误拖进去会非常大。仅作为兜底。

---

## 方案 D：发布到 npm（DSH 用户「插件 → 添加插件」直接按包名安装）

推到 GitHub 只是源码托管；要让别人**在 DSH 里输入一个包名就装好**，必须发到 npm registry。
宿主插件管理器的输入框本身就接受 registry 包名（源码 `sanitize-install-input.ts`：

```ts
if (/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*(?:@[a-z0-9.*^~+<>=| -]+)?$/iu.test(spec)) return spec
```

），所以 `dsh-mode-exchange`、`dsh-mode-exchange@0.1.0`、`@你的用户名/xxx@^1` 都能直接装。

### 1. 一次性准备：登录 npm

```powershell
npm login          # 浏览器里授权
npm whoami         # 应打印你的用户名
```

开了 2FA 的账号用 `npm login --auth-type=web` 登录，发布时必须带一次性验证码——
脚本会自动问你，详见 [6.5 开了 2FA 怎么发](#65-开了-2fa-怎么发)。

### 2. 一条命令发（仓库自带脚本）

> **别直接敲 ``.\scripts\publish-npm.ps1``。** Windows 默认的执行策略会拦下未签名的
> 本地脚本，报「未对文件 … 进行数字签名。无法在当前系统上运行该脚本」。
> 用下面这种 `powershell -ExecutionPolicy Bypass -File` 的写法：Bypass 只作用于这一次进程，
> 不会改动系统的执行策略。真被拦了也可以先 `Unblock-File .\scripts\publish-npm.ps1`。
>
> 嫌命令长就用仓库里的 `.cmd` 包装器，它内部就是这么调的、参数原样透传：
>
> ```powershell
> .\scripts\publish-npm.cmd -DryRun
> .\scripts\publish-npm.cmd              # 真发
> ```

```powershell
# 先干跑：跑完前五步，只打印要执行的 publish 命令
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-npm.ps1 -DryRun

# 真发（0.1.0 若已存在会被拦下）
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-npm.ps1

# 当前版本已发过：自动升一个补丁号（0.1.0 → 0.1.1）再发
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-npm.ps1 -Bump

# 自己指定版本号再发
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-npm.ps1 -Version 0.1.1

# 预发布（用户默认装不到，需要显式 @next）
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-npm.ps1 -Version 0.2.0-beta.1 -Tag next
```

脚本六步：

| 步骤 | 做什么 | 失败信息 |
| --- | --- | --- |
| 1/6 | 定位 `npm.cmd` 与 `node.exe`（不依赖终端 PATH） | `没找到 npm` |
| 2/6 | `npm whoami` 检查登录 | `还没登录` |
| 3/6 | `build-client.mjs --check`，过期就重建；再跑 `npm test` | `bundle 构建失败` / `npm test 未通过` |
| 4/6 | `npm pack --dry-run --json` 解析真实打包清单，逐项校验必需文件 + icon 体积 | `打包清单里缺少 X` |
| 5/6 | 可选改版本号；`npm view` 查重，已存在就拦（加 `-Bump` 则自动升补丁号再发） | `npm 上已经有 X 了` |
| 6/6 | `npm publish --tag latest --access public`（`-DryRun` 只打印） | 见下方报错表 |

### 3. 手敲版（不想用脚本）

```powershell
node scripts/build-client.mjs --check     # 产物必须最新
npm test                                  # 渲染冒烟
npm pack --dry-run                        # 看一眼真实文件清单（应为 35 个）
npm publish --access public
```

### 4. 发布后确认

```powershell
npm view dsh-mode-exchange version        # 应回 0.1.0
```

然后去 DSH：侧栏 **插件** → **添加插件** → 输入 `dsh-mode-exchange` → 可选「立即启用」。
插件列表里显示的名字来自 `locale/zh.json` 的 `meta.title`（当前是「模式交换」），
详情页正文来自 `meta.detail` 指向的 `docs/DETAIL.md`。

### 5. 升级版本

npm **不允许覆盖已发布版本**，任何改动都要先提版本号。交给脚本就行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-npm.ps1 -Bump
```

`-Bump` 发现当前版本已发布时，自动把补丁号加一并重写 `package.json`（预发布版会先落回正式号，
如 `0.1.1-beta.1` → `0.1.2`）。想自己控制版本号就用 `-Version`：

```powershell
npm version patch --no-git-tag-version     # 0.1.0 → 0.1.1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-npm.ps1
```

用户侧：插件页会显示「更新」按钮（版本号变了才出现）。

### 6. 发布常见报错

| 报错 | 原因 | 处理 |
| --- | --- | --- |
| `E403` + `Two-factor authentication ... required` | **账号开了 2FA**（最常见，不是包名问题） | 见下面的「开了 2FA 怎么发」 |
| `E403 Forbidden` / `cannot publish over` | 包名被别人占用，或版本号已存在 | `npm view <name> version` 查；改版本号 |
| `E402 Payment Required` | 用了像官方 scope 的名字（如 `@deepseek-ai/...`） | 改成 `@你的用户名/xxx` 或无 scope 名 |
| `EOTP` | 账号开了 2FA，且没带验证码 | 加 `-Otp 123456`，或让脚本当场问 |
| `EPUBLISHCONFLICT` | 版本号重复 | 提版本号 |
| `npm error Log files were not written` | 默认 cache 目录不可写（本机沙箱） | 先 `$env:npm_config_cache = "$PWD/.npm-cache"` |
| `ETIMEDOUT` | 网络到官方源不通 | 配代理，但**发布必须用官方 registry**，镜像只能读不能写 |
| `未对文件 … 进行数字签名` / `UnauthorizedAccess` | 执行策略拦下未签名脚本 | 用 `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-npm.ps1`；或 `Unblock-File .\scripts\publish-npm.ps1` |

### 6.5 开了 2FA 怎么发

账号开了 2FA（npm 的「Two-factor authentication for writes」）时，发布会直接撞上：

```
npm error code E403
npm error 403 403 Forbidden - PUT https://registry.npmjs.org/dsh-mode-exchange -
npm error Two-factor authentication or granular access token with bypass 2fa enabled is required
```

**这不是包名被占用**，是 npm 要求写操作带二次验证。两条路：

**办法 A：让脚本当场问你要验证码（最快）**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-npm.ps1
```

脚本撞到 2FA 错误时会立刻提示你输入 6 位码，输完马上重试。验证码 30 秒过期，
所以是「撞上再问」而不是「先问再发」。也可以直接带进去：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-npm.ps1 -Otp 123456
```

**办法 B：换一个免 2FA 的 granular token（一劳永逸，推荐）**

1. 打开 <https://www.npmjs.com/settings/你的用户名/tokens>，Generate New Token → **Granular Access Token**
2. 名字随便填（如 `dsh-publish`），Expiration 选一个够长的日期
3. Permissions 选 **Read and write**
4. Packages 选 **All packages**（或只勾 `dsh-mode-exchange`）
5. **勾上 `Bypass 2FA`** ← 关键
6. 生成后复制 `npm_...`，然后：

```powershell
# 把 npm_xxxxxxxx... 整段换成你刚复制的 token（别抄这一行的 x）
npm config set //registry.npmjs.org/:_authToken=npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 确认写进去了：应打印你的用户名
npm whoami

.\scripts\publish-npm.cmd   # 不再问码
```

> **token 只出现在 `npm config set` 的参数里。** 不要把它拼在别的命令后面，也不要贴进聊天、
> issue 或截图 —— 那等于把发布权限交给所有人。真贴出去了，立刻去
> <https://www.npmjs.com/settings/你的用户名/tokens> 把那个 token revoke，再生成一个新的。
> 写错了想重来：`npm config delete //registry.npmjs.org/:_authToken` 再设一次。

> token 等同于密码：不要提交进 git，不要贴进聊天记录。存在用户级 `.npmrc` 里即可。

### 7. 想进「发现」标签页（可选，另一步）

插件管理器里还有一条**索引源**通道（实验性 → 发现 → 添加索引源），填一个 http(s) JSON URL：

```json
{
  "format": 1,
  "title": "我的 DSH 插件",
  "plugins": [{
    "name": "dsh-mode-exchange",
    "title": { "en": "Mode Exchange", "zh": "模式交换" },
    "versions": [{
      "version": "0.1.0",
      "publishTimestamp": 1763596800,
      "source": { "type": "npm" }
    }]
  }]
}
```

索引必须 2xx、不重定向、UTF-8 JSON；`icon` 可以是内联 `data:` URL（≤ 32 KiB）或 https URL。
把 `index.json` 扔到 GitHub Pages / 对象存储即可。官方明确说明：**索引是第三方内容，
DSH 只校验格式、不验证声明**。

---

## 推送前自检（三条都应是绿的）

```powershell
node scripts/probe.js
node scripts/build-client.mjs --check
npm run smoke            # 九套冒烟（导入 / 注入 / 装配 / 宿主 / seed / 迁移 / 右键菜单 / 菜单→面板交接 / 渲染）
```

只跑渲染冒烟也行（`npm test`），但 `npm run smoke` 覆盖面大得多，发布前一并跑掉更稳。

另外 `node .verify/publishable.cjs` 会按 `.gitignore` 算出真实提交集并扫敏感信息
（真密钥、邮箱、私钥、内网 IP 等），当前结果为 `suspicious 0`。

---

## 推完之后

1. 仓库页右上 About 齿轮 → 填 Description、Website，勾 Topics：
   `dsh` `deepseek-harness` `plugin` `agent-mode`。
2. 需要给别人直接安装时打 tag / 发 Release（`v0.1.0`）。
3. 别人安装：发到 npm 后直接输入包名（见方案 D）；也可以
   `plugin_manager({action: 'install_bundle', target: '<仓库路径>'})`
   或 profile 里 `link:` 指到本地目录，**替换已安装版本必须重启 DSH 桌面端**。
