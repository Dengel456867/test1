# Script de commit, build et deploiement avec systeme de versioning
# Systeme d'indentation: X.Y.Z
# X = modification majeure
# Y = ajout de fonctionnalite
# Z = correctif ou modification mineure

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("major", "minor", "patch", "auto")]
    [string]$VersionBump = "auto",
    
    [Parameter(Mandatory=$false)]
    [string]$CommitMessage = ""
)

# Charger la configuration
$configPath = Join-Path $PSScriptRoot "config.json"
if (-not (Test-Path $configPath)) {
    Write-Host "[X] ERREUR: Fichier config.json introuvable!" -ForegroundColor Red
    exit 1
}

$config = Get-Content $configPath | ConvertFrom-Json

# Tokens
$env:VERCEL_TOKEN = $config.vercel.token
$env:GITHUB_TOKEN = $config.github.token
$env:VERCEL_PROJECT_NAME = $config.vercel.projectName
$env:GITHUB_REPO_NAME = $config.github.repoName

# Variables globales
$script:GitHubUser = $null

# Fonction pour afficher les signaux de progression
function Write-Step {
    param([string]$Message, [string]$Status = "info")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $symbol = switch ($Status) {
        "success" { "[OK]" }
        "error" { "[X]" }
        "warning" { "[!]" }
        "info" { "[>]" }
        default { "[.]" }
    }
    $color = switch ($Status) {
        "success" { "Green" }
        "error" { "Red" }
        "warning" { "Yellow" }
        "info" { "Cyan" }
        default { "White" }
    }
    Write-Host "[$timestamp] $symbol $Message" -ForegroundColor $color
}

# Fonction pour lire la version actuelle depuis package.json
function Get-CurrentVersion {
    $packageJsonPath = Join-Path (Split-Path $PSScriptRoot -Parent) "package.json"
    $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
    return $packageJson.version
}

# Fonction pour incrementer la version
function Update-Version {
    param([string]$BumpType)
    
    $packageJsonPath = Join-Path (Split-Path $PSScriptRoot -Parent) "package.json"
    $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    $currentVersion = $packageJson.version
    $versionParts = $currentVersion -split '\.'
    
    $major = [int]$versionParts[0]
    $minor = [int]$versionParts[1]
    $patch = [int]$versionParts[2]
    
    switch ($BumpType) {
        "major" {
            $major++
            $minor = 0
            $patch = 0
        }
        "minor" {
            $minor++
            $patch = 0
        }
        "patch" {
            $patch++
        }
    }
    
    $newVersion = "$major.$minor.$patch"
    $packageJson.version = $newVersion
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath -NoNewline
    
    return $newVersion
}

# Fonction pour verifier les tokens
function Test-Tokens {
    Write-Step "Verification des tokens..." "info"
    
    # Test token GitHub
    try {
        $githubHeaders = @{
            "Authorization" = "token $env:GITHUB_TOKEN"
            "User-Agent" = "PowerShell"
            "Accept" = "application/vnd.github.v3+json"
        }
        $githubResponse = Invoke-RestMethod -Uri "https://api.github.com/user" -Method Get -Headers $githubHeaders -ErrorAction Stop
        $script:GitHubUser = $githubResponse.login
        Write-Step "Token GitHub valide (User: $($githubResponse.login))" "success"
    } catch {
        Write-Step "Token GitHub invalide ou erreur: $($_.Exception.Message)" "error"
        return $false
    }
    
    # Test token Vercel
    try {
        $vercelHeaders = @{
            "Authorization" = "Bearer $env:VERCEL_TOKEN"
        }
        $vercelResponse = Invoke-RestMethod -Uri "https://api.vercel.com/v2/user" -Method Get -Headers $vercelHeaders -ErrorAction Stop
        Write-Step "Token Vercel valide (User: $($vercelResponse.user.username))" "success"
    } catch {
        Write-Step "Token Vercel invalide ou erreur: $($_.Exception.Message)" "error"
        return $false
    }
    
    return $true
}

# Fonction pour creer un fichier sur GitHub via l'API
function Set-GitHubFile {
    param(
        [string]$FilePath,
        [string]$Content,
        [string]$Message,
        [string]$Sha = $null
    )
    
    $headers = @{
        "Authorization" = "token $env:GITHUB_TOKEN"
        "User-Agent" = "PowerShell"
        "Accept" = "application/vnd.github.v3+json"
    }
    
    $body = @{
        message = $Message
        content = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($Content))
    }
    
    if ($Sha) {
        $body.sha = $Sha
    }
    
    $uri = "https://api.github.com/repos/$script:GitHubUser/$($config.github.repoName)/contents/$FilePath"
    
    try {
        $response = Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -Body ($body | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
        return $response
    } catch {
        return $null
    }
}

# Fonction pour recuperer un fichier depuis GitHub
function Get-GitHubFile {
    param([string]$FilePath)
    
    $headers = @{
        "Authorization" = "token $env:GITHUB_TOKEN"
        "User-Agent" = "PowerShell"
        "Accept" = "application/vnd.github.v3+json"
    }
    
    $uri = "https://api.github.com/repos/$script:GitHubUser/$($config.github.repoName)/contents/$FilePath"
    
    try {
        $response = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers -ErrorAction Stop
        return $response
    } catch {
        return $null
    }
}

