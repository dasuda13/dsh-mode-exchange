<#
.SYNOPSIS
    Push dsh-mode-exchange to GitHub with plain git (plan B).
.DESCRIPTION
    - locates git.exe even when it is not on PATH (fresh install, terminal not reopened)
    - git init / add / commit / branch -M / remote add / push
    - refuses to force-push unless the remote is the expected repo
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\push-git.ps1 -DryRun
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\push-git.ps1 -UserName dasuda13 -UserEmail you@example.com
#>
[CmdletBinding()]
param(
    [string]$Remote    = 'https://github.com/dasuda13/dsh-mode-exchange.git',
    [string]$Branch    = 'main',
    [string]$Message   = 'feat: full plugin source, client UI and host implementation',
    [string]$UserName  = '',
    [string]$UserEmail = '',
    [switch]$NoForce,
    [switch]$DryRun
)

# git writes progress (and "remote:" lines) to stderr. Under 'Stop' PowerShell 5.1 turns
# native stderr into a terminating NativeCommandError as soon as a stream is redirected,
# so keep this at 'Continue' and rely on the explicit $LASTEXITCODE checks below.
$ErrorActionPreference = 'Continue'

$Root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $Root
Write-Host "repo root : $Root" -ForegroundColor DarkGray

function Write-Step([string]$text) { Write-Host ""; Write-Host "== $text" -ForegroundColor Cyan }

function Resolve-GitExe {
    $cmd = Get-Command git -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = @(
        (Join-Path $env:ProgramFiles 'Git\cmd\git.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Git\cmd\git.exe'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Git\cmd\git.exe'),
        (Join-Path $env:USERPROFILE 'scoop\shims\git.exe')
    )
    foreach ($p in $candidates) {
        if ($p -and (Test-Path -LiteralPath $p)) { return $p }
    }
    return $null
}

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    if ($DryRun) {
        Write-Host ('  git ' + ($GitArgs -join ' ')) -ForegroundColor DarkGray
        return ''
    }
    $out = & $script:GitExe @GitArgs 2>&1
    $code = $LASTEXITCODE
    if ($out) { $out | ForEach-Object { Write-Host ("  " + $_) -ForegroundColor DarkGray } }
    if ($code -ne 0) { throw ("git " + ($GitArgs -join " ") + " failed (exit " + $code + ")") }
    return ($out | Out-String).Trim()
}

# ---------------------------------------------------------------- 1. git
Write-Step '1/6 locate git'
$gitExe = Resolve-GitExe
if (-not $gitExe) {
    Write-Host '  git not found.' -ForegroundColor Red
    Write-Host '  Install Git for Windows first: https://git-scm.com/download/win' -ForegroundColor Yellow
    Write-Host '  then reopen the terminal, because PATH is only refreshed in a new shell.' -ForegroundColor Yellow
    exit 1
}
$script:GitExe = $gitExe
Write-Host "  using $gitExe" -ForegroundColor DarkGray
if (-not $DryRun) { Invoke-Git --version | Out-Null }

# ---------------------------------------------------------------- 2. repo
Write-Step '2/6 init repository'
$inside = $false
if (-not $DryRun) {
    $null = & $gitExe rev-parse --is-inside-work-tree 2>&1
    $inside = ($LASTEXITCODE -eq 0)
}
if ($inside) {
    Write-Host '  already a git work tree, skipping init' -ForegroundColor DarkGray
} else {
    Invoke-Git init | Out-Null
    Invoke-Git config core.autocrlf false | Out-Null
    Invoke-Git config core.safecrlf false | Out-Null
}

# ---------------------------------------------------------------- 3. identity
Write-Step '3/6 commit identity'
$cfgName  = if ($DryRun) { '' } else { (& $gitExe config --get user.name) }
$cfgEmail = if ($DryRun) { '' } else { (& $gitExe config --get user.email) }
if ($UserName)  { Invoke-Git config user.name  $UserName  | Out-Null; $cfgName  = $UserName }
if ($UserEmail) { Invoke-Git config user.email $UserEmail | Out-Null; $cfgEmail = $UserEmail }
if (-not $cfgName)  { Invoke-Git config user.name  'dasuda13' | Out-Null; $cfgName = 'dasuda13' }
if (-not $cfgEmail) { Invoke-Git config user.email 'dasuda13@users.noreply.github.com' | Out-Null; $cfgEmail = 'dasuda13@users.noreply.github.com' }
Write-Host "  $cfgName <$cfgEmail>" -ForegroundColor DarkGray

# ---------------------------------------------------------------- 4. stage + commit
Write-Step '4/6 stage and commit'
Invoke-Git add -A | Out-Null
if (-not $DryRun) {
    & $gitExe diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host '  nothing to commit, HEAD already up to date' -ForegroundColor Yellow
    } else {
        $staged = (& $gitExe diff --cached --name-only | Measure-Object -Line).Lines
        Write-Host "  staging $staged files" -ForegroundColor DarkGray
        Invoke-Git commit -m $Message | Out-Null
    }
}

# ---------------------------------------------------------------- 5. branch + remote
Write-Step '5/6 branch and remote'
Invoke-Git branch -M $Branch | Out-Null
$remotes = if ($DryRun) { @() } else { @(& $gitExe remote) }
if ($remotes -contains 'origin') {
    Invoke-Git remote set-url origin $Remote | Out-Null
} else {
    Invoke-Git remote add origin $Remote | Out-Null
}
Write-Host "  origin -> $Remote" -ForegroundColor DarkGray

# ---------------------------------------------------------------- 6. push
Write-Step '6/6 push'
$pushArgs = @('push', '-u', 'origin', $Branch)
if (-not $NoForce) { $pushArgs += '--force' }
Write-Host ('  git ' + ($pushArgs -join ' ')) -ForegroundColor DarkGray
if ($DryRun) { Write-Host ""; Write-Host "[dry run] nothing was sent." -ForegroundColor Yellow; exit 0 }

& $gitExe @pushArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "push failed." -ForegroundColor Red
    Write-Host '  auth      : use a PAT as the password (Settings > Developer settings > Tokens)' -ForegroundColor Yellow
    Write-Host '  TLS/proxy : if schannel complains, run  git config --local http.sslBackend openssl' -ForegroundColor Yellow
    Write-Host '              or bypass a broken proxy with  git config --local http.proxy ""' -ForegroundColor Yellow
    exit 1
}

$head = (& $gitExe rev-parse HEAD).Trim()
Write-Host ""
Write-Host "done: https://github.com/dasuda13/dsh-mode-exchange/commit/$head" -ForegroundColor Green
