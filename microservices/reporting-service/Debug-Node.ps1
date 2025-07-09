# Script pour diagnostiquer et resoudre le probleme Node.js

Write-Host "Diagnostic Node.js..." -ForegroundColor Yellow

# Afficher les informations sur le dossier de travail
Write-Host "Dossier actuel: $(Get-Location)" -ForegroundColor Gray

# Verifier Node.js
Write-Host "Version Node.js:" -ForegroundColor Gray
node --version

# Verifier npm
Write-Host "Version npm:" -ForegroundColor Gray
npm --version

# Afficher les variables d'environnement Node.js
Write-Host "Variables Node.js:" -ForegroundColor Gray
Get-ChildItem Env: | Where-Object { $_.Name -like "*NODE*" } | Format-Table Name, Value

# Verifier les fichiers dans le dossier
Write-Host "Fichiers dans le dossier:" -ForegroundColor Gray
Get-ChildItem | Format-Table Name, Length

# Essayer de demarrer avec chemin explicite
Write-Host "Test avec chemin explicite..." -ForegroundColor Yellow
$currentDir = Get-Location
$serverPath = Join-Path $currentDir "test-simple.js"
Write-Host "Chemin complet: $serverPath" -ForegroundColor Gray

if (Test-Path $serverPath) {
    Write-Host "Fichier trouve, demarrage..." -ForegroundColor Green
    
    # Changer de dossier et executer
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "node"
    $processInfo.Arguments = "test-simple.js"
    $processInfo.WorkingDirectory = $currentDir
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    $process.Start() | Out-Null
    
    Start-Sleep 3
    
    # Tester la connexion
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3005/test" -Method GET -TimeoutSec 5
        Write-Host "Service demarre avec succes!" -ForegroundColor Green
        Write-Host "Reponse: $($response.message)" -ForegroundColor Gray
    } catch {
        Write-Host "Erreur de connexion: $($_.Exception.Message)" -ForegroundColor Red
        
        # Afficher les erreurs du processus
        if (!$process.HasExited) {
            $stdout = $process.StandardOutput.ReadToEnd()
            $stderr = $process.StandardError.ReadToEnd()
            
            if ($stdout) {
                Write-Host "Sortie standard:" -ForegroundColor Yellow
                Write-Host $stdout -ForegroundColor Gray
            }
            
            if ($stderr) {
                Write-Host "Erreurs:" -ForegroundColor Red
                Write-Host $stderr -ForegroundColor Gray
            }
        }
    }
    
    # Nettoyer
    if (!$process.HasExited) {
        $process.Kill()
    }
    $process.Dispose()
    
} else {
    Write-Host "Fichier non trouve: $serverPath" -ForegroundColor Red
}
