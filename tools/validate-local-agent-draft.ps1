<#
.SYNOPSIS
Deterministically validates an untrusted local-agent patch in a disposable Git worktree.

.DESCRIPTION
No language model participates. The gate rejects a draft unless its patch applies,
touches only Target Files declared by the work order, and passes lint, build, and
the exact acceptance-test commands declared by that work order.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$TaskFile,
  [Parameter(Mandatory)][string]$DraftFile,
  [ValidateRange(60, 1800)][int]$TimeoutSeconds = 900
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\', '/')
$validationRoot = Join-Path $projectRoot 'tmp\local-agent-validation'
New-Item -ItemType Directory -Force -Path $validationRoot | Out-Null

function Get-Terms([string]$content, [string]$heading) {
  $match = [regex]::Match($content, "(?ms)^## $([regex]::Escape($heading))\s*$\r?\n(.*?)(?=^## |\z)")
  if (-not $match.Success) { return @() }
  return @([regex]::Matches($match.Groups[1].Value, '`([^`]+)`') | ForEach-Object { $_.Groups[1].Value.Trim() } | Where-Object { $_ })
}
function Invoke-CheckedCommand([string]$command, [string]$workingDirectory, [string]$logPath) {
  "`n> $command" | Add-Content -LiteralPath $logPath -Encoding utf8
  Push-Location $workingDirectory
  try { & cmd.exe /d /c $command 1>>$logPath 2>&1 } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { throw "Validation command failed ($LASTEXITCODE): $command" }
}

$task = Get-Content -LiteralPath $TaskFile -Raw -Encoding utf8
$draft = Get-Content -LiteralPath $DraftFile -Raw -Encoding utf8
$targets = Get-Terms $task 'Target Files'
$tests = Get-Terms $task 'Acceptance test commands'
if (-not $targets.Count) { throw 'Deterministic gate rejected: work order has no Target Files.' }
if (-not $tests.Count) { throw 'Deterministic gate rejected: work order has no Acceptance test commands.' }
$patchMatch = [regex]::Match($draft, '(?ms)```diff\s*(.*?)(?:^```\s*$)')
if (-not $patchMatch.Success) { throw 'Deterministic gate rejected: draft has no fenced unified diff.' }
$patch = $patchMatch.Groups[1].Value
$runId = "$(Get-Date -Format 'yyyyMMdd-HHmmss')-$([guid]::NewGuid().ToString('N').Substring(0,8))"
$patchPath = Join-Path $validationRoot "$runId.patch"
$logPath = Join-Path $validationRoot "$runId.log"
$worktreePath = Join-Path $validationRoot "worktree-$runId"
Set-Content -LiteralPath $patchPath -Value $patch -Encoding utf8

$patchFiles = @([regex]::Matches($patch, '(?m)^\+\+\+ b/(.+?)\s*$') | ForEach-Object { $_.Groups[1].Value.Trim() } | Where-Object { $_ -and $_ -ne '/dev/null' })
$outside = @($patchFiles | Where-Object { $_ -notin $targets })
if (-not $patchFiles.Count -or $outside.Count) { throw "Deterministic gate rejected: patch files outside Target Files: $($outside -join ', ')" }

try {
  & git.exe -c safe.directory="$projectRoot" apply --check $patchPath
  if ($LASTEXITCODE -ne 0) { throw 'Deterministic gate rejected: git apply --check failed.' }
  & git.exe -c safe.directory="$projectRoot" worktree add --detach $worktreePath HEAD
  if ($LASTEXITCODE -ne 0) { throw 'Deterministic gate rejected: disposable worktree could not be created.' }
  Push-Location $worktreePath
  try { & git.exe apply $patchPath } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { throw 'Deterministic gate rejected: patch could not be applied in disposable worktree.' }
  $worktreePackage = Get-Content -LiteralPath (Join-Path $worktreePath 'package.json') -Raw -Encoding utf8 | ConvertFrom-Json
  $lintCommand = if ($worktreePackage.scripts.lint) { 'npm run lint' } else { 'npx tsc -b --pretty false' }
  Invoke-CheckedCommand $lintCommand $worktreePath $logPath
  Invoke-CheckedCommand 'npm run build' $worktreePath $logPath
  foreach ($testCommand in $tests) { Invoke-CheckedCommand $testCommand $worktreePath $logPath }
  Write-Output "Deterministic gate passed. Log: $logPath"
} finally {
  if (Test-Path -LiteralPath $worktreePath) {
    & git.exe -c safe.directory="$projectRoot" worktree remove --force $worktreePath 2>$null
  }
}
