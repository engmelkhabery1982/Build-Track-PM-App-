<# Validates a local draft against explicit required/forbidden terms in its work order. #>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$TaskFile,
  [Parameter(Mandatory)][string]$DraftFile
)

$ErrorActionPreference = 'Stop'
function Get-Terms([string]$content, [string]$heading) {
  $match = [regex]::Match($content, "(?ms)^## $([regex]::Escape($heading))\s*$\r?\n(.*?)(?=^## |\z)")
  if (-not $match.Success) { return @() }
  return @([regex]::Matches($match.Groups[1].Value, '`([^`]+)`') | ForEach-Object { $_.Groups[1].Value.Trim() } | Where-Object { $_ })
}

$task = Get-Content -LiteralPath $TaskFile -Raw
$draft = Get-Content -LiteralPath $DraftFile -Raw
$required = Get-Terms $task 'Required scope terms'
$forbidden = Get-Terms $task 'Forbidden off-scope terms'
$missing = @($required | Where-Object { $draft.IndexOf($_, [System.StringComparison]::OrdinalIgnoreCase) -lt 0 })
$foundForbidden = @($forbidden | Where-Object { $draft.IndexOf($_, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 })
$hasApproval = $draft -match '(?im)Scope alignment:\s*APPROVED'
$hasPatch = $draft -match '(?m)^diff --git |^\+\+\+ |^```diff'
if ($missing.Count -or $foundForbidden.Count -or -not $hasApproval -or -not $hasPatch) {
  throw "Draft scope rejected. Missing required: $($missing -join ', '); forbidden terms found: $($foundForbidden -join ', '); approved scope: $hasApproval; patch present: $hasPatch."
}
Write-Output 'Draft scope guard passed.'
