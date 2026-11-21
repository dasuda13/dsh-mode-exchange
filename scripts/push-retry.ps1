<#
.SYNOPSIS
    Push the current branch, retrying when the link to GitHub is flaky.
.DESCRIPTION
    Two things make 'git push' fail on this machine:

      1. DNS hands out a GitHub edge address that accepts the TCP connection
         and then stalls the TLS handshake, so git waits ~21 s and reports
         "Recv failure: Connection was reset".
      2. A direct route to that address may simply be blocked, while a local
         proxy gets through in about a second.

    The script therefore prefers a proxy: an explicit -Proxy, otherwise
    http.proxy from git config, otherwise the first local port that answers
    among 7897 / 7890 / 10809 / 10808 / 1080 / 8889 / 8080. Between attempts
    it also flushes the DNS cache, which is what fixes case 1.

    It does NOT force-push, does NOT commit, does NOT touch the remote URL.
    It only runs: git push <remote> <branch>
.PARAMETER Remote
    Remote name. Defaults to origin.
.PARAMETER Branch
    Branch to push. Defaults to the current branch.
.PARAMETER Attempts
    How many times to try before giving up. Defaults to 6.
.PARAMETER Proxy
    Use this proxy, e.g. http://127.0.0.1:7897. Skips detection.
.PARAMETER NoProxy
    Go direct even when git config or a listening port suggests a proxy.
.PARAMETER DryRun
    Print what would happen and exit without touching the network.
.EXAMPLE
    .\scripts\push-retry.cmd
.EXAMPLE
    .\scripts\push-retry.cmd -Attempts 10
.EXAMPLE
    .\scripts\push-retry.cmd -NoProxy
