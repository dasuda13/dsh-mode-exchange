<#
.SYNOPSIS
    Push the current branch, retrying when the link to GitHub gets reset.
.DESCRIPTION
    The link to github.com is intermittent on this machine: one push fails with
    "Recv failure: Connection was reset" while the very next attempt succeeds.
    This script retries with a short backoff instead of making you re-run by hand.

    It does NOT force-push, does NOT commit, does NOT touch the remote URL.
    It only runs: git push origin <branch>
.EXAMPLE
    .\scripts\push-retry.cmd
.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\push-retry.ps1 -Attempts 8
#>
[CmdletBinding()]
param(
    [string]$Remote   = 'origin',
    [string]$Branch   = '',
    [int]$Attempts    = 6,
    [switch]$DryRun
)

# git writes progress to stderr; 'Stop' would turn that into a terminating error.
$ErrorActionPreference = 'Continue'

$Root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $Root

function Resolve-GitExe {
    $cmd = Get-Command git -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($p in @(
        (Join-Path $env:ProgramFiles 'Git\cmd\git.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Git\cmd\git.exe'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Git\cmd\git.exe'),
        (Join-Path $env:USERPROFILE 'scoop\shims\git.exe')
    )) {
        if ($p -and (Test-Path -LiteralPath $p)) { return $p }
    }
    return $null
}

$gitExe = Resolve-GitExe
if (-not $gitExe) {
    Write-Host 'git not found. Install Git for Windows, then reopen the terminal.' -ForegroundColor Red
    exit 1
}

if (-not $Branch) {
    $Branch = (& $gitExe rev-parse --abbrev-ref HEAD 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $Branch) {
        Write-Host 'cannot determine the current branch.' -ForegroundColor Red
        exit 1
    }
}

$head = (& $gitExe rev-parse HEAD 2>&1 | Out-String).Trim()
Write-Host "repo   : $Root" -ForegroundColor DarkGray
Write-Host "git    : $gitExe" -ForegroundColor DarkGray
Write-Host "branch : $Branch" -ForegroundColor DarkGray
Write-Host "HEAD   : $head" -ForegroundColor DarkGray

$ahead = (& $gitExe rev-list --count "origin/$Branch..HEAD" 2>&1 | Out-String).Trim()
if ($ahead -eq '0') {
    Write-Host ''
    Write-Host 'nothing to push, origin is already up to date.' -ForegroundColor Green
    exit 0
}
Write-Host "ahead  : $ahead commit(s)" -ForegroundColor DarkGray

if ($DryRun) {
    Write-Host ''
    Write-Host ("[dry run] would run: git push $Remote $Branch") -ForegroundColor Yellow
    exit 0
}

$pushArgs = @('push', $Remote, $Branch)
for ($i = 1; $i -le $Attempts; $i++) {
    Write-Host ''
    Write-Host ("attempt $i/$Attempts : git " + ($pushArgs -join ' ')) -ForegroundColor Cyan

    $out = (& $gitExe @pushArgs 2>&1 | Out-String)
    $code = $LASTEXITCODE

    if ($code -eq 0) {
        if ($out.Trim()) { Write-Host ('  ' + $out.Trim()) -ForegroundColor DarkGray }
        Write-Host ''
        Write-Host "done: https://github.com/dasuda13/dsh-mode-exchange/commit/$head" -ForegroundColor Green
        exit 0
    }

    # Trim the noise: only surface the interesting line.
    $line = (($out -split "`n") | Where-Object { $_ -match 'fatal:|error:|remote:|rejected' } | Select-Object -First 1)
    if (-not $line) { $line = (($out -split "`n") | Where-Object { $_.Trim() } | Select-Object -First 1) }
    Write-Host ('  ' + ($line -replace '\s+', ' ').Trim()) -ForegroundColor Red

    $transient = ($out -match 'Recv failure|Connection was reset|Connection reset|Could not connect|timed out|early EOF|RPC failed')
    if (-not $transient) {
        Write-Host ''
        Write-Host 'this does not look like a network glitch - not retrying.' -ForegroundColor Yellow
        Write-Host '  auth   : use a PAT as the password (Settings > Developer settings > Tokens)' -ForegroundColor Yellow
        Write-Host '  diverge: git pull --rebase, or force-push if you mean to overwrite' -ForegroundColor Yellow
        exit 1
    }

    if ($i -lt $Attempts) {
        $wait = [Math]::Min(2 * $i, 8)
        Write-Host "  network glitch, retrying in $wait s..." -ForegroundColor Yellow
        Start-Sleep -Seconds $wait
    }
}

Write-Host ''
Write-Host "push still failing after $Attempts attempts." -ForegroundColor Red
Write-Host '  check : git ls-remote --heads origin' -ForegroundColor Yellow
Write-Host '  tls   : git -c http.sslBackend=openssl ls-remote --heads origin' -ForegroundColor Yellow
Write-Host '  ssh   : git remote set-url origin git@github.com:dasuda13/dsh-mode-exchange.git' -ForegroundColor Yellow
exit 1
