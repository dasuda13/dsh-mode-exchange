<#
.SYNOPSIS
    把 dsh-mode-exchange 发布到 npm registry（供 DSH 用户在「插件 -> 添加插件」里按包名安装）。

.DESCRIPTION
    六步：定位 npm -> 检查登录 -> 构建与测试 -> 打包自检 -> 版本确认 -> 发布。
    默认会真的发布；加 -DryRun 只做前五步，最后一步只打印命令。

.PARAMETER Version
    发布前先把 package.json 的 version 改成这个值（SemVer）。不传则沿用当前版本。

.PARAMETER Tag
    dist-tag，默认 latest。发预发布版时用 next。

.PARAMETER Otp
    开了两步验证（2FA）时的一次性验证码；也可以在 npm 提示时手动输入。

.PARAMETER Bump
    当前版本已经发布过时，自动升一个补丁号（0.1.0 -> 0.1.1）再发。
    不加这个开关时脚本只会提示下一条命令，不会擅自改版本号。

.PARAMETER DryRun
    不发布，只跑自检并打印将要执行的命令。

.PARAMETER SkipTests
    跳过 npm test（不建议）。

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-npm.ps1 -DryRun

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-npm.ps1 -Version 0.1.1
#>
[CmdletBinding()]
param(
    [string]$Version,
    [string]$Tag = 'latest',
    [string]$Otp,
    [switch]$Bump,
    [switch]$DryRun,
    [switch]$SkipTests
)

# 注意：不能设成 Stop。npm 会把正常进度写到 stderr，PS 5.1 在重定向时
# 会把它当成 terminating error。全部靠显式 $LASTEXITCODE 判断。
$ErrorActionPreference = 'Continue'

# node / npm 的输出是 UTF-8，而中文 Windows 的控制台默认代码页是 936(GBK)，
# 不统一的话子进程日志会在终端里显示成「浜х墿鏄渶鏂扮殑」这种乱码。
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {
    # 极少数嵌入式控制台不允许改代码页，忽略即可，不影响发布流程。
}

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Write-Step([string]$text) {
    Write-Host ''
    Write-Host "==> $text" -ForegroundColor Cyan
}

function Fail([string]$message) {
    Write-Host "失败：$message" -ForegroundColor Red
    exit 1
}

# PowerShell 5.1 在 `... 2>&1` 重定向原生程序时，会把它的 stderr 包成
# ErrorRecord（NativeCommandError）——npm 打印几十行 notice 就会刷屏，真正的报错反被埋掉。
# 用「临时 .cmd 包裹 + 文件重定向」绕开：PowerShell 全程看不到子进程 stderr，
# 输出由我们按 UTF-8 读回来，中文也不会乱码。
function Invoke-NativeCapture([string]$exe, [string[]]$arguments) {
    $stamp = [guid]::NewGuid().ToString('N')
    $bat = Join-Path $env:TEMP "dsh-run-$stamp.cmd"
    $outFile = Join-Path $env:TEMP "dsh-run-$stamp.out.txt"
    $errFile = Join-Path $env:TEMP "dsh-run-$stamp.err.txt"
    $quoted = @($arguments | ForEach-Object { if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ } })
    $line = '"' + $exe + '" ' + ($quoted -join ' ') + ' > "' + $outFile + '" 2> "' + $errFile + '"'
    $script = "@echo off`r`n" + $line + "`r`nexit /b %ERRORLEVEL%`r`n"
    [System.IO.File]::WriteAllText($bat, $script, [System.Text.Encoding]::Default)
    try {
        & cmd.exe /c $bat | Out-Null
        $code = $LASTEXITCODE
        $out = if (Test-Path $outFile) { [System.IO.File]::ReadAllText($outFile, [System.Text.Encoding]::UTF8) } else { '' }
        $err = if (Test-Path $errFile) { [System.IO.File]::ReadAllText($errFile, [System.Text.Encoding]::UTF8) } else { '' }
        return [pscustomobject]@{ ExitCode = $code; StdOut = $out; StdErr = $err }
    } finally {
        Remove-Item $bat, $outFile, $errFile -Force -ErrorAction SilentlyContinue
    }
}

