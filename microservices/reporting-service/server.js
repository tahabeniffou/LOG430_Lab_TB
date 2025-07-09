const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3008;

app.use(cors());
app.use(express.json());

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'reporting_db',
  port: process.env.DB_PORT || 3306
};

// Test de connexion à la base de données
async function testConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion à la base de données réussie');
    await connection.end();
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error.message);
  }
}

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'reporting-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/reports/sales', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT COUNT(*) as total_sales FROM sales');
    await connection.end();
    
    res.json({
      report_type: 'sales_summary',
      total_sales: rows[0].total_sales,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur lors de la génération du rapport des ventes:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

app.get('/api/reports/inventory', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT COUNT(*) as total_products FROM products');
    await connection.end();
    
    res.json({
      report_type: 'inventory_summary',
      total_products: rows[0].total_products,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur lors de la génération du rapport d\'inventaire:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

app.get('/api/reports', (req, res) => {
  res.json({
    available_reports: [
      {
        endpoint: '/api/reports/sales',
        description: 'Rapport des ventes'
      },
      {
        endpoint: '/api/reports/inventory', 
        description: 'Rapport d\'inventaire'
      }
    ]
  });
});

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Quelque chose s\'est mal passé!' });
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`🚀 Reporting Service démarré sur le port ${port}`);
  testConnection();
});
