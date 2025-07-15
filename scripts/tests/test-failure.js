// Test d'un scénario d'échec pour démonstration
const testFailureScenario = async () => {
    try {
        const response = await fetch('http://localhost:8010/saga/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                articleId: 'FAIL_ARTICLE',
                quantity: -1,  // Quantité invalide pour forcer l'échec
                compteId: 'TEST_COMPTE',
                totalAmount: 0
            })
        });
        
        const result = await response.json();
        console.log('Résultat test échec:', result);
        
        // Récupérer les métriques mises à jour
        const metricsResponse = await fetch('http://localhost:8010/saga/metrics');
        const metrics = await metricsResponse.json();
        console.log('Métriques après test:', metrics);
        
    } catch (error) {
        console.error('Erreur test:', error);
    }
};

testFailureScenario();
