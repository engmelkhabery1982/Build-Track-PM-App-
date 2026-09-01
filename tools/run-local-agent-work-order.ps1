<#
.SYNOPSIS
Processes one ready local-agent work order without changing application source or data.

.DESCRIPTION
Moves a ready work order through inbox -> processing -> ready/rejected. Qwen may
write only a draft under tmp; Llama reviews only a scope-approved draft. A single
corrective draft is allowed after a scope rejection. Codex remains the only merger.
#>
[CmdletBinding()]
param([Parameter(Mandatory)][string]$TaskFile)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\', '/')
$ordersRoot = Join-Path $projectRoot 'docs\agent-work-orders'
$inboxRoot = Join-Path $ordersRoot 'inbox'
$processingRoot = Join-Path $ordersRoot 'processing'
$readyRoot = Join-Path $ordersRoot 'ready'
$rejectedRoot = Join-Path $ordersRoot 'rejected'
$runRoot = Join-Path $projectRoot 'tmp\local-agent-runs'
$resultRoot = Join-Path $projectRoot 'tmp\local-agent-results'
foreach ($directory in @($inboxRoot, $processingRoot, $readyRoot, $rejectedRoot, $runRoot, $resultRoot)) { New-Item -ItemType Directory -Force -Path $directory | Out-Null }

function Get-SectionTerms([string]$content, [string]$heading) {
  $match = [regex]::Match($content, "(?ms)^## $([regex]::Escape($heading))\s*$\r?\n(.*?)(?=^## |\z)")
  if (-not $match.Success) { return @() }
  return @([regex]::Matches($match.Groups[1].Value, '`([^`]+)`') | ForEach-Object { $_.Groups[1].Value.Trim() } | Where-Object { $_ })
}

function Invoke-BoundedLocalAgent([string]$scriptPath, [hashtable]$parameters, [int]$timeoutSeconds, [string]$model) {
  $job = Start-Job -ScriptBlock {
    param($childScript, $childParameters)
    & $childScript @childParameters
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } -ArgumentList $scriptPath, $parameters
  try {
    $finished = Wait-Job -Job $job -Timeout $timeoutSeconds
    if (-not $finished) {
      Stop-Job -Job $job -ErrorAction SilentlyContinue
      & ollama stop $model 2>$null | Out-Null
      throw "Local agent '$model' exceeded the $timeoutSeconds-second process limit and was stopped."
    }
    $output = @(Receive-Job -Job $job -ErrorAction SilentlyContinue)
    if ($job.State -ne 'Completed') {
      $reason = $job.ChildJobs[0].JobStateInfo.Reason
      throw "Local agent '$model' failed: $reason"
    }
    return $output
  } finally {
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
  }
}

