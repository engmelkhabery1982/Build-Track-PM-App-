<#
.SYNOPSIS
Runs the BuildTrack local-agent pre-review team without changing application
source, migrations, data, or Git state.

.DESCRIPTION
Runs two sequential Ollama reviews (never in parallel) to stay below the RAM
budget on the local CPU-only machine. Reports are saved under
tmp\ollama-reviews and must be reviewed by Codex before any source change.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidateNotNullOrEmpty()][string]$Feature,
  [Parameter(Mandatory)][ValidateNotNullOrEmpty()][string[]]$ReviewFile,
  [switch]$SkipImplementationPlanner,
  [switch]$SkipGovernanceChallenger
)

$ErrorActionPreference = 'Stop'
$gate = Join-Path $PSScriptRoot 'invoke-ollama-phase-review.ps1'
if (-not (Test-Path -LiteralPath $gate -PathType Leaf)) {
  throw "Missing local review gate: $gate"
}

if (-not $SkipImplementationPlanner) {
  & $gate -Phase $Feature -ReviewFile $ReviewFile -Model 'qwen2.5-coder:7b' -Role 'Implementation Planner' -SaveResult
  if ($LASTEXITCODE -ne 0) { throw 'Local implementation-planner review failed.' }
}

# Run this only after Qwen exits. Two 7B/8B models must never be held in RAM
# together on this 16GB machine.
if (-not $SkipGovernanceChallenger) {
  & $gate -Phase $Feature -ReviewFile $ReviewFile -Model 'llama3.1:8b' -Role 'Governance Challenger' -SaveResult
  if ($LASTEXITCODE -ne 0) { throw 'Local governance-challenger review failed.' }
}

Write-Host 'Local agent pre-review is complete. Review saved reports before any implementation.' -ForegroundColor Green
