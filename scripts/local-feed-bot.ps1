# Runs the job detector from a Pakistani IP and pushes data/ to GitHub.
# PPSC, Join Pak Army and Join Pak Navy block GitHub's foreign runners, so this
# covers them. Use a dedicated clone (it is hard-reset to origin/main each run):
#   git clone https://github.com/shahidjabbarpk/pakjobs-daily.git E:\Projects\pakjobs-feed-bot
#   powershell -File E:\Projects\pakjobs-feed-bot\scripts\local-feed-bot.ps1
# Scheduled hourly by scripts/install-feed-bot.ps1.

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo
$log = Join-Path $repo 'feed-bot.log'

function Log($msg) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" | Out-File -Append -Encoding utf8 $log }
function Git { & git @args 2>&1 | Out-Null; if ($LASTEXITCODE -ne 0) { throw "git $args failed" } }

function Sync-And-Scrape {
    Git fetch -q origin
    Git reset -q --hard origin/main
    $env:PYTHONIOENCODING = 'utf-8'
    $out = & python scraper/scrape.py 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw "scraper failed: $out" }
    Log ($out.Trim() -split "`n" | Select-Object -Last 7 | ForEach-Object { $_.Trim() })
}

try {
    for ($attempt = 1; $attempt -le 2; $attempt++) {
        Sync-And-Scrape
        & git add data 2>&1 | Out-Null
        & git diff --cached --quiet
        if ($LASTEXITCODE -eq 0) { Log 'no changes'; break }
        $new = (Get-Content data/meta.json -Raw | ConvertFrom-Json).new
        Git commit -q -m "jobs: $new new (local PK run $(Get-Date -Format s))"
        $env:GIT_TERMINAL_PROMPT = '0'
        & git push -q origin HEAD:main 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { Log "pushed ($new new)"; break }
        Log "push rejected (GitHub run pushed first) - retrying"
    }
} catch {
    Log "ERROR $_"
    exit 1
}

# keep the log small
if ((Get-Item $log).Length -gt 512KB) { Get-Content $log -Tail 400 | Set-Content -Encoding utf8 $log }
