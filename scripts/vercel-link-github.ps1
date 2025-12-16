# Script pour lier le projet Vercel au repo GitHub
$config = Get-Content (Join-Path $PSScriptRoot "config.json") | ConvertFrom-Json

$headers = @{
    'Authorization' = "Bearer $($config.vercel.token)"
    'Content-Type' = 'application/json'
}

Write-Host "=== Verification de la liaison Vercel <-> GitHub ===" -ForegroundColor Cyan

# Recuperer le projet Vercel
try {
    $projects = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects" -Method Get -Headers $headers
    $project = $projects.projects | Where-Object { $_.name -eq $config.vercel.projectName }
    
    if ($project) {
        Write-Host "`nProjet Vercel trouve:" -ForegroundColor Green
        Write-Host "  Nom: $($project.name)"
        Write-Host "  ID: $($project.id)"
        
        if ($project.link) {
            Write-Host "`nLiaison Git actuelle:" -ForegroundColor Yellow
            Write-Host "  Type: $($project.link.type)"
            Write-Host "  Org: $($project.link.org)"
            Write-Host "  Repo: $($project.link.repo)"
            Write-Host "  RepoId: $($project.link.repoId)"
        } else {
            Write-Host "`nAucune liaison Git configuree!" -ForegroundColor Red
        }
        
        # Afficher les infos du repo GitHub cible
        Write-Host "`n=== Repo GitHub cible ===" -ForegroundColor Cyan
        $ghHeaders = @{
            'Authorization' = "token $($config.github.token)"
            'User-Agent' = 'PowerShell'
        }
        $ghRepo = Invoke-RestMethod -Uri "https://api.github.com/repos/Dengel456867/$($config.github.repoName)" -Headers $ghHeaders
        Write-Host "  Nom: $($ghRepo.full_name)"
        Write-Host "  ID: $($ghRepo.id)"
        Write-Host "  URL: $($ghRepo.html_url)"
        Write-Host "  Branche par defaut: $($ghRepo.default_branch)"
        
        # Tenter de mettre a jour la liaison
        Write-Host "`n=== Mise a jour de la liaison ===" -ForegroundColor Cyan
        
        $linkBody = @{
            gitRepository = @{
                type = "github"
                repo = "Dengel456867/$($config.github.repoName)"
            }
        } | ConvertTo-Json -Depth 3
        
        Write-Host "Tentative de liaison avec Dengel456867/$($config.github.repoName)..." -ForegroundColor Yellow
        
        try {
            $result = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$($project.id)/link" -Method Post -Headers $headers -Body $linkBody
            Write-Host "Liaison reussie!" -ForegroundColor Green
            Write-Host "  RepoId: $($result.repoId)"
        } catch {
            Write-Host "Erreur lors de la liaison: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.ErrorDetails.Message) {
                Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
            }
            
            Write-Host "`n>>> Action manuelle requise <<<" -ForegroundColor Yellow
            Write-Host "1. Allez sur https://vercel.com/patrickeymard-6873/test1/settings/git" -ForegroundColor White
            Write-Host "2. Cliquez sur 'Connect Git Repository'" -ForegroundColor White
            Write-Host "3. Selectionnez GitHub et le repo 'Dengel456867/test1'" -ForegroundColor White
        }
        
    } else {
        Write-Host "Projet '$($config.vercel.projectName)' non trouve sur Vercel" -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}
