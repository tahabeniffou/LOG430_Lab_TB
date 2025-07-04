const request = require('supertest');
const express = require('express');
const routes = require('../src/interfaces/api/routes'); // Correction du chemin

const app = express();
app.use(express.json());
app.use('/', routes);

describe('Health Check API', () => {
  it('should return OK status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('date');
  });
});
