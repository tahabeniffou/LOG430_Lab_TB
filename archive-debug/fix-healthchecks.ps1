#!/usr/bin/env pwsh

Write-Host "🔧 Correction des healthchecks dans docker-compose.yml..." -ForegroundColor Yellow

# Arrêter tous les services
Write-Host "⏹️ Arrêt des services..." -ForegroundColor Cyan
docker-compose down

# Lire le contenu du fichier docker-compose.yml
$dockerComposeContent = Get-Content -Path "docker-compose.yml" -Raw

# Remplacer les healthchecks incorrects
$dockerComposeContent = $dockerComposeContent -replace 'curl -f http://localhost:3001/api/produits', 'curl -f http://localhost:3001/health'
$dockerComposeContent = $dockerComposeContent -replace 'curl -f http://localhost:3002/stocks', 'curl -f http://localhost:3002/health'
$dockerComposeContent = $dockerComposeContent -replace 'curl -f http://localhost:3003/ventes', 'curl -f http://localhost:3003/health'
$dockerComposeContent = $dockerComposeContent -replace 'curl -f http://localhost:3004/reports', 'curl -f http://localhost:3004/health'

# Sauvegarder le fichier modifié
Set-Content -Path "docker-compose.yml" -Value $dockerComposeContent

Write-Host "✅ Healthchecks corrigés!" -ForegroundColor Green

# Redémarrer les services
Write-Host "🚀 Redémarrage des services..." -ForegroundColor Cyan
docker-compose up -d

Write-Host "⏳ Attente que les services démarrent..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Vérifier l'état des services
Write-Host "📊 État des services:" -ForegroundColor Cyan
docker-compose ps

Write-Host "✅ Correction terminée!" -ForegroundColor Green
