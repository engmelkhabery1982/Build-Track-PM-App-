<#
.SYNOPSIS
Runs a responsive local-only watcher for ready BuildTrack agent work orders.

.DESCRIPTION
The watcher reacts to files ending in *.ready.md in docs\agent-work-orders\inbox.
It also scans every five seconds as a recovery mechanism for missed Windows file
events. It never edits application source, database, or Git.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\', '/')
$inbox = Join-Path $projectRoot 'docs\agent-work-orders\inbox'
$runRoot = Join-Path $projectRoot 'tmp\local-agent-runs'
New-Item -ItemType Directory -Force -Path $inbox, $runRoot | Out-Null
$logPath = Join-Path $runRoot 'work-order-watcher.log'
function Write-WatcherLog([string]$message) { "[$(Get-Date -Format s)] $message" | Add-Content -LiteralPath $logPath -Encoding utf8 }
function Test-StableFile([string]$path) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return $false }
  $firstLength = (Get-Item -LiteralPath $path).Length
  Start-Sleep -Milliseconds 700
  return (Test-Path -LiteralPath $path -PathType Leaf) -and (Get-Item -LiteralPath $path).Length -eq $firstLength
}

$watcher = New-Object System.IO.FileSystemWatcher $inbox, '*.ready.md'
$watcher.IncludeSubdirectories = $false
$watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, Size'
$watcher.EnableRaisingEvents = $true
Write-WatcherLog 'Watcher started. Waiting for *.ready.md work orders.'
try {
  while ($true) {
    $readyFiles = Get-ChildItem -LiteralPath $inbox -Filter '*.ready.md' -File -ErrorAction SilentlyContinue | Sort-Object CreationTime
    foreach ($file in $readyFiles) {
      if (-not (Test-StableFile $file.FullName)) { continue }
      Write-WatcherLog "Dispatching $($file.Name)"
      try {
        & (Join-Path $PSScriptRoot 'run-local-agent-work-order.ps1') -TaskFile $file.FullName >> $logPath 2>&1
        Write-WatcherLog "Dispatch returned for $($file.Name) with exit code $LASTEXITCODE"
      } catch {
        Write-WatcherLog "Dispatch failed for $($file.Name): $($_.Exception.Message)"
      }
    }
    # Windows file events wake this call immediately; this timeout is only a recovery scan.
    $event = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::All, 5000)
    if ($event.TimedOut -eq $false) { Write-WatcherLog "File event: $($event.ChangeType) $($event.Name)" }
  }
} finally {
  $watcher.Dispose()
}

