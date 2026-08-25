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

  [switch]$SaveResult
)

$ErrorActionPreference = 'Stop'
$maximumFileBytes = 2MB
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
  [pscustomobject]@{
    RelativePath = $relativePath
    Content = Get-Content -LiteralPath $fullPath -Raw
  }
}

$fileSections = ($reviewInputs | ForEach-Object {
  "`n===== FILE: $($_.RelativePath) =====`n$($_.Content)"
}) -join "`n"

$prompt = @"
أنت مراجع جودة مستقل، للقراءة فقط، لتطبيق إدارة مشروعات إنشائية.

اسم المرحلة: $Phase

قواعد إلزامية:
1) راجع فقط النص المرفق أدناه. لا تفترض وجود ملفات أو بيانات لم تُعرض عليك.
2) لا تكتب كوداً ولا تقترح أوامر تشغيل أو تعديل أو حذف ملفات.
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
# Send the review body over standard input. Passing it as one command-line
# argument breaks on Windows once a reviewed source file is moderately large.
$result = ($prompt | & ollama run $Model 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) {
  throw "Ollama review failed (exit code $LASTEXITCODE): $result"
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
