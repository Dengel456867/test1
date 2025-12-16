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
        Write-Host "Repo GitHub: $($project.link.org)/$($project.link.repo)" -ForegroundColor Gray
        
        # Recuperer le dernier deploiement pour forcer un redeploy
        Write-Host "Recherche du dernier deploiement..." -ForegroundColor Cyan
        $deployments = Invoke-RestMethod -Uri "https://api.vercel.com/v6/deployments?projectId=$($project.id)&limit=1" -Method Get -Headers $headers
        
        if ($deployments.deployments.Count -gt 0) {
            $lastDeploy = $deployments.deployments[0]
            Write-Host "Dernier deploiement: $($lastDeploy.url) - $($lastDeploy.state)" -ForegroundColor Gray
            
            # Redeploy depuis le dernier deploiement
            Write-Host "Declenchement du redeploiement..." -ForegroundColor Cyan
            
            $redeployBody = @{
                deploymentId = $lastDeploy.uid
                name = $config.vercel.projectName
                target = "production"
            } | ConvertTo-Json
            
            $deployment = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments?forceNew=1" -Method Post -Headers $headers -Body $redeployBody
            
            Write-Host "Deploiement declenche avec succes!" -ForegroundColor Green
            Write-Host "URL: https://$($deployment.url)" -ForegroundColor Cyan
            Write-Host "Status: $($deployment.readyState)" -ForegroundColor Yellow
        } else {
            Write-Host "Aucun deploiement trouve pour ce projet" -ForegroundColor Red
        }
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
