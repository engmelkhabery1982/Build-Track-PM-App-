[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$StartHead,
    [Parameter(Mandatory = $true)][ValidatePattern('^W\d{2}$')][string]$Feature,
    [string[]]$AllowConditional = @()
)

$ErrorActionPreference = 'Stop'
$root = (& git rev-parse --show-toplevel).Trim()
if (-not $root) { throw 'DELIVERY FAIL: not inside a Git repository.' }
Set-Location -LiteralPath $root

$active = @{}
Get-Content -LiteralPath (Join-Path $root 'docs/agent-work-orders/ACTIVE.md') | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=(.*)$') { $active[$matches[1]] = $matches[2].Trim() }
}
if ($Feature -ne $active.CURRENT_FEATURE) {
    throw "DELIVERY FAIL: requested $Feature but ACTIVE selects $($active.CURRENT_FEATURE)."
}
& git cat-file -e "$StartHead^{commit}"
if ($LASTEXITCODE -ne 0) { throw "DELIVERY FAIL: invalid START_HEAD $StartHead." }

$allowed = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
($active.MODIFY_ALLOWLIST -split '\|') | ForEach-Object { if ($_) { [void]$allowed.Add($_) } }
$conditionalSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
($active.CONDITIONAL_MODIFY -split '\|') | ForEach-Object { if ($_) { [void]$conditionalSet.Add($_) } }
foreach ($path in $AllowConditional) {
    if (-not $conditionalSet.Contains($path)) { throw "DELIVERY FAIL: conditional file is not declared: $path" }
    [void]$allowed.Add($path)
}

$changes = @(& git diff --name-status $StartHead)
if ($LASTEXITCODE -ne 0) { throw 'DELIVERY FAIL: git diff failed.' }
$untracked = @(& git ls-files --others --exclude-standard)
foreach ($path in $untracked) { $changes += "A`t$path" }
$violations = New-Object System.Collections.Generic.List[string]
$forbidden = $active.FORBIDDEN -split '\|'
foreach ($line in $changes) {
    if (-not $line) { continue }
    $parts = $line -split "`t"
    $status = $parts[0]
    $path = $parts[-1] -replace '\\','/'
    if ($status -match '^[DR]') { $violations.Add("delete/rename forbidden: $line") }
    if (-not $allowed.Contains($path)) { $violations.Add("outside MODIFY_ALLOWLIST: $path") }
    foreach ($pattern in $forbidden) {
        if ($pattern -and $path -like $pattern) { $violations.Add("protected path: $path") }
    }
    if ($path -match '(^|/)(node_modules|dist|target)(/|$)|\.(zip|db|sqlite|sqlite3)$') {
        $violations.Add("artifact forbidden: $path")
    }
}
if ($violations.Count -gt 0) { throw "DELIVERY FAIL:`n$($violations -join "`n")" }

function Invoke-EvidenceCommand {
    param([string]$Name, [scriptblock]$Command)
    $output = (& $Command 2>&1 | Out-String)
    $code = $LASTEXITCODE
    if ($null -eq $code) { $code = 0 }
    [ordered]@{ name = $Name; exit_code = $code; output = $output.TrimEnd() }
}

$results = @()
$results += Invoke-EvidenceCommand 'npm test' { npm test }
$results += Invoke-EvidenceCommand 'npm run build' { npm run build }
$results += Invoke-EvidenceCommand 'cargo test' { cargo test --manifest-path src-tauri/Cargo.toml }
$results += Invoke-EvidenceCommand 'git diff --check' { git diff --check $StartHead }

$head = (& git rev-parse HEAD).Trim()
$hashes = @()
foreach ($line in $changes) {
    if (-not $line) { continue }
    $path = (($line -split "`t")[-1] -replace '\\','/')
    $full = Join-Path $root $path
    if (Test-Path -LiteralPath $full -PathType Leaf) {
        $hashes += [ordered]@{ path = $path; sha256 = (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash }
    }
}
$passed = -not ($results | Where-Object { $_.exit_code -ne 0 })
$evidence = [ordered]@{
    feature = $Feature
    result = if ($passed) { 'PASS' } else { 'FAIL' }
    start_head = $StartHead
    end_head = $head
    generated_utc = (Get-Date).ToUniversalTime().ToString('o')
    changes = $changes
    file_hashes = $hashes
    commands = $results
}
$evidencePath = Join-Path $root "docs/agent-results/${Feature}_EVIDENCE.json"
$evidence | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $evidencePath -Encoding utf8
$evidence | ConvertTo-Json -Depth 5
if (-not $passed) { exit 1 }
