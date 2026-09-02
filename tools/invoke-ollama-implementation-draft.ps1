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
  [string]$RevisionFeedback = '',
  [string]$Model = 'qwen2.5-coder:7b',
  [ValidateRange(60, 900)][int]$TimeoutSeconds = 240
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\', '/')
$rootPrefix = "$projectRoot$([System.IO.Path]::DirectorySeparatorChar)"
$perExcerptLimit = 2200

function Get-SectionTerms([string]$content, [string]$heading) {
  $match = [regex]::Match($content, "(?ms)^## $([regex]::Escape($heading))\s*$\r?\n(.*?)(?=^## |\z)")
  if (-not $match.Success) { return @() }
  return @([regex]::Matches($match.Groups[1].Value, '`([^`]+)`') | ForEach-Object { $_.Groups[1].Value.Trim() } | Where-Object { $_ })
}

function Read-ProjectExcerpt {
  param([Parameter(Mandatory)][string]$PathValue, [string[]]$Anchors = @())
  $candidate = if ([System.IO.Path]::IsPathRooted($PathValue)) { $PathValue } else { Join-Path $projectRoot $PathValue }
  $fullPath = [System.IO.Path]::GetFullPath($candidate)
  if (-not $fullPath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) { throw "Blocked path outside project: $PathValue" }
  if ($fullPath -match '[\\/]\.sandbox-secrets([\\/]|$)') { throw "Blocked protected path: $PathValue" }
  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) { throw "File not found: $PathValue" }
  $content = Get-Content -LiteralPath $fullPath -Raw -Encoding utf8
  if (-not $Anchors.Count) { throw "No Source anchors were supplied for: $PathValue" }
  $sections = New-Object System.Collections.Generic.List[string]
  foreach ($anchor in $Anchors) {
    $index = $content.IndexOf($anchor, [System.StringComparison]::OrdinalIgnoreCase)
    if ($index -lt 0) { throw "Source anchor '$anchor' was not found in: $PathValue" }
    $start = [Math]::Max(0, $index - 500)
    $length = [Math]::Min(1400, $content.Length - $start)
    $sections.Add($content.Substring($start, $length))
  }
  $content = ($sections | Select-Object -Unique) -join "`n[... omitted ...]`n"
  if ($content.Length -gt $perExcerptLimit) { $content = $content.Substring(0, $perExcerptLimit) + "`n[... excerpt limit reached ...]" }
  [pscustomobject]@{ Path = $fullPath.Substring($rootPrefix.Length); Content = $content }
}

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) { throw 'Ollama is not available.' }
$taskText = Get-Content -LiteralPath $TaskFile -Raw -Encoding utf8
$targets = Get-SectionTerms $taskText 'Target Files'
$anchors = Get-SectionTerms $taskText 'Source anchors'
if (-not $targets.Count) { throw 'Work order has no Target Files.' }
if (-not $anchors.Count) { throw 'Work order has no Source anchors.' }
if (@($SourceFile | Where-Object { $_ -notin $targets }).Count) { throw 'Only Target Files may be supplied to the implementation agent.' }
$task = [pscustomobject]@{ Path = $TaskFile; Content = $taskText }
# Keep launcher literals ASCII-only: Windows PowerShell 5.1 can parse a
# UTF-8-without-BOM script using the legacy code page when the watcher starts.
$charter = Read-ProjectExcerpt $ProjectCharterFile -Anchors @('BuildTrack')
$sources = @($SourceFile | ForEach-Object {
  $sourcePath = $_
  $normalizedPath = $sourcePath.Replace('\', '/')
  $fileAnchors = @($anchors | ForEach-Object {
    $parts = $_ -split '::', 2
    if ($parts.Count -ne 2) { throw "Source anchor must use 'relative/path::symbol': $_" }
    if ($parts[0].Replace('\', '/') -eq $normalizedPath) { $parts[1] }
  } | Where-Object { $_ })
  if (-not $fileAnchors.Count) { throw "No Source anchor belongs to Target File: $sourcePath" }
  Read-ProjectExcerpt $sourcePath -Anchors $fileAnchors
})
$sourceText = ($sources | ForEach-Object { "`n===== SOURCE: $($_.Path) =====`n$($_.Content)" }) -join "`n"
$revisionInstruction = if ([string]::IsNullOrWhiteSpace($RevisionFeedback)) { '' } else { "`nهذه محاولة تصحيح واحدة. سبب رفض المسودة الأولى: $RevisionFeedback`nصحح السبب في patch ضيق، ولا تدّعِ تنفيذًا أو اختبارًا.`n" }

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
$revisionInstruction

قواعد إلزامية:
1. اعتمد على النص المعروض فقط، واذكر أي افتراض كـ«غير مثبت».
2. لا تقترح تعديل قاعدة البيانات أو ملفًا غير معروض إلا إذا ثبت أنه ضروري، وعندها اذكر السبب والمخاطرة.
3. لا تنفذ أوامر، ولا تدّعِ أن الاختبارات نجحت.
4. اكتب باللغة العربية وبالترتيب: فهم التغيير مع ذكر أسماء الدوال والـtypes الموجودة حرفياً، `Scope alignment: APPROVED` أو `BLOCKED`، تصميم صغير، patch موحد مقترح فقط للملفات المعروضة، اختبارات قبول موجبة/سالبة، ومخاطر.
5. يجب أن يحتوي الرد على patch موحد حقيقي (`diff --git` أو `+++`) أو أن يعلن `BLOCKED` مع سبب مثبت؛ لا تكتب قوائم أسماء ملفات أو ادعاءات بتنفيذ/اختبار.
6. الـpatch مسودة للمراجعة؛ لا يحذف سلوكًا قائمًا ولا يعيد كتابة ملف كامل. لا تذكر أو تستخدم أي مصطلح محظور في بطاقة العمل حتى في الشرح.
"@

$body = @{ model = $Model; prompt = $prompt; stream = $false; keep_alive = '0'; options = @{ num_ctx = 3072; num_predict = 250; num_thread = 12; temperature = 0.1 } } | ConvertTo-Json -Depth 5
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

