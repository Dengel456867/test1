# Script pour deployer sur Vercel via API
$config = Get-Content (Join-Path $PSScriptRoot "config.json") | ConvertFrom-Json

$headers = @{
    'Authorization' = "Bearer $($config.vercel.token)"
    'Content-Type' = 'application/json'
}

# Recuperer les projets Vercel pour trouver l'ID
Write-Host "Recherche du projet Vercel..." -ForegroundColor Cyan
try {
    $projects = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects" -Method Get -Headers $headers
    $project = $projects.projects | Where-Object { $_.name -eq $config.vercel.projectName }
    
    if ($project) {
        Write-Host "Projet trouve: $($project.name) (ID: $($project.id))" -ForegroundColor Green
        
        # Declencher un deploiement
        Write-Host "Declenchement du deploiement..." -ForegroundColor Cyan
        
        $deployBody = @{
            name = $config.vercel.projectName
            project = $project.id
            target = "production"
            gitSource = @{
                type = "github"
                ref = "main"
                repoId = $project.link.repoId
            }
        } | ConvertTo-Json -Depth 4
        
        $deployment = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments" -Method Post -Headers $headers -Body $deployBody
        
        Write-Host "Deploiement declenche avec succes!" -ForegroundColor Green
        Write-Host "URL: https://$($deployment.url)" -ForegroundColor Cyan
        Write-Host "Status: $($deployment.readyState)" -ForegroundColor Yellow
    } else {
        Write-Host "Projet '$($config.vercel.projectName)' non trouve sur Vercel" -ForegroundColor Red
        Write-Host "Projets disponibles:" -ForegroundColor Yellow
        $projects.projects | ForEach-Object { Write-Host "  - $($_.name)" }
    }
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
