# Script de diagnostic RabbitMQ et Dashboard
Write-Host "🔍 Diagnostic RabbitMQ & Dashboard Grafana" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Gray

# 1. Vérification des logs RabbitMQ
Write-Host "`n📋 Logs RabbitMQ (dernières lignes):" -ForegroundColor Yellow
docker logs rabbitmq-broker --tail 10

# 2. Vérification des connexions actives RabbitMQ
Write-Host "`n🔗 Connexions RabbitMQ actives:" -ForegroundColor Yellow
try {
    $connections = Invoke-RestMethod -Uri "http://localhost:15672/api/connections" -Headers @{Authorization=("Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin123")))}
    if ($connections.Count -gt 0) {
        foreach ($conn in $connections) {
            Write-Host "  ✅ $($conn.name) - État: $($conn.state)" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️  Aucune connexion active" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Impossible de récupérer les connexions RabbitMQ" -ForegroundColor Red
}

# 3. Vérification des exchanges
Write-Host "`n📡 Exchanges RabbitMQ:" -ForegroundColor Yellow
try {
    $exchanges = Invoke-RestMethod -Uri "http://localhost:15672/api/exchanges" -Headers @{Authorization=("Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin123")))}
    $customExchanges = $exchanges | Where-Object { $_.name -notlike "amq.*" -and $_.name -ne "" }
    if ($customExchanges.Count -gt 0) {
        foreach ($ex in $customExchanges) {
            Write-Host "  📡 $($ex.name) - Type: $($ex.type)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  ⚠️  Aucun exchange personnalisé trouvé" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Impossible de récupérer les exchanges" -ForegroundColor Red
}

# 4. Vérification des queues
Write-Host "`n📬 Queues RabbitMQ:" -ForegroundColor Yellow
try {
    $queues = Invoke-RestMethod -Uri "http://localhost:15672/api/queues" -Headers @{Authorization=("Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin123")))}
    if ($queues.Count -gt 0) {
        foreach ($queue in $queues) {
            Write-Host "  📬 $($queue.name) - Messages: $($queue.messages)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  ⚠️  Aucune queue trouvée" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Impossible de récupérer les queues" -ForegroundColor Red
}

# 5. Test des métriques Prometheus
Write-Host "`n📊 Métriques Prometheus:" -ForegroundColor Yellow
try {
    $targets = Invoke-RestMethod -Uri "http://localhost:9090/api/v1/targets"
    $reclamationTarget = $targets.data.activeTargets | Where-Object { $_.job -eq "reclamation-service" }
    if ($reclamationTarget) {
        Write-Host "  ✅ Service réclamations détecté - Health: $($reclamationTarget.health)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Service réclamations non détecté dans Prometheus" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Impossible de contacter Prometheus" -ForegroundColor Red
}

# 6. Vérification des métriques spécifiques
Write-Host "`n🎯 Métriques du service:" -ForegroundColor Yellow
try {
    $metrics = Invoke-RestMethod -Uri "http://localhost:8011/metrics"
    
    # Extraction des métriques clés avec regex améliorée
    $eventsPattern = "events_published_total\{event_type=`"ReclamationCreated`"\}\s+(\d+)"
    $reclamationsPattern = "reclamations_total\{status=`"created`"\}\s+(\d+)"
    $httpPattern = "http_requests_total\{method=`"POST`",route=`"/api/reclamations`",status_code=`"201`"\}\s+(\d+)"
    
    if ($metrics -match $eventsPattern) {
        Write-Host "  🎯 Événements publiés: $($Matches[1])" -ForegroundColor Green
    }
    if ($metrics -match $reclamationsPattern) {
        Write-Host "  📋 Réclamations créées: $($Matches[1])" -ForegroundColor Green  
    }
    if ($metrics -match $httpPattern) {
        Write-Host "  🌐 Requêtes POST: $($Matches[1])" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Impossible de récupérer les métriques du service" -ForegroundColor Red
}

# 7. Test de création d'une réclamation
Write-Host "`n🧪 Test de création d'une réclamation:" -ForegroundColor Yellow
try {
    $testBody = @{
        titre = "Test Diagnostic $(Get-Date -Format 'HH:mm:ss')"
        description = "Test automatique pour diagnostic dashboard"
        priorite = "haute"
        clientId = "diagnostic-test"
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Uri "http://localhost:8011/api/reclamations" -Method POST -Body $testBody -ContentType "application/json"
    Write-Host "  ✅ Réclamation créée: $($result.reclamationId)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Logs du service de réclamations
Write-Host "`n📝 Logs du service réclamations:" -ForegroundColor Yellow
docker logs reclamation-service --tail 5

Write-Host "`n✅ Diagnostic terminé!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Gray
