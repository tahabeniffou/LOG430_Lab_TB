# Script de diagnostic RabbitMQ simplifie
Write-Host "Diagnostic RabbitMQ et Dashboard Grafana" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Gray

Write-Host "`nLogs RabbitMQ (dernieres lignes):" -ForegroundColor Yellow
docker logs rabbitmq-broker --tail 10

Write-Host "`nLogs du service reclamations:" -ForegroundColor Yellow  
docker logs reclamation-service --tail 5

Write-Host "`nTest des metriques:" -ForegroundColor Yellow
try {
    $metrics = Invoke-RestMethod -Uri "http://localhost:8011/metrics"
    $events = ($metrics | Select-String "events_published_total.*ReclamationCreated.*(\d+)").Matches[0].Groups[1].Value
    $reclamations = ($metrics | Select-String "reclamations_total.*created.*(\d+)").Matches[0].Groups[1].Value
    Write-Host "  Evenements publies: $events" -ForegroundColor Green
    Write-Host "  Reclamations creees: $reclamations" -ForegroundColor Green
} catch {
    Write-Host "  Erreur de recuperation des metriques" -ForegroundColor Red
}

Write-Host "`nTest de creation d'une reclamation:" -ForegroundColor Yellow
try {
    $body = '{"titre":"Test Diagnostic","description":"Test auto","priorite":"normale","clientId":"diag"}'
    $result = Invoke-RestMethod -Uri "http://localhost:8011/api/reclamations" -Method POST -Body $body -ContentType "application/json"
    Write-Host "  Reclamation creee avec succes" -ForegroundColor Green
} catch {
    Write-Host "  Erreur de creation" -ForegroundColor Red
}

Write-Host "`nVerification Prometheus:" -ForegroundColor Yellow
try {
    $prometheus = Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=up"
    $upServices = $prometheus.data.result.Count
    Write-Host "  Services monitores: $upServices" -ForegroundColor Green
} catch {
    Write-Host "  Prometheus non accessible" -ForegroundColor Red
}

Write-Host "`nDiagnostic termine!" -ForegroundColor Green
