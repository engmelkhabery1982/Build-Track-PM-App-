<#
.SYNOPSIS
Runs the independent local Ollama review gate for one completed phase.

.DESCRIPTION
This wrapper always saves the report under tmp\ollama-reviews. It delegates
the read-only path validation and Ollama invocation to
invoke-ollama-phase-review.ps1. It does not access the application database.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidateNotNullOrEmpty()]
  [string]$Phase,

  [Parameter(Mandatory)]
  [ValidateNotNullOrEmpty()]
  [string[]]$ReviewFile,

  [string]$Model = 'qwen2.5-coder:7b'
)

$ErrorActionPreference = 'Stop'
$reviewScript = Join-Path $PSScriptRoot 'invoke-ollama-phase-review.ps1'
if (-not (Test-Path -LiteralPath $reviewScript -PathType Leaf)) {
  throw "The local phase-review utility is missing: $reviewScript"
}

Write-Host "Running independent local review gate for '$Phase'." -ForegroundColor Cyan
& $reviewScript -Phase $Phase -ReviewFile $ReviewFile -Model $Model -SaveResult
if ($LASTEXITCODE -ne 0) {
  throw "The independent local review gate failed (exit code $LASTEXITCODE)."
}
