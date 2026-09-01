<#
.SYNOPSIS
Runs the active BuildTrack local-agent work item as a controlled draft/review cycle.

.DESCRIPTION
Designed for Windows Task Scheduler. It never changes project source or data.
It produces one Qwen implementation draft, then one Llama governance review,
sequentially, and writes a run log under tmp\local-agent-runs.
#>
[CmdletBinding()]
param(
  [string]$Feature = 'C2 Schedule versions and baseline comparison',
  [string]$TaskFile = 'docs\agent-work-orders\ACTIVE.md',
  [string[]]$SourceFile = @('src\data\baselineGovernance.ts', 'tests\phase0-governance.test.mjs')
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\', '/')
Set-Location $projectRoot
$runDirectory = Join-Path $projectRoot 'tmp\local-agent-runs'
New-Item -ItemType Directory -Force -Path $runDirectory | Out-Null
$runLog = Join-Path $runDirectory "$((Get-Date).ToString('yyyyMMdd-HHmmss'))-local-agent-queue.log"
$taskPath = Join-Path $projectRoot $TaskFile
if (-not (Test-Path -LiteralPath $taskPath -PathType Leaf)) { throw "Active work order not found: $TaskFile" }
$taskTitle = [regex]::Match((Get-Content -LiteralPath $taskPath -Raw), '(?m)^##\s+(.+?)\s*$').Groups[1].Value.Trim()
if (-not [string]::IsNullOrWhiteSpace($taskTitle)) { $Feature = $taskTitle }
$workOrderHash = (Get-FileHash -LiteralPath $taskPath -Algorithm SHA256).Hash
$completionMarker = Join-Path $runDirectory 'last-completed-work-order.sha256'
$rejectionMarker = Join-Path $runDirectory 'last-rejected-work-order.sha256'
if (((Test-Path -LiteralPath $completionMarker) -and ((Get-Content -LiteralPath $completionMarker -Raw).Trim() -eq $workOrderHash)) -or ((Test-Path -LiteralPath $rejectionMarker) -and ((Get-Content -LiteralPath $rejectionMarker -Raw).Trim() -eq $workOrderHash))) {
  "[$(Get-Date -Format s)] No new approved work order. Queue skipped without calling Ollama." | Set-Content -LiteralPath $runLog -Encoding utf8
  exit 0
}

try {
  "[$(Get-Date -Format s)] Starting local draft/review cycle: $Feature" | Set-Content -LiteralPath $runLog -Encoding utf8
  $draftPath = (& (Join-Path $PSScriptRoot 'invoke-ollama-implementation-draft.ps1') -Feature $Feature -TaskFile $TaskFile -SourceFile $SourceFile) | Select-Object -Last 1
  "[$(Get-Date -Format s)] Draft saved: $draftPath" | Add-Content -LiteralPath $runLog -Encoding utf8
  try {
    & (Join-Path $PSScriptRoot 'test-local-agent-draft-scope.ps1') -TaskFile $TaskFile -DraftFile $draftPath | Add-Content -LiteralPath $runLog -Encoding utf8
  } catch {
    $workOrderHash | Set-Content -LiteralPath $rejectionMarker -Encoding ascii
    throw $_
  }
  & (Join-Path $PSScriptRoot 'invoke-ollama-phase-review.ps1') -Phase "$Feature — independent draft challenge" -ReviewFile @($SourceFile + $draftPath) -Model 'llama3.1:8b' -Role 'Governance Challenger' -TimeoutSeconds 600 -SaveResult | Add-Content -LiteralPath $runLog -Encoding utf8
  $workOrderHash | Set-Content -LiteralPath $completionMarker -Encoding ascii
  "[$(Get-Date -Format s)] Completed. No source files or data were modified." | Add-Content -LiteralPath $runLog -Encoding utf8
} catch {
  "[$(Get-Date -Format s)] FAILED: $($_.Exception.Message)" | Add-Content -LiteralPath $runLog -Encoding utf8
  exit 1
}