# package.json 是 UTF-8 无 BOM；Get-Content -Raw 在 PS 5.1 会按 ANSI 解码，
# 把中文 description 读成乱码后 ConvertFrom-Json 会直接报 Invalid object passed in。
function Read-JsonFile([string]$path) {
    $raw = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    return $raw | ConvertFrom-Json
}

# ---------------------------------------------------------------- 1/6 定位 npm
Write-Step '1/6 定位 npm'
$npmExe = $null
# Get-Command npm 常返回 npm.ps1 包装器，它的 stderr 会混进 NativeCommandError 噪声，
# 优先用 npm.cmd。
foreach ($name in @('npm.cmd', 'npm')) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if (-not $cmd) { continue }
    # 优先 .cmd（原生可执行，stderr 不会被 PS 当成错误），实在没有才退回 npm.ps1
    if ($cmd.Source -like '*.cmd') { $npmExe = $cmd.Source; break }
    if (-not $npmExe) { $npmExe = $cmd.Source }
}
if (-not $npmExe) {
    foreach ($candidate in @(
        "$env:ProgramFiles\nodejs\npm.cmd",
        "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd",
        "$env:APPDATA\npm\npm.cmd"
    )) {
        if (Test-Path $candidate) { $npmExe = $candidate; break }
    }
}
if (-not $npmExe) { Fail '没找到 npm。先装 Node.js 22+，装完重开一个终端。' }
$nodeExe = Join-Path (Split-Path -Parent $npmExe) 'node.exe'
if (-not (Test-Path $nodeExe)) { $nodeExe = 'node' }
Write-Host "npm  : $npmExe"
Write-Host "node : $(& $nodeExe --version)"

$pkgPath = Join-Path $Root 'package.json'
if (-not (Test-Path $pkgPath)) { Fail "找不到 package.json（当前目录 $Root）" }
$pkg = Read-JsonFile $pkgPath

# ------------------------------------------------------------- 2/6 检查登录态
Write-Step '2/6 检查 npm 登录状态'
$res = Invoke-NativeCapture $npmExe @('whoami')
$whoami = $res.StdOut.Trim()
if ($res.ExitCode -ne 0) {
    $detail = (@($res.StdOut, $res.StdErr) -join "`n").Trim()
    if ($detail) { Write-Host $detail -ForegroundColor DarkGray }
    Fail '还没登录。先执行：npm login（浏览器里授权），或 npm login --auth-type=web。'
}
Write-Host "已登录为：$whoami"

$res = Invoke-NativeCapture $npmExe @('config', 'get', 'registry')
$registry = $res.StdOut.Trim()
Write-Host "registry：$registry"
if ($registry -notmatch 'registry\.npmjs\.org') {
    Write-Host '提示：当前 registry 不是官方源，发布到第三方源时用户可能装不到。' -ForegroundColor Yellow
}

# ----------------------------------------------------------- 3/6 构建与测试
Write-Step '3/6 构建产物 + 冒烟测试'
$checkArgs = @((Join-Path $Root 'scripts\build-client.mjs'), '--check')
$res = Invoke-NativeCapture $nodeExe $checkArgs
Write-Host $res.StdOut.Trim()
if ($res.ExitCode -ne 0) {
    Write-Host '产物不是最新，正在重新构建…' -ForegroundColor Yellow
    $res = Invoke-NativeCapture $nodeExe @((Join-Path $Root 'scripts\build-client.mjs'))
    Write-Host $res.StdOut.Trim()
    if ($res.ExitCode -ne 0) { Fail '客户端 bundle 构建失败。' }
}

