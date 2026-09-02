<#
.SYNOPSIS
Processes one ready local-agent work order without changing application source or data.

.DESCRIPTION
Moves a ready work order through inbox -> processing -> ready/rejected/needs-human.
Qwen may write only a draft under tmp. A deterministic non-LLM gate must pass before
any optional independent review. Codex remains the only merger.
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
$needsHumanRoot = Join-Path $ordersRoot 'needs-human'
$runRoot = Join-Path $projectRoot 'tmp\local-agent-runs'
$resultRoot = Join-Path $projectRoot 'tmp\local-agent-results'
foreach ($directory in @($inboxRoot, $processingRoot, $readyRoot, $rejectedRoot, $needsHumanRoot, $runRoot, $resultRoot)) { New-Item -ItemType Directory -Force -Path $directory | Out-Null }

function Get-SectionTerms([string]$content, [string]$heading) {
  $match = [regex]::Match($content, "(?ms)^## $([regex]::Escape($heading))\s*$\r?\n(.*?)(?=^## |\z)")
  if (-not $match.Success) { return @() }
  return @([regex]::Matches($match.Groups[1].Value, '`([^`]+)`') | ForEach-Object { $_.Groups[1].Value.Trim() } | Where-Object { $_ })
}

function Test-OllamaApi([string]$model, [string]$logPath) {
  try {
    $response = Invoke-RestMethod -Uri 'http://localhost:11434/api/ps' -Method Get -TimeoutSec 3
    $loaded = @($response.models | ForEach-Object { $_.name })
    "[$(Get-Date -Format s)] Ollama API healthy after termination. Loaded: $($loaded -join ', ')" | Add-Content -LiteralPath $logPath -Encoding utf8
    if ($loaded -contains $model) { throw "Ollama API still reports '$model' loaded after termination." }
    return $true
  } catch { throw "Post-termination Ollama health verification failed: $($_.Exception.Message)" }
}

function Invoke-BoundedLocalAgent([string]$scriptPath, [hashtable]$parameters, [int]$timeoutSeconds, [string]$model, [string]$logPath) {
  $runtimeRoot = Join-Path $projectRoot 'tmp\local-agent-runtime'
  New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
  $runId = "$(Get-Date -Format 'yyyyMMdd-HHmmss')-$([guid]::NewGuid().ToString('N').Substring(0,8))"
  $paramsPath = Join-Path $runtimeRoot "$runId.parameters.json"
  $stdoutPath = Join-Path $runtimeRoot "$runId.stdout.log"
  $stderrPath = Join-Path $runtimeRoot "$runId.stderr.log"
  $launcher = Join-Path $PSScriptRoot 'run-local-agent-child.ps1'
  $parameters | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $paramsPath -Encoding utf8
  $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`" -ScriptPath `"$scriptPath`" -ParametersPath `"$paramsPath`""
  $process = Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $arguments -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
  "[$(Get-Date -Format s)] Started local-agent child PID $($process.Id), model $model, timeout ${timeoutSeconds}s." | Add-Content -LiteralPath $logPath -Encoding utf8
  try {
    if (-not $process.WaitForExit($timeoutSeconds * 1000)) {
      "[$(Get-Date -Format s)] Timeout. Killing full child process tree for PID $($process.Id)." | Add-Content -LiteralPath $logPath -Encoding utf8
      & "$env:SystemRoot\System32\taskkill.exe" /PID $process.Id /T /F 2>&1 | Add-Content -LiteralPath $logPath -Encoding utf8
      $deadline = (Get-Date).AddSeconds(8)
      while ((Get-Process -Id $process.Id -ErrorAction SilentlyContinue) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 250 }
      if (Get-Process -Id $process.Id -ErrorAction SilentlyContinue) { throw "Watchdog could not terminate child process tree PID $($process.Id)." }
      & ollama stop $model 2>&1 | Add-Content -LiteralPath $logPath -Encoding utf8
      Test-OllamaApi $model $logPath | Out-Null
      throw "WATCHDOG_TIMEOUT: Local agent '$model' exceeded ${timeoutSeconds}s; taskkill /T /F succeeded and Ollama was health-checked."
    }
    $process.Refresh()
    if ($process.ExitCode -ne 0) { throw "Local agent '$model' exited with $($process.ExitCode): $((Get-Content -LiteralPath $stderrPath -Raw -ErrorAction SilentlyContinue).Trim())" }
    return @(Get-Content -LiteralPath $stdoutPath -ErrorAction Stop | Where-Object { $_.Trim() })
  } finally {
    Remove-Item -LiteralPath $paramsPath -Force -ErrorAction SilentlyContinue
  }
}