$mutex = New-Object System.Threading.Mutex($false, 'BuildTrackLocalAgentWorkOrder')
if (-not $mutex.WaitOne(0)) { Write-Output 'Another local-agent work order is already running. This item remains in inbox.'; exit 2 }
$processingPath = $null
try {
  $fullTaskPath = [System.IO.Path]::GetFullPath($TaskFile)
  $inboxPrefix = "$($inboxRoot.TrimEnd('\', '/'))$([System.IO.Path]::DirectorySeparatorChar)"
  if (-not $fullTaskPath.StartsWith($inboxPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $fullTaskPath -PathType Leaf)) { throw 'Work order must exist inside docs/agent-work-orders/inbox.' }
  if (-not $fullTaskPath.EndsWith('.ready.md', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Only *.ready.md work orders are accepted.' }
  $fileName = Split-Path -Leaf $fullTaskPath
  $processingPath = Join-Path $processingRoot $fileName
  Move-Item -LiteralPath $fullTaskPath -Destination $processingPath -Force
  $content = Get-Content -LiteralPath $processingPath -Raw
  $title = [regex]::Match($content, '(?m)^##\s+(.+?)\s*$').Groups[1].Value.Trim()
  $sourceFiles = Get-SectionTerms $content 'Source files'
  $requiredTerms = Get-SectionTerms $content 'Required scope terms'
  if ([string]::IsNullOrWhiteSpace($title) -or $title -like '<*') { throw 'Missing concrete feature heading.' }
  if (-not $sourceFiles.Count) { throw 'Work order has no Source files.' }
  if (-not $requiredTerms.Count) { throw 'Work order has no Required scope terms.' }

  $runLog = Join-Path $runRoot "$((Get-Date).ToString('yyyyMMdd-HHmmss'))-work-order-$($fileName -replace '[^a-zA-Z0-9_.-]', '_').log"
  "[$(Get-Date -Format s)] Started: $title" | Set-Content -LiteralPath $runLog -Encoding utf8
  $draftPath = $null
  $scopeError = ''
  foreach ($attempt in 1..2) {
    $draftOutput = Invoke-BoundedLocalAgent (Join-Path $PSScriptRoot 'invoke-ollama-implementation-draft.ps1') @{ Feature = $title; TaskFile = $processingPath; SourceFile = $sourceFiles; RevisionFeedback = $scopeError; TimeoutSeconds = 240 } 270 'qwen2.5-coder:7b'
    $draftPath = $draftOutput | Select-Object -Last 1
    "[$(Get-Date -Format s)] Qwen draft attempt ${attempt}: $draftPath" | Add-Content -LiteralPath $runLog -Encoding utf8
    try {
      & (Join-Path $PSScriptRoot 'test-local-agent-draft-scope.ps1') -TaskFile $processingPath -DraftFile $draftPath | Add-Content -LiteralPath $runLog -Encoding utf8
      $scopeError = ''
      break
    } catch {
      $scopeError = $_.Exception.Message
      "[$(Get-Date -Format s)] Scope rejection ${attempt}: $scopeError" | Add-Content -LiteralPath $runLog -Encoding utf8
    }
  }
  if ($scopeError) {
    $resultPath = Join-Path $resultRoot "$($fileName).result.md"
    @('# Local work order rejected', '', "- Work order: $fileName", "- Reason: $scopeError", "- Draft: $draftPath", '- Result: No source, database, or Git file was changed.') | Set-Content -LiteralPath $resultPath -Encoding utf8
    Move-Item -LiteralPath $processingPath -Destination (Join-Path $rejectedRoot $fileName) -Force
    "[$(Get-Date -Format s)] Rejected after one corrective attempt." | Add-Content -LiteralPath $runLog -Encoding utf8
    exit 1
  }
  $reviewOutput = Invoke-BoundedLocalAgent (Join-Path $PSScriptRoot 'invoke-ollama-phase-review.ps1') @{ Phase = "$title — independent draft challenge"; ReviewFile = @($sourceFiles + $draftPath); Model = 'llama3.1:8b'; Role = 'Governance Challenger'; TimeoutSeconds = 240; SaveResult = $true } 270 'llama3.1:8b'
  $reviewPath = $reviewOutput | Select-Object -Last 1
  $resultPath = Join-Path $resultRoot "$($fileName).result.md"
  @('# Local work order ready for Codex review', '', "- Work order: $fileName", "- Draft: $draftPath", "- Independent review: $reviewPath", '- Result: No source, database, or Git file was changed. Codex must inspect the patch and run acceptance tests before integration.') | Set-Content -LiteralPath $resultPath -Encoding utf8
  Move-Item -LiteralPath $processingPath -Destination (Join-Path $readyRoot $fileName) -Force
  "[$(Get-Date -Format s)] Ready for Codex review: $reviewPath" | Add-Content -LiteralPath $runLog -Encoding utf8
} catch {
  if ($runLog) { "[$(Get-Date -Format s)] FAILED: $($_.Exception.Message)" | Add-Content -LiteralPath $runLog -Encoding utf8 }
  if ($processingPath) {
    $failureResult = Join-Path $resultRoot "$(Split-Path -Leaf $processingPath).result.md"
    @('# Local work order failed', '', "- Work order: $(Split-Path -Leaf $processingPath)", "- Reason: $($_.Exception.Message)", '- Result: No source, database, or Git file was changed.') | Set-Content -LiteralPath $failureResult -Encoding utf8
  }
  if ($processingPath -and (Test-Path -LiteralPath $processingPath)) { Move-Item -LiteralPath $processingPath -Destination (Join-Path $rejectedRoot (Split-Path -Leaf $processingPath)) -Force }
  throw
} finally {
  $mutex.ReleaseMutex() | Out-Null
  $mutex.Dispose()
}

