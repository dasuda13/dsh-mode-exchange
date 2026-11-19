# 把本插件发布到 GitHub

目标仓库：`https://github.com/dasuda13/dsh-mode-exchange`（已存在，含一次 Web 端 Initial commit：
`LICENSE` / `README.md` / `.gitignore`）。本目录当前**不是 git 仓库**（没有 `.git`），
本机也**没有安装 git**，所以下面给三条路，按推荐顺序排列。

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
cd C:\Users\Administrator\Documents\deepseek-harness\plugin-create-mode
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
> `SEC_E_NO_CREDENTIALS`，系统代理 127.0.0.1:7897 也不通。这个脚本用 Node 的
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
cd C:\Users\Administrator\Documents\deepseek-harness\plugin-create-mode
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
cd C:\Users\Administrator\Documents\deepseek-harness\plugin-create-mode
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
| `OpenSSL SSL_read: Connection reset` | 系统代理 `127.0.0.1:7897` 走 HTTPS 会重置 | 同上，清掉 git 的 http.proxy |
| `LF will be replaced by CRLF` | 换行符警告 | 脚本已设 `core.autocrlf false`，可忽略 |

> 本机实测：`Invoke-WebRequest` 与 `curl.exe` 走 schannel 都失败
> （`SEC_E_NO_CREDENTIALS`），系统代理 7897 走 HTTPS 一律 ECONNRESET。
> git 自带 OpenSSL 与自己的代理配置，所以上面的 `http.sslBackend openssl` /
> `http.proxy ""` 就是针对这一点——**不要指望 PowerShell 的网络栈能替你验证连通性**。

`.gitignore` 已合并本地规则 + GitHub 的 Node 模板，`git add .` 不会带入
`.verify/`（21 MB 桌面截图）、`.refs/`（宿主 asar 抽取副本）、`.dsh-vision-router/`
以及运行时数据目录（`.dsh/` `exports/` `backups/` `reports/` `migrations/`）。

## 方案 C：网页拖拽上传（不装 git、不给 token）

仓库页 → `Add file` → `Upload files` → 把 `src`、`scripts`、`docs`、`locale`、
`types` 五个文件夹和根目录下的 `index.js`、`package.json`、`package-lock/pnpm-lock.yaml`、
`cordis.patch.yml`、`icon.svg`、`CHANGELOG.md`、`LICENSE`、`README.md`、`.gitignore`
一起拖进去，填提交信息后 Commit。

缺点：浏览器上传对隐藏文件（`.gitignore`）和大量文件不友好，最容易漏文件；
`node_modules` 若被误拖进去会非常大。仅作为兜底。

---

## 推送前自检（三条都应是绿的）

```powershell
node scripts/probe.js
node scripts/build-client.mjs --check
node scripts/smoke-render.mjs
```

另外 `node .verify/publishable.cjs` 会按 `.gitignore` 算出真实提交集并扫敏感信息
（真密钥、邮箱、私钥、内网 IP 等），当前结果为 `suspicious 0`。

---

## 推完之后

1. 仓库页右上 About 齿轮 → 填 Description、Website，勾 Topics：
   `dsh` `deepseek-harness` `plugin` `agent-mode`。
2. 需要给别人直接安装时打 tag / 发 Release（`v0.1.0`）。
3. 别人安装：`plugin_manager({action: 'install_bundle', target: '<仓库路径>'})`
   或 profile 里 `link:` 指到本地目录，**替换已安装版本必须重启 DSH 桌面端**。