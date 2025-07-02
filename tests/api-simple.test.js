const request = require('supertest');
const app = require('../server.js');
const { sequelize } = require('../src/models');

let magasinId;
let produitId;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  // Créer un magasin
  const magasinRes = await request(app)
    .post('/api/v1/magasins')
    .send({ nom: 'TestMagasin', adresse: '123 rue test' });
  magasinId = magasinRes.body.id;
  // Créer un produit
  const produitRes = await request(app)
    .post('/api/v1/produits')
    .send({ nom: 'TestProduit', prix: 1.99, stock: 10, magasinId });
  produitId = produitRes.body.id;
  // Créer un utilisateur
  await request(app)
    .post('/api/v1/utilisateurs')
    .send({ nom: 'caissierTest', motDePasse: 'azerty', role: 'Caissier', magasinId });
});

describe('API Tests', () => {
  describe('GET /api/v1/produits', () => {
    it('should return all products', async () => {
      const response = await request(app)
        .get('/api/v1/produits')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/magasins', () => {
    it('should return all magasins', async () => {
      const response = await request(app)
        .get('/api/v1/magasins')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/utilisateurs', () => {
    it('should return all users', async () => {
      const response = await request(app)
        .get('/api/v1/utilisateurs')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /', () => {
    it('should return status OK', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body.status).toBe('OK');
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body.status).toBe('OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.service).toBe('LOG430 Lab TB API');
    });
  });

  describe('POST /api/v1/utilisateurs/auth', () => {
    it('should authenticate with correct credentials', async () => {
      // Créer un utilisateur de test
      const user = { nom: 'caissierTest', motDePasse: 'azerty', role: 'Caissier' };
      await request(app).post('/api/v1/utilisateurs').send(user);
      // Authentification OK
      const res = await request(app)
        .post('/api/v1/utilisateurs/auth')
        .send({ nom: user.nom, motDePasse: user.motDePasse });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('nom', user.nom);
    });
    it('should fail with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/utilisateurs/auth')
        .send({ nom: 'caissierTest', motDePasse: 'mauvais' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/produits/erreur500', () => {
    it('should return 500 error for test', async () => {
      const res = await request(app)
        .get('/api/v1/produits/erreur500');
      expect(res.status).toBe(500);
    });
  });
});
