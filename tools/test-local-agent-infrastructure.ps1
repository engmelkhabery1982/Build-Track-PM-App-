<#
.SYNOPSIS
Disposable acceptance checks for the local-agent watchdog and deterministic gate.

.DESCRIPTION
Does not call Ollama and never touches application source. It proves that taskkill
terminates a parent/child process tree within seconds and that an off-scope patch
is rejected before any build, test, or review model is called.
#>
[CmdletBinding()]
param([ValidateRange(3, 20)][int]$KillDeadlineSeconds = 8)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\', '/')
$scratch = Join-Path $projectRoot "tmp\local-agent-infrastructure-test-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Force -Path $scratch | Out-Null

function Wait-ForFile([string]$path, [int]$seconds) {
  $deadline = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $deadline) {
    if ((Test-Path -LiteralPath $path) -and (Get-Item -LiteralPath $path).Length -gt 0) { return }
    Start-Sleep -Milliseconds 100
  }
  throw "Timed out waiting for $path"
}

try {
  # A child is deliberately spawned from the parent; /T must remove both PIDs.
  $childPidPath = Join-Path $scratch 'child.pid'
  $parentOut = Join-Path $scratch 'parent.out'
  $parentErr = Join-Path $scratch 'parent.err'
  $childCommand = "`$child = Start-Process -FilePath powershell.exe -ArgumentList '-NoProfile -Command Start-Sleep -Seconds 120' -PassThru; Set-Content -LiteralPath '$childPidPath' -Value `$child.Id; Start-Sleep -Seconds 120"
  $parent = Start-Process -FilePath powershell.exe -ArgumentList "-NoProfile -Command $childCommand" -PassThru -WindowStyle Hidden -RedirectStandardOutput $parentOut -RedirectStandardError $parentErr
  Wait-ForFile $childPidPath 5
  $childPid = [int](Get-Content -LiteralPath $childPidPath -Raw)
  & "$env:SystemRoot\System32\taskkill.exe" /PID $parent.Id /T /F | Out-Null
  $deadline = (Get-Date).AddSeconds($KillDeadlineSeconds)
  while (((Get-Process -Id $parent.Id -ErrorAction SilentlyContinue) -or (Get-Process -Id $childPid -ErrorAction SilentlyContinue)) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 150 }
  if ((Get-Process -Id $parent.Id -ErrorAction SilentlyContinue) -or (Get-Process -Id $childPid -ErrorAction SilentlyContinue)) {
    throw "Tree-kill failed: parent=$($parent.Id), child=$childPid survived after ${KillDeadlineSeconds}s."
  }
  $parent.WaitForExit()
  Write-Output "PASS tree kill: parent $($parent.Id) and child $childPid exited within ${KillDeadlineSeconds}s."

  # This fake draft deliberately violates the strict Target Files contract.
  $taskPath = Join-Path $scratch 'watchdog-gate.ready.md'
  $draftPath = Join-Path $scratch 'offscope-draft.md'
  @(
    '## Disposable deterministic-gate test', '',
    '## Target Files', '', '- `src/App.tsx`', '',
    '## Source anchors', '', '- `function App`', '',
    '## Acceptance test commands', '', '- `node --version`', '',
    '## Required scope terms', '', '- `App`'
  ) | Set-Content -LiteralPath $taskPath -Encoding utf8
  @(
    'Scope alignment: APPROVED', '', '```diff', 'diff --git a/package.json b/package.json', '--- a/package.json', '+++ b/package.json', '@@ -1 +1 @@', '-old', '+new', '```'
  ) | Set-Content -LiteralPath $draftPath -Encoding utf8
  $rejected = $false
  try { & (Join-Path $PSScriptRoot 'validate-local-agent-draft.ps1') -TaskFile $taskPath -DraftFile $draftPath | Out-Null } catch {
    $rejected = $_.Exception.Message -match 'outside Target Files'
    Write-Output 'PASS deterministic gate: off-scope patch rejected before validation build.'
  }
  if (-not $rejected) { throw 'Deterministic gate accepted an off-scope patch.' }

} finally {
  if (Test-Path -LiteralPath $scratch) {
    foreach ($attempt in 1..10) {
      try { Remove-Item -LiteralPath $scratch -Force -Recurse -ErrorAction Stop; break } catch { Start-Sleep -Milliseconds 250 }
    }
  }
}
