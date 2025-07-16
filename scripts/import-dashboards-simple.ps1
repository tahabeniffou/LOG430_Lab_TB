Write-Host "Import des dashboards Grafana..." -ForegroundColor Green

# Configuration
$grafanaUrl = "http://localhost:3000"
$username = "admin"
$password = "admin"

# Encodage base64 pour l'authentification
$bytes = [System.Text.Encoding]::ASCII.GetBytes("$username`:$password")
$encoded = [System.Convert]::ToBase64String($bytes)
$headers = @{
    'Authorization' = "Basic $encoded"
    'Content-Type' = 'application/json'
}

# Test de connexion Grafana
Write-Host "Test de connexion a Grafana..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "$grafanaUrl/api/health" -Headers $headers -TimeoutSec 10
    Write-Host "Grafana est accessible!" -ForegroundColor Green
}
catch {
    Write-Host "Erreur de connexion a Grafana: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Fonction d'import simple
function Import-GrafanaDashboard {
    param($FilePath, $Name)
    
    Write-Host "Import du dashboard: $Name" -ForegroundColor Yellow
    
    try {
        $dashboardJson = Get-Content $FilePath -Raw | ConvertFrom-Json
        
        $payload = @{
            dashboard = $dashboardJson
            overwrite = $true
        } | ConvertTo-Json -Depth 50
        
        $response = Invoke-RestMethod -Uri "$grafanaUrl/api/dashboards/db" -Method POST -Headers $headers -Body $payload
        
        Write-Host "Dashboard importe avec succes: $Name" -ForegroundColor Green
        Write-Host "URL: $grafanaUrl/d/$($response.uid)" -ForegroundColor Cyan
        return $response
    }
    catch {
        Write-Host "Erreur import $Name`: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Import des dashboards
$results = @()

if (Test-Path "config/grafana/dashboards/event-driven-dashboard.json") {
    $result1 = Import-GrafanaDashboard -FilePath "config/grafana/dashboards/event-driven-dashboard.json" -Name "Event-Driven Architecture"
    if ($result1) { $results += $result1 }
}

if (Test-Path "config/grafana/dashboards/rabbitmq-topics-dashboard.json") {
    $result2 = Import-GrafanaDashboard -FilePath "config/grafana/dashboards/rabbitmq-topics-dashboard.json" -Name "RabbitMQ Topics"
    if ($result2) { $results += $result2 }
}

Write-Host "`nDashboards importes: $($results.Count)" -ForegroundColor Green
Write-Host "Acces Grafana: $grafanaUrl" -ForegroundColor Cyan
Write-Host "Acces RabbitMQ: http://localhost:15672" -ForegroundColor Cyan
