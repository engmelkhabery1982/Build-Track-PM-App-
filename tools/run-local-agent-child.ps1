<# Executes one local agent script from a JSON parameter file and returns its exit code. #>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$ScriptPath,
  [Parameter(Mandatory)][string]$ParametersPath
)

$ErrorActionPreference = 'Stop'
$payload = Get-Content -LiteralPath $ParametersPath -Raw -Encoding utf8 | ConvertFrom-Json
$parameters = @{}
foreach ($property in $payload.PSObject.Properties) { $parameters[$property.Name] = $property.Value }
& $ScriptPath @parameters
exit $LASTEXITCODE