# Fonction pour verifier/creer le repository GitHub
function Ensure-GitHubRepo {
    Write-Step "Verification du repository GitHub..." "info"
    
    $headers = @{
        "Authorization" = "token $env:GITHUB_TOKEN"
        "User-Agent" = "PowerShell"
        "Accept" = "application/vnd.github.v3+json"
    }
    
    # Verifier si le repo existe
    try {
        $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$script:GitHubUser/$($config.github.repoName)" -Method Get -Headers $headers -ErrorAction Stop
        Write-Step "Repository trouve: $($response.html_url)" "success"
        return $true
    } catch {
        Write-Step "Repository non trouve, creation..." "warning"
        
        # Creer le repo
        try {
            $body = @{
                name = $config.github.repoName
                description = "Jeu 3D isometrique - Test 1"
                private = $false
                auto_init = $true
            } | ConvertTo-Json
            
            $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json" -ErrorAction Stop
            
            Write-Step "Repository cree: $($response.html_url)" "success"
            Start-Sleep -Seconds 2
            return $true
        } catch {
            Write-Step "Erreur creation repo: $($_.Exception.Message)" "error"
            return $false
        }
    }
}

# Fonction pour uploader tous les fichiers du projet vers GitHub
function Push-AllFilesToGitHub {
    param([string]$Message)
    
    Write-Step "Upload des fichiers vers GitHub..." "info"
    
    $projectRoot = Split-Path $PSScriptRoot -Parent
    $excludePatterns = @("node_modules", ".next", ".git", ".vercel", "*.db", "data")
    
    $files = Get-ChildItem -Path $projectRoot -Recurse -File | Where-Object {
        $exclude = $false
        foreach ($pattern in $excludePatterns) {
            if ($_.FullName -like "*\$pattern\*" -or $_.FullName -like "*\$pattern") {
                $exclude = $true
                break
            }
        }
        -not $exclude
    }
    
    $uploadedCount = 0
    $totalFiles = $files.Count
    
    foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($projectRoot.Length + 1).Replace("\", "/")
        
        # Lire le contenu du fichier
        try {
            $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
            if ($null -eq $content) { $content = "" }
        } catch {
            continue
        }
        
        # Verifier si le fichier existe deja sur GitHub
        $existingFile = Get-GitHubFile -FilePath $relativePath
        $sha = if ($existingFile) { $existingFile.sha } else { $null }
        
        # Upload le fichier
        $result = Set-GitHubFile -FilePath $relativePath -Content $content -Message $Message -Sha $sha
        
        if ($result) {
            $uploadedCount++
            Write-Host "  [$uploadedCount/$totalFiles] $relativePath" -ForegroundColor DarkGray
        }
    }
    
    Write-Step "$uploadedCount fichiers uploades vers GitHub" "success"
    return $uploadedCount -gt 0
}

# Fonction pour deployer sur Vercel
function Invoke-VercelDeploy {
    Write-Step "Deploiement sur Vercel..." "info"
    
    try {
        $headers = @{
            "Authorization" = "Bearer $env:VERCEL_TOKEN"
            "Content-Type" = "application/json"
        }
        
        # Lier le projet GitHub a Vercel
        $linkBody = @{
            name = $env:VERCEL_PROJECT_NAME
            framework = "nextjs"
            gitRepository = @{
                type = "github"
                repo = "$script:GitHubUser/$($config.github.repoName)"
            }
        } | ConvertTo-Json -Depth 5
        
        try {
            $projectResponse = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects" -Method Post -Headers $headers -Body $linkBody -ErrorAction Stop
            Write-Step "Projet Vercel cree/lie" "success"
        } catch {
            Write-Step "Projet Vercel existe deja ou lie" "info"
        }
        
        Write-Step "Deploiement initie sur Vercel (via GitHub)" "success"
        Write-Step "Le deploiement se fera automatiquement depuis GitHub" "info"
        return $true
    } catch {
        Write-Step "Erreur deploiement Vercel: $($_.Exception.Message)" "warning"
        Write-Step "Configurez manuellement le projet sur vercel.com" "info"
        return $false
    }
}

# ===== EXECUTION PRINCIPALE =====

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COMMIT AND DEPLOY SCRIPT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verifier les tokens
if (-not (Test-Tokens)) {
    Write-Step "Les tokens ne sont pas valides. Arret du script." "error"
    exit 1
}

# 2. Verifier/creer le repository GitHub
if (-not (Ensure-GitHubRepo)) {
    Write-Step "Impossible de creer/acceder au repository GitHub" "error"
    exit 1
}

# 3. Determiner le type de version bump
if ($VersionBump -eq "auto") {
    $VersionBump = "patch"
}

# 4. Mettre a jour la version
$currentVersion = Get-CurrentVersion
Write-Step "Version actuelle: $currentVersion" "info"
$newVersion = Update-Version -BumpType $VersionBump
Write-Step "Nouvelle version: $newVersion" "success"

# 5. Commit et Push vers GitHub via API
$commitMsg = if ($CommitMessage) { "$CommitMessage (v$newVersion)" } else { "Auto-deploy v$newVersion" }
if (-not (Push-AllFilesToGitHub -Message $commitMsg)) {
    Write-Step "Echec de l'upload vers GitHub" "error"
    exit 1
}

# 6. Deployer sur Vercel
Invoke-VercelDeploy

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOIEMENT TERMINE" -ForegroundColor Green
Write-Host "  Version: $newVersion" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
