<#
.SYNOPSIS
Runs a local, read-only Ollama QA review for explicitly named project files.

.EXAMPLE
./tools/invoke-ollama-phase-review.ps1 -Phase 'Phase A / Import' -ReviewFile 'src/data/primaveraImport.ts','tests/import.test.mjs' -SaveResult
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidateNotNullOrEmpty()]
  [string]$Phase,

  [Parameter(Mandatory)]
  [ValidateNotNullOrEmpty()]
  [string[]]$ReviewFile,

  [string]$Model = 'qwen2.5-coder:7b',

  [ValidateSet('Quality Reviewer', 'Implementation Planner', 'Governance Challenger')]
  [string]$Role = 'Quality Reviewer',

  [ValidateRange(30, 600)]
  [int]$TimeoutSeconds = 180,

  [switch]$SaveResult
)

$ErrorActionPreference = 'Stop'
$maximumFileBytes = 2MB
# 7B/8B CPU models are useful reviewers, but a whole multi-thousand-line UI
# file overwhelms the configured 4096-token context and makes a report appear
# to hang. Callers split a feature into bounded review units; this safeguard
# preserves opening and closing context and labels the excerpt honestly.
$maximumReviewCharactersPerFile = 6000
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\', '/')
$rootPrefix = "$projectRoot$([System.IO.Path]::DirectorySeparatorChar)"

function Resolve-ProjectReviewFile {
  param([Parameter(Mandatory)][string]$PathValue)

  $candidate = if ([System.IO.Path]::IsPathRooted($PathValue)) {
    $PathValue
  } else {
    Join-Path $projectRoot $PathValue
  }

  try {
    $resolved = [System.IO.Path]::GetFullPath($candidate)
  } catch {
    throw "Invalid review path '$PathValue'."
  }

  if (-not $resolved.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Blocked path outside the project root: '$PathValue'."
  }
  if ($resolved -match '[\\/]\.sandbox-secrets([\\/]|$)') {
    throw "Blocked protected path: '$PathValue'."
  }
  if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
    throw "Review file was not found or is not a file: '$PathValue'."
  }

  $item = Get-Item -LiteralPath $resolved
  if ($item.Length -gt $maximumFileBytes) {
    throw "Review file is too large ($($item.Length) bytes). Maximum is $maximumFileBytes bytes: '$PathValue'."
  }

  return $resolved
}

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  throw 'Ollama was not found. Install/start Ollama and run this utility again.'
}

$reviewInputs = foreach ($pathValue in $ReviewFile) {
  $fullPath = Resolve-ProjectReviewFile -PathValue $pathValue
  $relativePath = $fullPath.Substring($rootPrefix.Length)
  $content = Get-Content -LiteralPath $fullPath -Raw
  $wasTrimmed = $content.Length -gt $maximumReviewCharactersPerFile
  if ($wasTrimmed) {
    $half = [int]($maximumReviewCharactersPerFile / 2)
    $content = $content.Substring(0, $half) + "`n`n[... file excerpt omitted; review only the visible portions ...]`n`n" + $content.Substring($content.Length - $half)
  }
  [pscustomobject]@{
    RelativePath = $relativePath
    Content = $content
    WasTrimmed = $wasTrimmed
  }
}

$fileSections = ($reviewInputs | ForEach-Object {
  $excerptNotice = if ($_.WasTrimmed) { ' (excerpt; do not infer omitted content)' } else { '' }
  "`n===== FILE: $($_.RelativePath)$excerptNotice =====`n$($_.Content)"
}) -join "`n"

$prompt = @"
أنت تعمل بدور: $Role، ضمن فريق محلي مستقل للقراءة فقط، لتطبيق إدارة مشروعات إنشائية.

اسم المرحلة: $Phase

قواعد إلزامية:
1) راجع فقط النص المرفق أدناه. لا تفترض وجود ملفات أو بيانات لم تُعرض عليك.
2) لا تعدّل أي ملف ولا تشغّل أو تقترح أوامر تغيير أو حذف. إذا كنت Implementation Planner، يمكنك وصف تغيير صغير مقترح كخطوات قابلة للمراجعة، لكن لا تكتب patch أو كوداً كاملاً.
3) لا تطلب صلاحيات ولا تقرر أن شيئاً صحيح دون دليل صريح من النص.
4) ركّز على: صحة العلاقات، الحوكمة، الحسابات، الاستيراد، حالات الفشل، وحماية بيانات المستخدم.
5) أخرج الرد باللغة العربية في الأقسام التالية فقط:
   - الحكم: PASS أو RISK أو FAIL.
   - ملاحظات مثبتة: جدول (الخطورة | الملف | الدليل | الأثر | توصية اختبار/تحقق).
   - فجوات غير مثبتة من الملفات المعروضة.
   - اختبار قبول مقترح للمرحلة.
6) لا تذكر أي معلومات سرية ولا تعيد طباعة محتوى الملفات كاملاً.

الملفات المعروضة:
$fileSections
"@

Write-Host "Starting local read-only Ollama review for '$Phase' with $Model ..." -ForegroundColor Cyan
# The HTTP API gives the runner an actual timeout and prevents terminal
# spinners/interactive state from holding the review gate forever on CPU.
$request = @{ model = $Model; prompt = $prompt; stream = $false; keep_alive = '0'; options = @{ num_ctx = 4096; num_predict = 900; temperature = 0.15 } } | ConvertTo-Json -Depth 5
try {
  $response = Invoke-RestMethod -Uri 'http://localhost:11434/api/generate' -Method Post -ContentType 'application/json; charset=utf-8' -Body $request -TimeoutSec $TimeoutSeconds
  $result = [string]$response.response
  $ollamaExitCode = 0
} catch {
  $result = $_.Exception.Message
  $ollamaExitCode = 1
}
if ($ollamaExitCode -ne 0) {
  throw "Ollama review failed (exit code $ollamaExitCode): $result"
}

if ([string]::IsNullOrWhiteSpace($result)) {
  throw 'Ollama returned an empty review.'
}

Write-Output $result

if ($SaveResult) {
  $outputDirectory = Join-Path $projectRoot 'tmp\ollama-reviews'
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
  $safePhase = ($Phase -replace '[^a-zA-Z0-9_-]', '_').Trim('_')
  if ([string]::IsNullOrWhiteSpace($safePhase)) { $safePhase = 'phase' }
  $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $outputPath = Join-Path $outputDirectory "$timestamp-$safePhase.md"
  @("# Local Ollama Review", "", "- Phase: $Phase", "- Model: $Model", "- Files: $($reviewInputs.RelativePath -join ', ')", "", $result) |
    Set-Content -LiteralPath $outputPath -Encoding utf8
  Write-Host "Saved review to: $outputPath" -ForegroundColor Green
}
