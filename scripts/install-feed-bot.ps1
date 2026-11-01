# Registers an hourly Windows scheduled task that runs local-feed-bot.ps1 hidden.
# Usage: powershell -File scripts\install-feed-bot.ps1 [-BotDir E:\Projects\pakjobs-feed-bot]
param([string]$BotDir = 'E:\Projects\pakjobs-feed-bot')

$script = Join-Path $BotDir 'scripts\local-feed-bot.ps1'
if (-not (Test-Path $script)) { throw "Not found: $script (clone the repo to $BotDir first)" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`"" `
    -WorkingDirectory $BotDir
# hourly, offset from GitHub's :17 run
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(47) -RepetitionInterval (New-TimeSpan -Hours 1)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'PakJobs Feed Bot' -Action $action -Trigger $trigger -Settings $settings `
    -Description 'PakJobs Daily: detect new jobs from Pakistani IP and push to GitHub' -Force | Out-Null
Write-Output "Installed scheduled task 'PakJobs Feed Bot' (hourly at :47)"
