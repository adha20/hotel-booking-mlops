param(
    [string]$RepoOwner = "adha20",
    [string]$RepoName = "SMSML_Muhammad_Adha",
    [int]$NIter = 3,
    [int]$CV = 3,
    [int]$NJobs = -1
)

$ErrorActionPreference = "Stop"

$proxyVars = @("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "all_proxy", "no_proxy")
foreach ($proxyVar in $proxyVars) {
    Remove-Item -LiteralPath "Env:\$proxyVar" -ErrorAction SilentlyContinue
}

$env:DAGSHUB_REPO_OWNER = $RepoOwner
$env:DAGSHUB_REPO_NAME = $RepoName

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

$python = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    $python = "python"
}

Set-Location -LiteralPath $PSScriptRoot
Write-Host "Running DagsHub MLflow logging for $RepoOwner/$RepoName ..."

& $python .\modelling_tuning.py --use-dagshub --n-iter $NIter --cv $CV --n-jobs $NJobs



