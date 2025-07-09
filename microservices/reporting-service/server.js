const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3008;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration de la base de données
const dbConfig = {
    host: process.env.DB_HOST || 'mysql-main-db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'main_db'
};

// Fonction pour créer une connexion à la base de données
async function createConnection() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        return connection;
    } catch (error) {
        console.error('Erreur de connexion à la base de données:', error);
        throw error;
    }
}

// Route de santé
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        service: 'reporting-service',
        timestamp: new Date().toISOString()
    });
});

// Route pour obtenir le rapport des ventes
app.get('/api/reports/sales', async (req, res) => {
    try {
        const connection = await createConnection();
        
        const [rows] = await connection.execute(`
            SELECT 
                DATE(date_vente) as date_vente,
                COUNT(*) as nombre_ventes,
                SUM(montant_total) as montant_total
            FROM ventes 
            WHERE date_vente >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(date_vente)
            ORDER BY date_vente DESC
        `);
        
        await connection.end();
        
        res.json({
            success: true,
            data: rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erreur lors de la génération du rapport des ventes:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            timestamp: new Date().toISOString()
        });
    }
});

// Route pour obtenir le rapport des produits populaires
app.get('/api/reports/popular-products', async (req, res) => {
    try {
        const connection = await createConnection();
        
        const [rows] = await connection.execute(`
            SELECT 
                p.nom as nom_produit,
                p.prix,
                COUNT(vi.produit_id) as nombre_ventes,
                SUM(vi.quantite) as quantite_totale,
                SUM(vi.prix_unitaire * vi.quantite) as revenus_totaux
            FROM produits p
            JOIN vente_items vi ON p.id = vi.produit_id
            JOIN ventes v ON vi.vente_id = v.id
            WHERE v.date_vente >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY p.id, p.nom, p.prix
            ORDER BY nombre_ventes DESC
            LIMIT 10
        `);
        
        await connection.end();
        
        res.json({
            success: true,
            data: rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erreur lors de la génération du rapport des produits populaires:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            timestamp: new Date().toISOString()
        });
    }
});

// Route pour obtenir les statistiques générales
app.get('/api/reports/statistics', async (req, res) => {
    try {
        const connection = await createConnection();
        
        // Statistiques des ventes
        const [salesStats] = await connection.execute(`
            SELECT 
                COUNT(*) as total_ventes,
                SUM(montant_total) as revenus_totaux,
                AVG(montant_total) as panier_moyen
            FROM ventes 
            WHERE date_vente >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        
        // Nombre de produits
        const [productStats] = await connection.execute(`
            SELECT COUNT(*) as total_produits
            FROM produits
        `);
        
        await connection.end();
        
        res.json({
            success: true,
            data: {
                sales: salesStats[0],
                products: productStats[0]
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erreur lors de la génération des statistiques:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            timestamp: new Date().toISOString()
        });
    }
});

// Gestionnaire d'erreur global
app.use((err, req, res, next) => {
    console.error('Erreur non gérée:', err);
    res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur',
        timestamp: new Date().toISOString()
    });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Service de reporting démarré sur le port ${PORT}`);
    console.log(`Configuration DB: ${JSON.stringify({...dbConfig, password: '***'})}`);
});

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
    console.log('Signal SIGTERM reçu, arrêt du serveur...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Signal SIGINT reçu, arrêt du serveur...');
    process.exit(0);
});
