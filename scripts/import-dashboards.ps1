# Script PowerShell pour importer les dashboards Grafana
param(
    [string]$GrafanaUrl = "http://localhost:3000",
    [string]$Username = "admin",
    [string]$Password = "admin"
)

Write-Host "🎯 Import des dashboards Grafana..." -ForegroundColor Green

# Configuration
$headers = @{
    'Content-Type' = 'application/json'
}

# Fonction pour créer l'authentification
function Get-AuthHeaders {
    $bytes = [System.Text.Encoding]::ASCII.GetBytes("${Username}:${Password}")
    $encoded = [System.Convert]::ToBase64String($bytes)
    return @{
        'Authorization' = "Basic $encoded"
        'Content-Type' = 'application/json'
    }
}

# Fonction pour importer un dashboard
function Import-Dashboard {
    param($DashboardPath, $DashboardName)
    
    Write-Host "📊 Import du dashboard: $DashboardName" -ForegroundColor Yellow
    
    try {
        $dashboardContent = Get-Content $DashboardPath -Raw | ConvertFrom-Json
        
        # Préparer le payload pour l'import
        $importPayload = @{
            dashboard = $dashboardContent
            overwrite = $true
            inputs = @()
        } | ConvertTo-Json -Depth 50
        
        $authHeaders = Get-AuthHeaders
        $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/dashboards/db" -Method POST -Headers $authHeaders -Body $importPayload
        
        Write-Host "✅ Dashboard '$DashboardName' importé avec succès!" -ForegroundColor Green
        Write-Host "   URL: $GrafanaUrl/d/$($response.uid)" -ForegroundColor Cyan
        
        return $response
    }
    catch {
        Write-Host "❌ Erreur lors de l'import de '$DashboardName': $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Attendre que Grafana soit prêt
Write-Host "⏳ Attente que Grafana soit prêt..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0

do {
    try {
        $authHeaders = Get-AuthHeaders
        $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/health" -Headers $authHeaders -TimeoutSec 5
        if ($response) {
            Write-Host "✅ Grafana est prêt!" -ForegroundColor Green
            break
        }
    }
    catch {
        $attempt++
        if ($attempt -ge $maxAttempts) {
            Write-Host "❌ Timeout: Grafana n'est pas accessible après $maxAttempts tentatives" -ForegroundColor Red
            exit 1
        }
        Write-Host "⏳ Tentative $attempt/$maxAttempts - Attente de Grafana..." -ForegroundColor Yellow
        Start-Sleep 2
    }
} while ($attempt -lt $maxAttempts)

# Import des dashboards
$dashboards = @(
    @{
        Path = "config/grafana/dashboards/event-driven-dashboard.json"
        Name = "Event-Driven Architecture"
    },
    @{
        Path = "config/grafana/dashboards/rabbitmq-topics-dashboard.json"
        Name = "RabbitMQ Topics Monitoring"
    }
)

$importedDashboards = @()

foreach ($dashboard in $dashboards) {
    if (Test-Path $dashboard.Path) {
        $result = Import-Dashboard -DashboardPath $dashboard.Path -DashboardName $dashboard.Name
        if ($result) {
            $importedDashboards += $result
        }
    } else {
        Write-Host "⚠️  Dashboard non trouvé: $($dashboard.Path)" -ForegroundColor Yellow
    }
}

# Résumé
Write-Host "`n🎉 Import terminé!" -ForegroundColor Green
Write-Host "📊 Dashboards importés: $($importedDashboards.Count)" -ForegroundColor Cyan

if ($importedDashboards.Count -gt 0) {
    Write-Host "`n🔗 URLs des dashboards:" -ForegroundColor Green
    foreach ($dashboard in $importedDashboards) {
        Write-Host "   • $($dashboard.meta.slug): $GrafanaUrl/d/$($dashboard.uid)" -ForegroundColor Cyan
    }
    
    Write-Host "`n🌐 Accès direct:" -ForegroundColor Green
    Write-Host "   • Grafana: $GrafanaUrl" -ForegroundColor Cyan
    Write-Host "   • RabbitMQ Management: http://localhost:15672" -ForegroundColor Cyan
    Write-Host "   • Prometheus: http://localhost:9090" -ForegroundColor Cyan
}
