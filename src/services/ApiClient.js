const axios = require('axios');
const chalk = require('chalk');

/**
 * Client pour communiquer avec Kong API Gateway
 * Gère les appels vers les microservices via Kong avec load balancing
 */
class ApiClient {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: 15000, // Augmenté pour Kong
      headers: {
        'Content-Type': 'application/json',
        'X-Client': 'pos-console',
        'X-Kong-Request-ID': this.generateRequestId()
      }
    });

    // Intercepteur pour les erreurs avec retry logic
    this.axiosInstance.interceptors.response.use(
      response => {
        // Ajouter des infos Kong dans les logs
        if (response.headers['x-kong-upstream-latency']) {
          console.log(chalk.cyan(`🔄 Kong upstream latency: ${response.headers['x-kong-upstream-latency']}ms`));
        }
        if (response.headers['x-instance-id']) {
          console.log(chalk.blue(`🎯 Handled by instance: ${response.headers['x-instance-id']}`));
        }
        return response;
      },
      error => {
        console.error(chalk.red(`❌ Erreur API Gateway Kong: ${error.message}`));
        if (error.response) {
          console.error(chalk.red(`Status: ${error.response.status}`));
          console.error(chalk.red(`Kong Request ID: ${error.response.headers['x-kong-request-id'] || 'N/A'}`));
          if (error.response.data) {
            console.error(chalk.red(`Data: ${JSON.stringify(error.response.data)}`));
          }
        }
        throw error;
      }
    );
  }

  generateRequestId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // === PRODUITS ===
  async getProduits(magasinId = null) {
    try {
      const url = magasinId ? `/api/v2/produits?magasinId=${magasinId}` : '/api/v2/produits';
      const response = await this.axiosInstance.get(url);
      return response.data;
    } catch (error) {
      console.error(chalk.red('Erreur lors de la récupération des produits'));
      throw error;
    }
  }

  async getProduitById(id) {
    try {
      const response = await this.axiosInstance.get(`/api/v2/produits/${id}`);
      return response.data;
    } catch (error) {
      console.error(chalk.red(`Erreur lors de la récupération du produit ${id}`));
      throw error;
    }
  }

  async updateProduitStock(id, nouvelleQuantite, operation = 'set') {
    try {
      const response = await this.axiosInstance.put(`/api/v2/produits/${id}/stock`, {
        quantite: nouvelleQuantite,
        operation: operation // 'set', 'add', 'subtract'
      });
      return response.data;
    } catch (error) {
      console.error(chalk.red(`Erreur lors de la mise à jour du stock pour le produit ${id}`));
      throw error;
    }
  }

  // === VENTES ===
  async creerVente(venteData) {
    try {
      const response = await this.axiosInstance.post('/api/v2/ventes', venteData);
      return response.data;
    } catch (error) {
      console.error(chalk.red('Erreur lors de la création de la vente'));
      throw error;
    }
  }

  async getVentes(magasinId = null, utilisateurId = null) {
    try {
      let url = '/api/v2/ventes';
      const params = new URLSearchParams();
      if (magasinId) params.append('magasinId', magasinId);
      if (utilisateurId) params.append('utilisateurId', utilisateurId);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await this.axiosInstance.get(url);
      return response.data;
    } catch (error) {
      console.error(chalk.red('Erreur lors de la récupération des ventes'));
      throw error;
    }
  }

  async getVenteById(id) {
    try {
      const response = await this.axiosInstance.get(`/api/v2/ventes/${id}`);
      return response.data;
    } catch (error) {
      console.error(chalk.red(`Erreur lors de la récupération de la vente ${id}`));
      throw error;
    }
  }

  async annulerVente(id) {
    try {
      const response = await this.axiosInstance.put(`/api/v2/ventes/${id}/cancel`);
      return response.data;
    } catch (error) {
      console.error(chalk.red(`Erreur lors de l'annulation de la vente ${id}`));
      throw error;
    }
  }

  // === STOCK ===
  async getStockGlobal() {
    try {
      const response = await this.axiosInstance.get('/api/v2/stocks');
      return response.data;
    } catch (error) {
      console.error(chalk.red('Erreur lors de la récupération du stock global'));
      throw error;
    }
  }

  async getStockByMagasin(magasinId) {
    try {
      const response = await this.axiosInstance.get(`/api/v2/stocks/magasin/${magasinId}`);
      return response.data;
    } catch (error) {
      console.error(chalk.red(`Erreur lors de la récupération du stock pour le magasin ${magasinId}`));
      throw error;
    }
  }

  async demanderReapprovisionnement(reapproData) {
    try {
      const response = await this.axiosInstance.post('/api/v2/stocks/reappro', reapproData);
      return response.data;
    } catch (error) {
      console.error(chalk.red('Erreur lors de la demande de réapprovisionnement'));
      throw error;
    }
  }

  // === RAPPORTS ===
  async getRapportVentes(periode = 'all') {
    try {
      const response = await this.axiosInstance.get(`/api/v2/reports/ventes?periode=${periode}`);
      return response.data;
    } catch (error) {
      console.error(chalk.red('Erreur lors de la génération du rapport de ventes'));
      throw error;
    }
  }

  async getRapportStock() {
    try {
      const response = await this.axiosInstance.get('/api/v2/reports/stock');
      return response.data;
    } catch (error) {
      console.error(chalk.red('Erreur lors de la génération du rapport de stock'));
      throw error;
    }
  }

  async getDemandesReappro() {
    try {
      const response = await this.axiosInstance.get('/api/v2/stocks/reappro');
      return response.data;
    } catch (error) {
      console.error(chalk.red('Erreur lors de la récupération des demandes de réapprovisionnement'));
      throw error;
    }
  }

  // === HEALTH CHECK ===
  async healthCheck() {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.data;
    } catch (error) {
      console.error(chalk.red('Erreur lors du health check'));
      throw error;
    }
  }
}

module.exports = ApiClient;
