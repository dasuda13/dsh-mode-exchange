<#
.SYNOPSIS
    Push the current branch, retrying when the link to GitHub gets reset.
.DESCRIPTION
    On this machine the link to github.com fails intermittently. Two causes show
    up, and the script handles both:

      1. The resolver hands out a GitHub edge address that accepts a TCP
         connection and then stalls the TLS handshake, so git waits ~21 s and
         ends with "Recv failure: Connection was reset". Flushing the DNS cache
         may hand out a different address, so that is tried between attempts.
      2. The direct route to that edge node is simply down. A local HTTP proxy
         (Clash and friends listen on 127.0.0.1) usually gets through, so the
         script looks for one and routes git through it when it is found.

    It does NOT force-push, does NOT commit, does NOT touch the remote URL.
    It only runs: git push origin <branch>
.PARAMETER Remote
    Remote name. Defaults to origin.
.PARAMETER Branch
    Branch to push. Defaults to the current branch.
.PARAMETER Attempts
    How many times to try before giving up. Defaults to 6.
.PARAMETER DryRun
    Print what would happen and exit without touching the network.
.PARAMETER Proxy
    HTTP proxy URL to use, e.g. http://127.0.0.1:7897. Default: auto-detect.
.PARAMETER NoProxy
    Never use a proxy, even if one is listening.
.EXAMPLE
    .\scripts\push-retry.cmd
.EXAMPLE
    .\scripts\push-retry.cmd -Attempts 10
.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\push-retry.ps1 -DryRun
#>
[CmdletBinding()]
param(
    [string]$Remote   = 'origin',
    [string]$Branch   = '',
    [int]$Attempts    = 6,
    [string]$Proxy     = '',
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

# Clash / V2Ray / Shadowsocks clients all listen on a local HTTP proxy port.
# Probing them is cheap, and routing git through one is what actually works
# when the direct route to the GitHub edge node is black-holed.
function Find-LocalProxy {
    foreach ($port in @(7897, 7890, 10809, 10808, 1080, 8889, 8080)) {
        if (Test-LocalPort $port) { return ('http://127.0.0.1:' + $port) }
    }
    return $null
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

# The address in the DNS cache is what git keeps failing on, so drop it and show
# what the resolver picks next time.
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
$proxyUrl = ""
if (-not $NoProxy) {
    if ($Proxy) { $proxyUrl = $Proxy } else { $proxyUrl = Find-LocalProxy }
}
if ($proxyUrl) {
    Write-Host "proxy  : $proxyUrl" -ForegroundColor DarkGray
} elseif ($NoProxy) {
    Write-Host "proxy  : disabled (-NoProxy)" -ForegroundColor DarkGray
} else {
    Write-Host "proxy  : none listening (trying a direct connection)" -ForegroundColor DarkGray
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
    $via = ""
    if ($proxyUrl) { $via = " (via $proxyUrl)" }
    Write-Host ("[dry run] would run: git push $Remote $Branch" + $via) -ForegroundColor Yellow
    exit 0
}

$pushArgs = @('push', $Remote, $Branch)
if ($proxyUrl) {
    # -c has to come before the subcommand, so build the config args separately.
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
Write-Host '  proxy : turn on your proxy client, then retry (or -Proxy http://127.0.0.1:7897)' -ForegroundColor Yellow
Write-Host '  dns   : ipconfig /flushdns in an elevated shell, then retry' -ForegroundColor Yellow
Write-Host '  check : git ls-remote --heads origin' -ForegroundColor Yellow
Write-Host '  tls   : git -c http.sslBackend=openssl ls-remote --heads origin' -ForegroundColor Yellow
Write-Host '  ssh   : git remote set-url origin git@github.com:dasuda13/dsh-mode-exchange.git' -ForegroundColor Yellow
exit 1
