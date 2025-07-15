const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 8010;

app.use(express.json());

// Simuler une base de données en mémoire
const sagas = new Map();

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'saga-orchestrator-service',
        timestamp: new Date().toISOString()
    });
});

// Métriques simples pour démonstration
app.get('/metrics', (req, res) => {
    const totalSagas = sagas.size;
    const completedSagas = Array.from(sagas.values()).filter(s => s.status === 'COMPLETED').length;
    const failedSagas = Array.from(sagas.values()).filter(s => s.status === 'FAILED').length;
    const compensatedSagas = Array.from(sagas.values()).filter(s => s.status === 'COMPENSATED').length;

    const metrics = `# HELP saga_started_total Total number of sagas started
# TYPE saga_started_total counter
saga_started_total ${totalSagas}

# HELP saga_completed_total Total number of sagas completed
# TYPE saga_completed_total counter
saga_completed_total{status="success"} ${completedSagas}
saga_completed_total{status="failed"} ${failedSagas}

# HELP saga_compensations_total Total number of saga compensations
# TYPE saga_compensations_total counter
saga_compensations_total ${compensatedSagas}

# HELP saga_step_duration_seconds Duration of saga execution
# TYPE saga_step_duration_seconds histogram
saga_step_duration_seconds_bucket{le="1"} ${Math.floor(totalSagas * 0.3)}
saga_step_duration_seconds_bucket{le="5"} ${Math.floor(totalSagas * 0.8)}
saga_step_duration_seconds_bucket{le="10"} ${totalSagas}
saga_step_duration_seconds_bucket{le="+Inf"} ${totalSagas}
saga_step_duration_seconds_count ${totalSagas}
saga_step_duration_seconds_sum ${totalSagas * 2.5}
`;

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
});

// Lister les sagas
app.get('/saga/list', (req, res) => {
    const sagaList = Array.from(sagas.values()).map(saga => ({
        id: saga.id,
        status: saga.status,
        created_at: saga.created_at,
        orderData: saga.orderData
    }));
    
    res.json(sagaList);
});

// Statut d'une saga
app.get('/saga/:sagaId/status', (req, res) => {
    const saga = sagas.get(req.params.sagaId);
    if (!saga) {
        return res.status(404).json({ error: 'Saga not found' });
    }
    res.json(saga);
});

// Créer une saga (simulation)
app.post('/saga/order', async (req, res) => {
    const sagaId = uuidv4();
    const { produitId, quantite, clientId, montant } = req.body;
    
    console.log(`🚀 Démarrage Saga ${sagaId}`, { produitId, quantite, clientId, montant });
    
    const saga = {
        id: sagaId,
        status: 'STARTED',
        created_at: new Date().toISOString(),
        orderData: { produitId, quantite, clientId, montant },
        steps: []
    };
    
    sagas.set(sagaId, saga);
    
    try {
        // Étape 1: Vérification Stock
        saga.steps.push({ step: 'StockReservationDemandee', timestamp: new Date().toISOString() });
        console.log(`📦 Saga ${sagaId}: StockReservationDemandee`);
        
        if (produitId === '999' || quantite > 50) {
            saga.steps.push({ step: 'StockReservationEchouee', timestamp: new Date().toISOString(), error: 'Stock insuffisant' });
            saga.status = 'FAILED';
            console.log(`❌ Saga ${sagaId}: StockReservationEchouee - Stock insuffisant`);
            return res.status(500).json({
                sagaId,
                status: 'failed',
                error: 'StockReservationEchouee: Stock insuffisant'
            });
        }
        
        saga.steps.push({ step: 'StockReserve', timestamp: new Date().toISOString(), data: { produitId, quantite } });
        console.log(`✅ Saga ${sagaId}: StockReserve`);
        
        // Étape 2: Traitement Paiement
        saga.steps.push({ step: 'PaiementDemande', timestamp: new Date().toISOString() });
        console.log(`💳 Saga ${sagaId}: PaiementDemande`);
        
        if (montant > 1000) {
            saga.steps.push({ step: 'PaiementEchoue', timestamp: new Date().toISOString(), error: 'Solde insuffisant' });
            saga.steps.push({ step: 'StockLibere', timestamp: new Date().toISOString(), compensation: true });
            saga.status = 'COMPENSATED';
            console.log(`❌ Saga ${sagaId}: PaiementEchoue - Compensation stock`);
            return res.status(500).json({
                sagaId,
                status: 'compensated',
                error: 'PaiementEchoue: Solde insuffisant - Stock libéré automatiquement'
            });
        }
        
        saga.steps.push({ step: 'PaiementReussi', timestamp: new Date().toISOString(), data: { clientId, montant } });
        console.log(`✅ Saga ${sagaId}: PaiementReussi`);
        
        // Étape 3: Création Vente
        saga.steps.push({ step: 'VenteDemandee', timestamp: new Date().toISOString() });
        console.log(`🛒 Saga ${sagaId}: VenteDemandee`);
        
        const venteId = `VENTE-${Date.now()}`;
        saga.steps.push({ step: 'VenteCreee', timestamp: new Date().toISOString(), data: { venteId, produitId, quantite, clientId, montant } });
        saga.steps.push({ step: 'CommandeTerminee', timestamp: new Date().toISOString() });
        saga.status = 'COMPLETED';
        
        console.log(`🎉 Saga ${sagaId}: CommandeTerminee`);
        
        res.status(200).json({
            sagaId,
            status: 'completed',
            result: {
                stockReservation: { produitId, quantite },
                payment: { clientId, montant },
                sale: { venteId, produitId, quantite, clientId, montant }
            }
        });
        
    } catch (error) {
        saga.status = 'FAILED';
        saga.steps.push({ step: 'ErreurInattendue', timestamp: new Date().toISOString(), error: error.message });
        console.log(`💥 Saga ${sagaId}: ErreurInattendue - ${error.message}`);
        res.status(500).json({
            sagaId,
            status: 'error',
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🎯 Saga Orchestrator Service démarré sur le port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 Métriques: http://localhost:${PORT}/metrics`);
    console.log(`📋 Liste sagas: http://localhost:${PORT}/saga/list`);
    console.log(`🧪 Prêt pour démonstration !`);
});

module.exports = app;
