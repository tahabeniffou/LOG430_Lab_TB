const request = require('supertest');
const app = require('../server'); 
const { expect } = require('chai');
// Récupérer le token d'auth depuis l'environnement
const TOKEN = process.env.AUTH_TOKEN || 'TEST_TOKEN';
const authHeader = { Authorization: `Bearer ${TOKEN}` };

let createdProduitId;
let createdMagasinId;

describe('API REST Tests', () => {
  describe('Endpoints Produits', () => {
    before(async () => {
      // Créer un magasin pour les tests produits
      const magasin = { nom: 'MagasinTest', adresse: '123 rue Test' };
      const res = await request(app)
        .post('/api/v1/magasins')
        .send(magasin)
        .set(authHeader)
        .expect(201);
      createdMagasinId = res.body.id;
    });

    it('GET /api/v1/produits → 200 + array', async () => {
      const res = await request(app)
        .get('/api/v1/produits')
        .set(authHeader)
        .expect(200);
      expect(Array.isArray(res.body)).to.equal(true);
    });

    it('POST /api/v1/produits → 201 + nouvel objet', async () => {
      const newProd = { nom: 'TestProd', prix: 9.99, stock: 100, magasinId: createdMagasinId };
      const res = await request(app)
        .post('/api/v1/produits')
        .send(newProd)
        .set(authHeader)
        .expect(201);
      expect(res.body).to.have.property('id');
      expect(res.body.nom).to.equal(newProd.nom);
      createdProduitId = res.body.id;
    });

    it('GET /api/v1/produits/:id → 200 + produit', async () => {
      const res = await request(app)
        .get(`/api/v1/produits/${createdProduitId}`)
        .set(authHeader)
        .expect(200);
      expect(res.body.id).to.equal(createdProduitId);
    });

    it('PUT /api/v1/produits/:id → 200 + mis à jour', async () => {
      const changes = { prix: 19.99 };
      const res = await request(app)
        .put(`/api/v1/produits/${createdProduitId}`)
        .send(changes)
        .set(authHeader)
        .expect(200);
      expect(res.body.prix).to.equal(changes.prix);
    });

    it('DELETE /api/v1/produits/:id → 204', async () => {
      await request(app)
        .delete(`/api/v1/produits/${createdProduitId}`)
        .set(authHeader)
        .expect(204);
    });
  });

  describe('Endpoints Ventes', () => {
    it('GET /api/v1/ventes → 200 + array', async () => {
      await request(app)
        .get('/api/v1/ventes')
        .set(authHeader)
        .expect(200)
        .then(res => expect(Array.isArray(res.body)).to.equal(true));
    });
    // Ajoutez ici POST, GET/:id, PUT, DELETE pour /ventes si pertinent
  });

  describe('Endpoints Rapports', () => {
    it('GET /api/v1/rapports?type=ventes → 200 + array', async () => {
      await request(app)
        .get('/api/v1/rapports')
        .query({ type: 'ventes' })
        .set(authHeader)
        .expect(200)
        .then(res => expect(Array.isArray(res.body)).to.equal(true));
    });
  });

  describe('Endpoints Utilisateurs', () => {
    it('GET /api/v1/utilisateurs → 200 + array', async () => {
      await request(app)
        .get('/api/v1/utilisateurs')
        .set(authHeader)
        .expect(200)
        .then(res => expect(Array.isArray(res.body)).to.equal(true));
    });
  });
});
