// Serveur Express dédié à l'endpoint /metrics pour Prometheus
const express = require('express');
const client = require('prom-client');

const app = express();
client.collectDefaultMetrics();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Serveur Prometheus /metrics sur le port ${PORT}`));