if (-not $SkipTests) {
    $res = Invoke-NativeCapture $npmExe @('test', '--silent')
    if ($res.StdOut.Trim()) { Write-Host $res.StdOut.Trim() }
    if ($res.ExitCode -ne 0) {
        if ($res.StdErr.Trim()) { Write-Host $res.StdErr.Trim() -ForegroundColor Red }
        Fail 'npm test 未通过。'
    }
}

# --------------------------------------------------------------- 4/6 打包自检
Write-Step '4/6 校验实际会发布出去的文件'
# --json 让 npm 把清单打到 stdout，notice 走 stderr；吞掉 stderr 以免 PS 5.1
# 把 "npm notice" 当成 NativeCommandError 刷屏。
$res = Invoke-NativeCapture $npmExe @('pack', '--dry-run', '--json')
$packOut = $res.StdOut.Trim()
if ($res.ExitCode -ne 0) {
    if ($res.StdErr.Trim()) { Write-Host $res.StdErr.Trim() -ForegroundColor Red }
    Fail 'npm pack --dry-run 失败。'
}
$packInfo = $null
try { $packInfo = @($packOut | ConvertFrom-Json)[0] } catch { Fail 'npm pack --json 的输出无法解析。' }
$packed = @($packInfo.files | ForEach-Object { $_.path })
if ($packed.Count -eq 0) { Fail '打包清单为空，检查 package.json 的 files 字段。' }
Write-Host ('将发布 {0} 个文件，package {1:N1} kB / unpacked {2:N1} kB' -f $packed.Count, ($packInfo.size / 1024), ($packInfo.unpackedSize / 1024))

foreach ($required in @('cordis.patch.yml', 'index.js', 'icon.svg', 'locale/zh.json', 'locale/en.json', 'docs/DETAIL.md', 'docs/DETAIL.en.md', 'src/client/bundle.js', 'types/index.d.ts', 'assets/icon.png', 'screenshots.json')) {
    if ($packed -notcontains $required) { Fail '打包清单里缺少 ' + $required + ' —— 检查 package.json 的 files 字段。' }
}

# 宿主 iconOf() 读 manifest 的 icon 字段（现在指向 assets/icon.png），上限 256 KiB；
# icon.svg 保留为源文件，一并做体积检查。
foreach ($iconRel in @('icon.svg', 'assets/icon.png')) {
    $iconPath = Join-Path $Root $iconRel
    if (-not (Test-Path $iconPath)) { Fail "找不到 $iconRel —— 图标素材缺失。" }
    $iconBytes = (Get-Item $iconPath).Length
    if ($iconBytes -gt 262144) { Fail "$iconRel 为 $iconBytes 字节，超过宿主 256 KiB 上限。" }
    Write-Host "$iconRel：$iconBytes 字节（上限 262144）"
}

# ------------------------------------------------------------- 5/6 版本确认
Write-Step '5/6 确认版本号'
if ($Version) {
    if ($Version -notmatch '^\d+\.\d+\.\d+([-+].+)?$') { Fail "版本号 $Version 不是合法 SemVer。" }
    Write-Host "把 version 从 $($pkg.version) 改为 $Version"
    if (-not $DryRun) {
        & $npmExe version $Version --no-git-tag-version 2>&1 | Out-String | Write-Host
        if ($LASTEXITCODE -ne 0) { Fail 'npm version 执行失败。' }
        $pkg = Read-JsonFile $pkgPath
    }
}
Write-Host "将发布：$($pkg.name)@$($pkg.version)（dist-tag: $Tag）"

function Test-VersionTaken([string]$v) {
    $r = Invoke-NativeCapture $npmExe @('view', "$($pkg.name)@$v", 'version')
    return ($r.ExitCode -eq 0 -and $r.StdOut.Trim() -eq $v)
}

function Get-NextPatch([string]$v) {
    # 预发布版（0.1.1-beta.1）先落回正式号再加一，避免 0.1.0 -> 0.1.0-beta 这种发不出去的结果。
    $parts = ($v -split '[-+]')[0] -split '\.'
    return ('{0}.{1}.{2}' -f [int]$parts[0], [int]$parts[1], ([int]$parts[2] + 1))
}