$mutex = New-Object System.Threading.Mutex($false, 'BuildTrackLocalAgentWorkOrder')
if (-not $mutex.WaitOne(0)) { Write-Output 'Another local-agent work order is already running. This item remains in inbox.'; exit 2 }
$processingPath = $null
$rejectedByGate = $false
try {
  $fullTaskPath = [System.IO.Path]::GetFullPath($TaskFile)
  $inboxPrefix = "$($inboxRoot.TrimEnd('\', '/'))$([System.IO.Path]::DirectorySeparatorChar)"
  if (-not $fullTaskPath.StartsWith($inboxPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $fullTaskPath -PathType Leaf)) { throw 'Work order must exist inside docs/agent-work-orders/inbox.' }
  if (-not $fullTaskPath.EndsWith('.ready.md', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Only *.ready.md work orders are accepted.' }
  $fileName = Split-Path -Leaf $fullTaskPath
  $processingPath = Join-Path $processingRoot $fileName
  Move-Item -LiteralPath $fullTaskPath -Destination $processingPath -Force
  $content = Get-Content -LiteralPath $processingPath -Raw -Encoding utf8
  $title = [regex]::Match($content, '(?m)^##\s+(.+?)\s*$').Groups[1].Value.Trim()
  $sourceFiles = Get-SectionTerms $content 'Target Files'
  $requiredTerms = Get-SectionTerms $content 'Required scope terms'
  if ([string]::IsNullOrWhiteSpace($title) -or $title -like '<*') { throw 'Missing concrete feature heading.' }
  if (-not $sourceFiles.Count) { throw 'Work order has no Target Files.' }
  if (-not $requiredTerms.Count) { throw 'Work order has no Required scope terms.' }
  $installedModels = (& ollama list 2>$null | Out-String)
  $reviewerModel = if ($installedModels -match '(?m)^llama3\.2:3b\s+') { 'llama3.2:3b' } elseif ($installedModels -match '(?m)^llama3\.1:8b\s+') { 'llama3.1:8b' } else { '' }
  if (-not $reviewerModel) { throw 'No independent local reviewer is installed; work order was not sent to Qwen.' }

  $runLog = Join-Path $runRoot "$((Get-Date).ToString('yyyyMMdd-HHmmss'))-work-order-$($fileName -replace '[^a-zA-Z0-9_.-]', '_').log"
  "[$(Get-Date -Format s)] Started: $title" | Set-Content -LiteralPath $runLog -Encoding utf8
  $draftOutput = Invoke-BoundedLocalAgent (Join-Path $PSScriptRoot 'invoke-ollama-implementation-draft.ps1') @{ Feature = $title; TaskFile = $processingPath; SourceFile = $sourceFiles; TimeoutSeconds = 135 } 165 'qwen2.5-coder:7b' $runLog
  $draftPath = $draftOutput | Select-Object -Last 1
  "[$(Get-Date -Format s)] Qwen draft: $draftPath" | Add-Content -LiteralPath $runLog -Encoding utf8
  try {
    & (Join-Path $PSScriptRoot 'test-local-agent-draft-scope.ps1') -TaskFile $processingPath -DraftFile $draftPath | Add-Content -LiteralPath $runLog -Encoding utf8
    & (Join-Path $PSScriptRoot 'validate-local-agent-draft.ps1') -TaskFile $processingPath -DraftFile $draftPath | Add-Content -LiteralPath $runLog -Encoding utf8
  } catch {
    $rejectedByGate = $true
    $scopeError = $_.Exception.Message
    $resultPath = Join-Path $resultRoot "$($fileName).result.md"
    @('# Local work order rejected by deterministic gate', '', "- Work order: $fileName", "- Reason: $scopeError", "- Draft: $draftPath", '- Result: No source, database, or Git file was changed.') | Set-Content -LiteralPath $resultPath -Encoding utf8
    Move-Item -LiteralPath $processingPath -Destination (Join-Path $rejectedRoot $fileName) -Force
    "[$(Get-Date -Format s)] Rejected by deterministic gate." | Add-Content -LiteralPath $runLog -Encoding utf8
    exit 1
  }
  # One reviewer runs only after Qwen has unloaded. Prefer the 3B reviewer
  # after its download; the installed Q4 8B model is the safe sequential fallback.
  $reviewOutput = Invoke-BoundedLocalAgent (Join-Path $PSScriptRoot 'invoke-ollama-phase-review.ps1') @{ Phase = "$title — independent draft challenge"; ReviewFile = @($sourceFiles + $draftPath); Model = $reviewerModel; Role = 'Governance Challenger'; TimeoutSeconds = 120; SaveResult = $true } 150 $reviewerModel $runLog
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
  if ($processingPath -and (Test-Path -LiteralPath $processingPath)) {
    $destination = if ($rejectedByGate) { $rejectedRoot } else { $needsHumanRoot }
    Move-Item -LiteralPath $processingPath -Destination (Join-Path $destination (Split-Path -Leaf $processingPath)) -Force
  }
  throw
} finally {
  $mutex.ReleaseMutex() | Out-Null
  $mutex.Dispose()
}