.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\push-retry.ps1 -DryRun
#>
[CmdletBinding()]
param(
    [string]$Remote   = 'origin',
    [string]$Branch   = '',
    [int]$Attempts    = 6,
    [string]$Proxy    = '',
    [switch]$NoProxy,
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

function Test-LocalPort([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(400)) { return $false }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function Find-LocalProxy {
    foreach ($port in @(7897, 7890, 10809, 10808, 1080, 8889, 8080)) {
        if (Test-LocalPort $port) { return ('http://127.0.0.1:' + $port) }
    }
    return $null
}

# A repo may already carry http.proxy; honour it so this script and a plain
# 'git push' behave the same way.
function Get-ConfiguredProxy {
    $value = (& $gitExe config --get http.proxy 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { return '' }
    return $value
}

function Get-PortFromProxy([string]$Url) {
    if (-not $Url) { return 0 }
    if ($Url -match ':([0-9]+)/?$') { return [int]$Matches[1] }
    return 0
}

function Get-RemoteHost([string]$Name) {
    $url = (& $gitExe remote get-url $Name 2>&1 | Out-String).Trim()
    if ($url -match '^[a-z+]+://(?:[^@/]+@)?([^/:]+)') { return $Matches[1] }
    if ($url -match '^[^@/]+@([^:/]+):') { return $Matches[1] }
    return $null
}

function Get-ResolvedAddress([string]$Name) {
    try {
        $addrs = [System.Net.Dns]::GetHostAddresses($Name) |
            Where-Object { $_.AddressFamily -eq 'InterNetwork' } |
            ForEach-Object { $_.IPAddressToString }
        return ($addrs -join ', ')
    } catch {
        return ''
    }
}

# The cached address is what git keeps failing on, so drop it and show what the
# resolver picks next time.
function Reset-DnsCache([string]$Name) {
    if (-not $Name) { return }
    $before = Get-ResolvedAddress $Name
    $out = & ipconfig /flushdns 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        $first = ($out -split [char]10 | Where-Object { $_.Trim() } | Select-Object -First 1)
        Write-Host ('  could not flush the DNS cache: ' + (($first -replace '\s+', ' ').Trim())) -ForegroundColor Yellow
        Write-Host '  run this in an elevated shell, or flush it yourself: ipconfig /flushdns' -ForegroundColor Yellow
        return
    }
    Start-Sleep -Milliseconds 300
    $after = Get-ResolvedAddress $Name
    if ($after -and $after -ne $before) {
        Write-Host "  $Name now resolves to $after (was $before)" -ForegroundColor DarkGray
    } elseif ($after) {
        Write-Host "  $Name still resolves to $after" -ForegroundColor DarkGray
    }
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

$proxyUrl = ''
$proxySource = ''
if ($NoProxy) {
    # -NoProxy wins over everything, including http.proxy already in git config.
} elseif ($Proxy) {
    $proxyUrl = $Proxy
    $proxySource = '-Proxy'
} else {
    $configured = Get-ConfiguredProxy
    if ($configured) {
        $proxyUrl = $configured
        $proxySource = 'git config'
    } else {
        $proxyUrl = Find-LocalProxy
        if ($proxyUrl) { $proxySource = 'auto-detected' }
    }
}

if ($NoProxy) {
    Write-Host 'proxy  : disabled (-NoProxy)' -ForegroundColor DarkGray
} elseif ($proxyUrl) {
    Write-Host "proxy  : $proxyUrl ($proxySource)" -ForegroundColor DarkGray
    $proxyPort = Get-PortFromProxy $proxyUrl
    if ($proxyPort -gt 0 -and -not (Test-LocalPort $proxyPort)) {
        Write-Host "  nothing is listening on port $proxyPort - start your proxy client first." -ForegroundColor Yellow
        Write-Host '  or pass -NoProxy to go direct, or -Proxy <url> to use another one.' -ForegroundColor Yellow
    }
} else {
    Write-Host 'proxy  : none configured, trying a direct connection' -ForegroundColor DarkGray
}

$remoteHost = Get-RemoteHost $Remote
if ($remoteHost) {
    Write-Host "remote : $remoteHost (resolves to $(Get-ResolvedAddress $remoteHost))" -ForegroundColor DarkGray
}

$ahead = (& $gitExe rev-list --count "origin/$Branch..HEAD" 2>&1 | Out-String).Trim()
if ($ahead -eq '0') {
    Write-Host ''
    Write-Host 'nothing to push, origin is already up to date.' -ForegroundColor Green
    exit 0
}
Write-Host "ahead  : $ahead commit(s)" -ForegroundColor DarkGray

if ($DryRun) {
    Write-Host ''
    $via = ''
    if ($NoProxy) { $via = ' (no proxy)' }
    elseif ($proxyUrl) { $via = " (via $proxyUrl)" }
    Write-Host ("[dry run] would run: git push $Remote $Branch" + $via) -ForegroundColor Yellow
    exit 0
}

# -c has to come before the subcommand, so build the config args separately.
$pushArgs = @('push', $Remote, $Branch)
if ($NoProxy) {
    # An empty value overrides http.proxy from git config for this one command.
    $pushArgs = @('-c', 'http.proxy=', 'push', $Remote, $Branch)
} elseif ($proxyUrl) {
    $pushArgs = @('-c', ('http.proxy=' + $proxyUrl), 'push', $Remote, $Branch)
}

for ($i = 1; $i -le $Attempts; $i++) {
    Write-Host ''
    Write-Host ('attempt ' + $i + '/' + $Attempts + ' : git ' + ($pushArgs -join ' ')) -ForegroundColor Cyan

    $out = (& $gitExe @pushArgs 2>&1 | Out-String)
    $code = $LASTEXITCODE

    if ($code -eq 0) {
        if ($out.Trim()) { Write-Host ('  ' + $out.Trim()) -ForegroundColor DarkGray }
        Write-Host ''
        Write-Host "done: https://github.com/dasuda13/dsh-mode-exchange/commit/$head" -ForegroundColor Green
        exit 0
    }

    # Trim the noise: only surface the interesting line.
    $line = (($out -split [char]10) | Where-Object { $_ -match 'fatal:|error:|remote:|rejected' } | Select-Object -First 1)
    if (-not $line) { $line = (($out -split [char]10) | Where-Object { $_.Trim() } | Select-Object -First 1) }
    Write-Host ('  ' + ($line -replace '\s+', ' ').Trim()) -ForegroundColor Red

    $transient = ($out -match 'Recv failure|Connection was reset|Connection reset|Could not connect|Failed to connect|timed out|early EOF|RPC failed')
    if (-not $transient) {
        Write-Host ''
        Write-Host 'this does not look like a network glitch - not retrying.' -ForegroundColor Yellow
        Write-Host '  auth   : use a PAT as the password (Settings > Developer settings > Tokens)' -ForegroundColor Yellow
        Write-Host '  diverge: git pull --rebase, or force-push if you mean to overwrite' -ForegroundColor Yellow
        exit 1
    }

    if ($i -lt $Attempts) {
        Write-Host '  network glitch - clearing the cached address before the next attempt.' -ForegroundColor Yellow
        Reset-DnsCache $remoteHost
        $wait = [Math]::Min(2 * $i, 8)
        Write-Host ('  retrying in ' + $wait + ' s...') -ForegroundColor Yellow
        Start-Sleep -Seconds $wait
    }
}

Write-Host ''
Write-Host ("push still failing after $Attempts attempts.") -ForegroundColor Red
Write-Host '  proxy : start your proxy client, then retry (or -Proxy http://127.0.0.1:7897)' -ForegroundColor Yellow
Write-Host '  dns   : ipconfig /flushdns in an elevated shell, then retry' -ForegroundColor Yellow
Write-Host '  check : git ls-remote --heads origin' -ForegroundColor Yellow
Write-Host '  ssh   : git remote set-url origin git@github.com:dasuda13/dsh-mode-exchange.git' -ForegroundColor Yellow
exit 1
