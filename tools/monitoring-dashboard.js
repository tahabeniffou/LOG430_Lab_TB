const express = require('express');
const axios = require('axios');
const app = express();

// Configuration des services à monitorer
const services = [
  { name: 'API Gateway', url: 'http://localhost:3000', port: 3000 },
  { name: 'Produit Service', url: 'http://localhost:3001', port: 3001 },
  { name: 'Stock Service', url: 'http://localhost:3002', port: 3002 },
  { name: 'Vente Service', url: 'http://localhost:3003', port: 3003 },
  { name: 'Reporting Service', url: 'http://localhost:3004', port: 3004 }
];

app.use(express.static('public'));

// Route pour obtenir les métriques de tous les services
app.get('/api/metrics', async (req, res) => {
  const results = [];
  
  for (const service of services) {
    try {
      // Check health
      const healthResponse = await axios.get(`${service.url}/health`, { timeout: 3000 });
      
      // Get metrics
      let metrics = {};
      try {
        const metricsResponse = await axios.get(`${service.url}/metrics`, { timeout: 3000 });
        const lines = metricsResponse.data.split('\n');
        
        // Parse basic metrics
        const httpRequestsLine = lines.find(line => line.includes('http_requests_total'));
        metrics.totalRequests = httpRequestsLine ? parseInt(httpRequestsLine.split(' ')[1]) || 0 : 0;
        
        const cpuLine = lines.find(line => line.includes('process_cpu_user_seconds_total'));
        metrics.cpuUsage = cpuLine ? parseFloat(cpuLine.split(' ')[1]) || 0 : 0;
        
      } catch (e) {
        metrics = { totalRequests: 0, cpuUsage: 0 };
      }
      
      results.push({
        name: service.name,
        status: healthResponse.status === 200 ? 'healthy' : 'unhealthy',
        port: service.port,
        responseTime: Date.now() - start,
        metrics
      });
      
    } catch (error) {
      results.push({
        name: service.name,
        status: 'down',
        port: service.port,
        responseTime: null,
        metrics: { totalRequests: 0, cpuUsage: 0 },
        error: error.message
      });
    }
  }
  
  res.json({
    timestamp: new Date().toISOString(),
    services: results
  });
});

// Page de monitoring
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Monitoring Dashboard - LOG430 Lab</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .service-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status-healthy { border-left: 5px solid #27ae60; }
        .status-unhealthy { border-left: 5px solid #e74c3c; }
        .status-down { border-left: 5px solid #95a5a6; }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .metric-value { font-weight: bold; color: #2c3e50; }
        .refresh-btn { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        .refresh-btn:hover { background: #2980b9; }
        .timestamp { text-align: center; color: #7f8c8d; margin: 20px 0; }
        .load-test-section { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .load-test-btn { background: #e67e22; color: white; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer; font-size: 16px; }
        .load-test-btn:hover { background: #d35400; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Monitoring Dashboard - Architecture Microservices</h1>
            <p>Surveillance en temps réel des services LOG430 Lab</p>
            <button class="refresh-btn" onclick="loadMetrics()">🔄 Actualiser</button>
        </div>
        
        <div class="load-test-section">
            <h2>📊 Test de Charge K6</h2>
            <p>Lancer un test de charge avec 400 utilisateurs virtuels pendant 60 secondes</p>
            <button class="load-test-btn" onclick="runLoadTest()">🚀 Lancer Test K6 (400 VUs)</button>
            <div id="load-test-results" style="margin-top: 15px;"></div>
        </div>
        
        <div id="services-container">
            <div class="services-grid" id="services-grid">
                <p>Chargement des métriques...</p>
            </div>
        </div>
        
        <div id="timestamp" class="timestamp"></div>
    </div>

    <script>
        async function loadMetrics() {
            try {
                const response = await fetch('/api/metrics');
                const data = await response.json();
                
                const grid = document.getElementById('services-grid');
                grid.innerHTML = '';
                
                data.services.forEach(service => {
                    const card = document.createElement('div');
                    card.className = \`service-card status-\${service.status}\`;
                    
                    card.innerHTML = \`
                        <h3>\${service.name}</h3>
                        <div class="metric">
                            <span>Statut:</span>
                            <span class="metric-value">\${service.status.toUpperCase()}</span>
                        </div>
                        <div class="metric">
                            <span>Port:</span>
                            <span class="metric-value">\${service.port}</span>
                        </div>
                        <div class="metric">
                            <span>Requêtes totales:</span>
                            <span class="metric-value">\${service.metrics.totalRequests}</span>
                        </div>
                        <div class="metric">
                            <span>CPU Usage:</span>
                            <span class="metric-value">\${service.metrics.cpuUsage.toFixed(2)}s</span>
                        </div>
                        \${service.responseTime ? \`
                        <div class="metric">
                            <span>Temps de réponse:</span>
                            <span class="metric-value">\${service.responseTime}ms</span>
                        </div>
                        \` : ''}
                        \${service.error ? \`<p style="color: #e74c3c; font-size: 12px;">Erreur: \${service.error}</p>\` : ''}
                    \`;
                    
                    grid.appendChild(card);
                });
                
                document.getElementById('timestamp').textContent = \`Dernière mise à jour: \${new Date(data.timestamp).toLocaleString()}\`;
                
            } catch (error) {
                console.error('Erreur lors du chargement des métriques:', error);
                document.getElementById('services-grid').innerHTML = '<p style="color: red;">Erreur lors du chargement des métriques</p>';
            }
        }
        
        async function runLoadTest() {
            const resultsDiv = document.getElementById('load-test-results');
            resultsDiv.innerHTML = '<p style="color: #f39c12;">⏳ Test de charge en cours... (60 secondes)</p>';
            
            try {
                const response = await fetch('/api/load-test', { method: 'POST' });
                const result = await response.text();
                resultsDiv.innerHTML = \`<pre style="background: #2c3e50; color: white; padding: 15px; border-radius: 5px; overflow-x: auto;">\${result}</pre>\`;
            } catch (error) {
                resultsDiv.innerHTML = \`<p style="color: red;">Erreur: \${error.message}</p>\`;
            }
        }
        
        // Actualisation automatique toutes les 5 secondes
        setInterval(loadMetrics, 5000);
        
        // Chargement initial
        loadMetrics();
    </script>
</body>
</html>
  `);
});

// Route pour déclencher le test de charge K6
app.post('/api/load-test', (req, res) => {
  const { spawn } = require('child_process');
  
  // Lancer K6 avec le script de test
  const k6Process = spawn('k6', ['run', 'tests/k6-load-test-advanced.js'], {
    cwd: process.cwd()
  });
  
  let output = '';
  
  k6Process.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  k6Process.stderr.on('data', (data) => {
    output += data.toString();
  });
  
  k6Process.on('close', (code) => {
    res.send(output || 'Test terminé - Aucune sortie disponible');
  });
  
  // Timeout après 120 secondes
  setTimeout(() => {
    k6Process.kill();
    if (!res.headersSent) {
      res.send(output + '\n\n⚠️ Test interrompu après 120 secondes');
    }
  }, 120000);
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`📊 Dashboard de monitoring démarré sur http://localhost:${PORT}`);
  console.log('🎯 Accédez au tableau de bord pour voir les métriques en temps réel');
});

// Variable pour mesurer le temps de réponse
let start = Date.now();
