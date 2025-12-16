# Script de deploiement direct vers Vercel (sans GitHub connecte)
# Utilise l'API Vercel pour uploader les fichiers directement

param(
    [Parameter(Mandatory=$false)]
    [string]$CommitMessage = "Deploy from Cursor"
)

$configPath = Join-Path $PSScriptRoot "config.json"
$config = Get-Content $configPath | ConvertFrom-Json
$projectRoot = Split-Path $PSScriptRoot -Parent

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY DIRECT VERCEL" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Lire la version
$packageJson = Get-Content (Join-Path $projectRoot "package.json") -Raw | ConvertFrom-Json
$version = $packageJson.version
Write-Host "[>] Version: $version" -ForegroundColor Cyan

# Collecter les fichiers
Write-Host "[>] Collection des fichiers..." -ForegroundColor Cyan
$excludePatterns = @("node_modules", ".next", ".git", ".vercel", "*.db", "data", "scripts")

$files = Get-ChildItem -Path $projectRoot -Recurse -File | Where-Object {
    $dominated = $false
    foreach ($pattern in $excludePatterns) {
        if ($_.FullName -like "*\$pattern\*" -or $_.FullName -like "*\$pattern") {
            $excluded = $true
            break
        }
    }
    -not $excluded
}

Write-Host "[>] $($files.Count) fichiers trouves" -ForegroundColor Cyan

# Construire le payload
$fileList = @()
foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($projectRoot.Length + 1).Replace("\", "/")
    
    # Ignorer certains fichiers
    if ($relativePath -like "scripts/*" -or $relativePath -like "data/*") {
        continue
    }
    
    try {
        $contentBytes = [System.IO.File]::ReadAllBytes($file.FullName)
        $encoded = [Convert]::ToBase64String($contentBytes)
        $fileList += @{
            file = $relativePath
            data = $encoded
            encoding = "base64"
        }
    } catch {
        continue
    }
}

Write-Host "[>] $($fileList.Count) fichiers a deployer" -ForegroundColor Cyan
Write-Host "[>] Upload vers Vercel..." -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer $($config.vercel.token)"
    "Content-Type" = "application/json"
}

$deployBody = @{
    name = $config.vercel.projectName
    files = $fileList
    project = $config.vercel.projectName
    target = "production"
    projectSettings = @{
        framework = "nextjs"
        buildCommand = "npm run build"
        outputDirectory = ".next"
        installCommand = "npm install"
    }
} | ConvertTo-Json -Depth 10 -Compress

try {
    $response = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments" `
        -Method Post `
        -Headers $headers `
        -Body $deployBody `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "`n[OK] Deploiement cree!" -ForegroundColor Green
    Write-Host "[>] ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "[>] URL: https://$($response.url)" -ForegroundColor Cyan
    Write-Host "[>] Status: $($response.readyState)" -ForegroundColor Cyan
    
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($errorResponse.error.code -eq "forbidden" -or $_.Exception.Response.StatusCode -eq 402) {
        Write-Host "`n[!] Le deploiement direct necessite un plan Vercel Pro" -ForegroundColor Yellow
        Write-Host "[>] Alternative: utilisez 'vercel deploy' en CLI" -ForegroundColor Cyan
    } else {
        Write-Host "`n[X] Erreur: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  FIN" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green