if (Test-VersionTaken $pkg.version) {
    $taken = $pkg.version
    if ($Bump) {
        # 自动升补丁号：0.1.0 -> 0.1.1
        $next = Get-NextPatch $taken
        Write-Host "npm 上已有 $($pkg.name)@$taken，自动升到 $next" -ForegroundColor Yellow
        if (-not $DryRun) {
            & $npmExe version $next --no-git-tag-version 2>&1 | Out-String | Write-Host
            if ($LASTEXITCODE -ne 0) { Fail 'npm version 执行失败。' }
            $pkg = Read-JsonFile $pkgPath
        } else {
            $pkg.version = $next
        }
        if (Test-VersionTaken $pkg.version) {
            Fail "刚升到的 $($pkg.version) 也已经被占用了。手动指定 -Version x.y.z 再发。"
        }
        Write-Host "将发布：$($pkg.name)@$($pkg.version)（dist-tag: $Tag）"
    } else {
        $nextHint = Get-NextPatch $taken
        Write-Host ''
        Write-Host "npm 上已经有 $($pkg.name)@$taken 了（npm 不允许覆盖已发布的版本）。" -ForegroundColor Yellow
        Write-Host ''
        Write-Host '三选一：' -ForegroundColor Green
        Write-Host "  1) 让脚本自动升补丁号再发：   .\scripts\publish-npm.cmd -Bump"
        Write-Host "  2) 自己指定版本号：           .\scripts\publish-npm.cmd -Version $nextHint"
        Write-Host "  3) 只是忘了去重、想确认现状： npm view $($pkg.name) versions"
        exit 1
    }
}

# ------------------------------------------------------------------ 6/6 发布
Write-Step '6/6 发布'
$publishArgs = @('publish', '--tag', $Tag, '--access', 'public')
if ($Otp) { $publishArgs += @('--otp', $Otp) }

if ($DryRun) {
    Write-Host '（-DryRun 不发布）将执行：' -ForegroundColor Yellow
    Write-Host ("  {0} {1}" -f $npmExe, ($publishArgs -join ' '))
    Write-Host ''
    Write-Host '去掉 -DryRun 即真正发布。' -ForegroundColor Green
    exit 0
}

function Test-OtpRequired([string]$log) {
    return ($log -match 'Two-factor|two factor|2FA|bypass 2fa|one-time password|EOTP')
}

$res = Invoke-NativeCapture $npmExe $publishArgs

# 开了 2FA 时 npm 会拒绝发布。验证码 30 秒就过期，所以不提前问，而是
# 撞上这个错误后立刻在同一秒内提示输入、马上重试一次，避免「输完码已过期」。
if ($res.ExitCode -ne 0 -and (Test-OtpRequired (@($res.StdOut, $res.StdErr) -join "`n")) -and -not $Otp -and [Environment]::UserInteractive -and -not [Console]::IsInputRedirected) {
    Write-Host ''
    Write-Host '这个 npm 账号开启了两步验证（2FA），发布需要一次性验证码。' -ForegroundColor Yellow
    Write-Host '请打开验证器 App，输入当前的 6 位数字（直接回车则放弃）。' -ForegroundColor Yellow
    $entered = (Read-Host '验证码').Trim()
    if ($entered -match '^\d{6}$') {
        Write-Host '正在用这个验证码重新发布…' -ForegroundColor Cyan
        $publishArgs += @('--otp', $entered)
        $res = Invoke-NativeCapture $npmExe $publishArgs
    } else {
        Write-Host '没拿到有效的 6 位验证码，本次不重试。' -ForegroundColor DarkGray
    }
}

