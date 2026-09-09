[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = (& git rev-parse --show-toplevel).Trim()
if (-not $root) { throw 'PREFLIGHT FAIL: not inside a Git repository.' }
Set-Location -LiteralPath $root

$activePath = Join-Path $root 'docs/agent-work-orders/ACTIVE.md'
if (-not (Test-Path -LiteralPath $activePath)) { throw 'PREFLIGHT FAIL: ACTIVE.md is missing.' }
$active = @{}
Get-Content -LiteralPath $activePath | ForEach-Object {
    if ($_ -match '^([A-Z_][A-Z0-9_]*)=(.*)$') { $active[$matches[1]] = $matches[2].Trim() }
}

foreach ($key in @('ACCEPTED_HEAD','CLOUD_BASE_BRANCH','DELIVERY_BRANCH','CURRENT_FEATURE','MODIFY_ALLOWLIST','FORBIDDEN')) {
    if (-not $active.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($active[$key])) {
        throw "PREFLIGHT FAIL: ACTIVE.$key is missing."
    }
}

foreach ($dynamicKey in @('CORRECTION_FILE','EXECUTION_PLAN_FILE')) {
    if ($active.ContainsKey($dynamicKey) -and -not [string]::IsNullOrWhiteSpace($active[$dynamicKey])) {
        $dynamicPath = Join-Path $root $active[$dynamicKey]
        if (-not (Test-Path -LiteralPath $dynamicPath -PathType Leaf)) {
            throw "PREFLIGHT FAIL: ACTIVE.$dynamicKey points to missing file: $($active[$dynamicKey])"
        }
    }
}

$status = @(& git status --porcelain=v1 --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'PREFLIGHT FAIL: git status failed.' }
if ($status.Count -gt 0) { throw "PREFLIGHT FAIL: working tree is not clean.`n$($status -join "`n")" }

$head = (& git rev-parse HEAD).Trim()
$branch = (& git branch --show-current).Trim()
$workBranchPattern = if ($active.WORK_BRANCH_PATTERN) { $active.WORK_BRANCH_PATTERN } else { '^' + [regex]::Escape($active.DELIVERY_BRANCH) + '$' }
if ($branch -notmatch $workBranchPattern) {
    throw "PREFLIGHT FAIL: current branch '$branch' does not match WORK_BRANCH_PATTERN '$workBranchPattern'."
}
$lineageVerification = 'ANCESTOR'
& git cat-file -e "$($active.ACCEPTED_HEAD)^{commit}" 2>$null
$acceptedExists = $LASTEXITCODE -eq 0
if ($acceptedExists) {
    & git merge-base --is-ancestor $active.ACCEPTED_HEAD $head
    if ($LASTEXITCODE -ne 0) { throw "PREFLIGHT FAIL: HEAD $head is not based on accepted $($active.ACCEPTED_HEAD)." }
} else {
    if ($active.ACCEPTED_LINEAGE_MODE -ne 'ANCESTOR_OR_REMOTE_MAIN_ATTESTATION') {
        throw "PREFLIGHT FAIL: accepted commit is missing and attestation fallback is disabled."
    }
    $remoteHead = (& git rev-parse "origin/$($active.CLOUD_BASE_BRANCH)").Trim()
    if ($LASTEXITCODE -ne 0 -or $remoteHead -ne $head) {
        throw "PREFLIGHT FAIL: shallow history requires HEAD to equal pulled origin/$($active.CLOUD_BASE_BRANCH)."
    }
    $attestationPath = Join-Path $root $active.ACCEPTED_ATTESTATION_FILE
    if (-not (Test-Path -LiteralPath $attestationPath -PathType Leaf)) { throw 'PREFLIGHT FAIL: accepted attestation is missing.' }
    $canonicalContent = [System.IO.File]::ReadAllText($attestationPath).TrimStart([char]0xFEFF).Replace("`r`n", "`n").Replace("`r", "`n")
    $canonicalBytes = [System.Text.UTF8Encoding]::new($false).GetBytes($canonicalContent)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try { $actualHash = ([System.BitConverter]::ToString($sha256.ComputeHash($canonicalBytes))).Replace('-', '') }
    finally { $sha256.Dispose() }
    if ($actualHash -ne $active.ACCEPTED_ATTESTATION_SHA256) { throw 'PREFLIGHT FAIL: accepted attestation hash mismatch.' }
    $lineageVerification = 'REMOTE_MAIN_ATTESTATION'
}

$required = @(
    'AGENTS.md',
    'docs/agent-work-orders/AGENT_START_HERE_AR.md',
    'docs/agent-work-orders/ACTIVE.md',
    'docs/agent-work-orders/NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR.md',
    'docs/agent-work-orders/FEATURE_READ_PACKS_AR.md',
    'tools/agent-delivery-gate.ps1'
)
foreach ($path in $required) {
    if (-not (Test-Path -LiteralPath (Join-Path $root $path))) { throw "PREFLIGHT FAIL: required file missing: $path" }
}

[ordered]@{
    result = 'PASS'
    repository = $root
    branch = $branch
    required_base_branch = $active.CLOUD_BASE_BRANCH
    delivery_branch = $active.DELIVERY_BRANCH
    head = $head
    accepted_ancestor = $active.ACCEPTED_HEAD
    lineage_verification = $lineageVerification
    feature = $active.CURRENT_FEATURE
    correction_file = $active.CORRECTION_FILE
    execution_plan_file = $active.EXECUTION_PLAN_FILE
    modify_allowlist = $active.MODIFY_ALLOWLIST -split '\|'
    conditional_modify = $active.CONDITIONAL_MODIFY -split '\|'
} | ConvertTo-Json -Depth 4
