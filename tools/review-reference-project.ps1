param(
  [string]$Model = 'qwen2.5-coder:7b'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$fixturePath = Join-Path $projectRoot 'tests\fixtures\referenceProjectAcceptance.mjs'

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  throw 'Ollama was not found. Install or start Ollama, then run this command again.'
}
if (-not (Test-Path -LiteralPath $fixturePath)) {
  throw "Acceptance fixture was not found: $fixturePath"
}

$fixture = Get-Content -LiteralPath $fixturePath -Raw
$prompt = @"
You are a READ-ONLY PMO, commercial and data-governance reviewer for a construction project application.

Rules:
1. Do not write code and do not tell the user to open, edit, delete or run anything.
2. Do not invent missing facts. Mark an item as 'not evidenced' when it is absent.
3. Review only the supplied reference project. It is controlled test data, not live customer data.
4. Check these relationships: project -> main contract -> subcontract -> BOQ -> activity -> WIR -> cost -> variation -> payment certificate.
5. Check quantities, dates, revenue versus subcontract cost, variation value/time impact, PV/EV/AC/CPI/SPI, retention, advance recovery, deductions and VAT.
6. Return Arabic only, in a table with exactly these columns:
   الحالة | الملاحظة | الدليل من البيانات | الأثر | قاعدة الحوكمة المقترحة
7. End with two short lists: 'اختبارات قبول إضافية لازمة' and 'أسئلة لا يمكن الجزم بها من البيانات'.

REFERENCE PROJECT DATA:
$fixture
"@

Write-Host "Starting local read-only review with $Model ..." -ForegroundColor Cyan
& ollama run $Model $prompt