if ($res.ExitCode -ne 0) {
    $publishLog = (@($res.StdOut, $res.StdErr) -join "`n")
    $logLines = @($publishLog -split "`r?`n" | Where-Object { $_.Trim() })
    $errLines = @($logLines | Where-Object { $_ -match 'npm error|npm ERR!|EOTP|E403|E401|E402|ETIMEDOUT|ENOTFOUND|ECONNREFUSED' })
    if ($errLines.Count -gt 0) {
        $errLines | Select-Object -First 12 | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    } else {
        $logLines | Select-Object -Last 12 | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    }
    Write-Host ''

    # 按真实原因给建议。顺序很重要：403 + 2FA 不是「名称被占用」。
    if (Test-OtpRequired $publishLog) {
        Write-Host '原因：这个 npm 账号开启了两步验证（2FA），发布需要一次性验证码。' -ForegroundColor Yellow
        Write-Host ''
        Write-Host '  办法 A（最快）：在普通 PowerShell 里重跑，脚本会当场问你要验证码' -ForegroundColor Green
        Write-Host '      .\scripts\publish-npm.ps1'
        Write-Host '      也可以显式带上：.\scripts\publish-npm.ps1 -Otp 123456'
        Write-Host ''
        Write-Host '  办法 B（一劳永逸，之后不再问码）：改用勾了 Bypass 2FA 的 granular access token' -ForegroundColor Green
        Write-Host '      1) npm 网站 -> Access Tokens -> Generate New Token -> Granular Access Token'
        Write-Host '      2) 权限选 Read and write，Packages 选 All packages，勾上 "Bypass 2FA"'
        Write-Host '      3) 复制 token，然后在仓库目录执行：'
        Write-Host '         npm config set //registry.npmjs.org/:_authToken=<token>'
        Write-Host '      4) 再跑 .\scripts\publish-npm.ps1（不再需要验证码）'
    } elseif ($publishLog -match 'E402|payment required') {
        Write-Host '原因：包名像官方 scope 或需要付费。换成 @你的用户名/xxx 或改名。' -ForegroundColor Yellow
    } elseif ($publishLog -match 'E403') {
        Write-Host '原因：权限不足或包名不可用。先查一下是不是已被占用：' -ForegroundColor Yellow
        Write-Host "      $npmExe view $($pkg.name) version"
        Write-Host '      如果同名包已存在且不是你的，改 name 或改成 @你的用户名/dsh-mode-exchange。'
    } elseif ($publishLog -match 'E401|ENEEDAUTH|not logged in|401 Unauthorized') {
        Write-Host '原因：没登录或 token 失效。执行：' -ForegroundColor Yellow
        Write-Host "      $npmExe login"
        Write-Host '      npm 现在走网页授权，浏览器里点确认即可。'
    } elseif ($publishLog -match 'ETIMEDOUT|ENOTFOUND|ECONNREFUSED|socket hang up|network') {
        Write-Host '原因：网络问题。发布必须连官方源 registry.npmjs.org。' -ForegroundColor Yellow
        Write-Host '      先试：curl https://registry.npmjs.org/ ；需要代理就 npm config set proxy http://127.0.0.1:端口'
    }
    Write-Host ''
    Write-Host "完整日志：$(Join-Path $env:LOCALAPPDATA 'npm-cache\_logs')" -ForegroundColor DarkGray
    exit 1
}

# 发布成功。npm 的 notice 已在捕获里，这里只报关键行，避免刷屏。
$summary = @(@($res.StdOut, $res.StdErr) -join "`n" -split "`r?`n" |
    Where-Object { $_ -match '^\s*\+\s|shasum:|integrity:' -and $_ -notmatch 'npm notice' } |
    Select-Object -First 4)
if ($summary.Count -gt 0) { $summary | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray } }
Write-Host ''
Write-Host "完成：https://www.npmjs.com/package/$($pkg.name)" -ForegroundColor Green
Write-Host "用户安装：DSH 侧栏「插件」->「添加插件」-> 输入 $($pkg.name)"
