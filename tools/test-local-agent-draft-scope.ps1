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

$task = Get-Content -LiteralPath $TaskFile -Raw -Encoding utf8
$draft = Get-Content -LiteralPath $DraftFile -Raw -Encoding utf8
$patchMatch = [regex]::Match($draft, '(?ms)```diff\s*(.*?)(?:^```\s*$)')
$patch = if ($patchMatch.Success) { $patchMatch.Groups[1].Value } else { $draft }
$required = Get-Terms $task 'Required scope terms'
$forbidden = Get-Terms $task 'Forbidden off-scope terms'
$allowedFiles = Get-Terms $task 'Target Files'
$patchFiles = @([regex]::Matches($patch, '(?m)^\+\+\+ b/(.+?)\s*$') | ForEach-Object { $_.Groups[1].Value.Trim() } | Where-Object { $_ -and $_ -ne '/dev/null' })
$missing = @($required | Where-Object { $patch.IndexOf($_, [System.StringComparison]::OrdinalIgnoreCase) -lt 0 })
$foundForbidden = @($forbidden | Where-Object { $patch.IndexOf($_, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 })
$outsideFiles = @($patchFiles | Where-Object { $_ -notin $allowedFiles })
$hasApproval = $draft -match '(?im)Scope alignment:\s*APPROVED'
$hasPatch = $patch -match '(?m)^diff --git |^\+\+\+ '
if (-not $allowedFiles.Count) {
  throw 'Draft scope rejected: work order has no Target Files.'
}
if ($missing.Count -or $foundForbidden.Count -or $outsideFiles.Count -or -not $hasApproval -or -not $hasPatch) {
  throw "Draft scope rejected. Missing required from patch: $($missing -join ', '); forbidden terms in patch: $($foundForbidden -join ', '); files outside scope: $($outsideFiles -join ', '); approved scope: $hasApproval; patch present: $hasPatch."
}
Write-Output 'Draft scope guard passed.'
