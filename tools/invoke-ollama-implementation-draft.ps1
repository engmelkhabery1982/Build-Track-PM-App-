<#
.SYNOPSIS
Creates a local implementation draft for the active BuildTrack feature.

.DESCRIPTION
The Qwen agent may write code only into tmp\local-agent-drafts. It never
touches source, migrations, SQLite data, Git, or the installed application.
Codex must review the draft and run tests before applying any part of it.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidateNotNullOrEmpty()][string]$Feature,
  [Parameter(Mandatory)][ValidateNotNullOrEmpty()][string]$TaskFile,
  [Parameter(Mandatory)][ValidateNotNullOrEmpty()][string[]]$SourceFile,
  [string]$ProjectCharterFile = 'docs\\agent-work-orders\\PROJECT_CHARTER_AR.md',
  [string]$Model = 'qwen2.5-coder:7b',
  [ValidateRange(60, 900)][int]$TimeoutSeconds = 600
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\', '/')
$rootPrefix = "$projectRoot$([System.IO.Path]::DirectorySeparatorChar)"
$perFileLimit = 6500

function Read-ProjectExcerpt {
  param([Parameter(Mandatory)][string]$PathValue)
  $candidate = if ([System.IO.Path]::IsPathRooted($PathValue)) { $PathValue } else { Join-Path $projectRoot $PathValue }
  $fullPath = [System.IO.Path]::GetFullPath($candidate)
  if (-not $fullPath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) { throw "Blocked path outside project: $PathValue" }
  if ($fullPath -match '[\\/]\.sandbox-secrets([\\/]|$)') { throw "Blocked protected path: $PathValue" }
  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) { throw "File not found: $PathValue" }
  $content = Get-Content -LiteralPath $fullPath -Raw
  if ($content.Length -gt $perFileLimit) {
    $half = [int]($perFileLimit / 2)
    $content = $content.Substring(0, $half) + "`n[... omitted; do not infer omitted content ...]`n" + $content.Substring($content.Length - $half)
  }
  [pscustomobject]@{ Path = $fullPath.Substring($rootPrefix.Length); Content = $content }
}

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) { throw 'Ollama is not available.' }
$task = Read-ProjectExcerpt $TaskFile
$charter = Read-ProjectExcerpt $ProjectCharterFile
$sources = @($SourceFile | ForEach-Object { Read-ProjectExcerpt $_ })
$sourceText = ($sources | ForEach-Object { "`n===== SOURCE: $($_.Path) =====`n$($_.Content)" }) -join "`n"

$prompt = @"
أنت وكيل تنفيذ محلي لتطبيق BuildTrack. أنت لا تملك صلاحية تعديل أي ملف حقيقي.

المهمة: $Feature
الهدف الثابت: تنفيذ وظيفة تشغيلية تقارب SAP PS بدرجة 8/10 على الأقل، مع عدم اختراع أرقام أو تجاوز حوكمة البيانات.

ميثاق المشروع:
===== $($charter.Path) =====
$($charter.Content)

أمر العمل:
===== $($task.Path) =====
$($task.Content)

الملفات المتاحة:
$sourceText

قواعد إلزامية:
1. اعتمد على النص المعروض فقط، واذكر أي افتراض كـ«غير مثبت».
2. لا تقترح تعديل قاعدة البيانات أو ملفًا غير معروض إلا إذا ثبت أنه ضروري، وعندها اذكر السبب والمخاطرة.
3. لا تنفذ أوامر، ولا تدّعِ أن الاختبارات نجحت.
4. اكتب باللغة العربية وبالترتيب: فهم التغيير، `Scope alignment: APPROVED` أو `BLOCKED`، تصميم صغير، patch موحد مقترح فقط للملفات المعروضة، اختبارات قبول موجبة/سالبة، ومخاطر.
5. الـpatch مسودة للمراجعة؛ لا يحذف سلوكًا قائمًا ولا يعيد كتابة ملف كامل.
"@

$body = @{ model = $Model; prompt = $prompt; stream = $false; keep_alive = '0'; options = @{ num_ctx = 4096; num_predict = 1800; temperature = 0.1 } } | ConvertTo-Json -Depth 5
try {
  $response = Invoke-RestMethod -Uri 'http://localhost:11434/api/generate' -Method Post -ContentType 'application/json; charset=utf-8' -Body $body -TimeoutSec $TimeoutSeconds
} catch {
  throw "Local implementation draft failed: $($_.Exception.Message)"
}
if ([string]::IsNullOrWhiteSpace([string]$response.response)) { throw 'Local implementation agent returned an empty draft.' }

$outputDirectory = Join-Path $projectRoot 'tmp\local-agent-drafts'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$safeFeature = ($Feature -replace '[^a-zA-Z0-9_-]', '_').Trim('_')
if ([string]::IsNullOrWhiteSpace($safeFeature)) { $safeFeature = 'feature' }
$outputPath = Join-Path $outputDirectory "$((Get-Date).ToString('yyyyMMdd-HHmmss'))-$safeFeature.md"
@('# Local implementation draft — NOT APPLIED', '', "- Feature: $Feature", "- Model: $Model", "- Task: $($task.Path)", "- Source files: $($sources.Path -join ', ')", '', [string]$response.response) | Set-Content -LiteralPath $outputPath -Encoding utf8
Write-Output $outputPath

