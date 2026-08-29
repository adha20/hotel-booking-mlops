<#
Run Random Forest tuning and send the manual MLflow logs to DagsHub.

Set MLFLOW_TRACKING_USERNAME and MLFLOW_TRACKING_PASSWORD beforehand for a
non-interactive run. If they are not set, this script asks for them.
#>

param(
    [string]$RepoOwner = "adha20",
    [string]$RepoName = "SMSML_Muhammad_Adha",
    [int]$NIter = 3,
    [int]$CV = 3,
    [int]$NJobs = -1
)

$ErrorActionPreference = "Stop"

# Remove local proxy variables that can interrupt DagsHub authentication.
$proxyVars = @("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "all_proxy", "no_proxy")
foreach ($proxyVar in $proxyVars) {
    Remove-Item -LiteralPath "Env:\$proxyVar" -ErrorAction SilentlyContinue
}

# DagsHub reads these values inside modelling_tuning.py.
$env:DAGSHUB_REPO_OWNER = $RepoOwner
$env:DAGSHUB_REPO_NAME = $RepoName

# Prompt only for credentials that have not already been provided.
if (-not $env:MLFLOW_TRACKING_USERNAME) {
    $env:MLFLOW_TRACKING_USERNAME = Read-Host "DagsHub username"
}

if (-not $env:MLFLOW_TRACKING_PASSWORD) {
    $secureToken = Read-Host "DagsHub token" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    try {
        $env:MLFLOW_TRACKING_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

# Prefer the project virtual environment, then fall back to the active Python command.
$python = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    $python = "python"
}

Set-Location -LiteralPath $PSScriptRoot
Write-Host "Running DagsHub MLflow logging for $RepoOwner/$RepoName ..."

# The Python script handles training, tuning, metric logging, and artifact export.
& $python .\modelling_tuning.py --use-dagshub --n-iter $NIter --cv $CV --n-jobs $NJobs



