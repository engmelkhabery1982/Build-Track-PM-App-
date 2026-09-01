<# Registers and starts the local BuildTrack work-order watcher for the current interactive user. #>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\', '/')
$taskName = 'BuildTrack Local Agent Work Order Watcher'
$xmlPath = Join-Path $PSScriptRoot 'buildtrack-local-agent-watcher.xml'
if (-not (Test-Path -LiteralPath $xmlPath -PathType Leaf)) { throw "Task XML was not found: $xmlPath" }
$previousErrorAction = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$taskOutput = & schtasks.exe /Create /TN $taskName /XML $xmlPath /F 2>&1 | Out-String
$taskExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorAction
if ($taskExitCode -eq 0) {
  & schtasks.exe /Run /TN $taskName
  if ($LASTEXITCODE -eq 0) { Write-Output "Installed and started: $taskName"; exit 0 }
}

# Some Codex Windows sessions cannot create a Task Scheduler entry even for the
# interactive account. HKCU Run is a user-scoped fallback: it starts the same
# read-only watcher at login and does not elevate its privileges.
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$command = 'C:\Windows\System32\cmd.exe /d /c "F:\PM App\Project\tools\run-local-agent-watcher.cmd"'
New-ItemProperty -Path $runKey -Name 'BuildTrackLocalAgentWatcher' -PropertyType String -Value $command -Force | Out-Null
Start-Process -FilePath 'C:\Windows\System32\cmd.exe' -ArgumentList @('/d', '/c', '"F:\PM App\Project\tools\run-local-agent-watcher.cmd"') -WindowStyle Hidden
Write-Output "Task Scheduler registration was unavailable. Installed user-login watcher fallback. Scheduler output: $taskOutput"
