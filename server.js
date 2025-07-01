const express = require('express');
const { sequelize } = require('./src/models');
require('./src/models/associations');

const app = express();
app.use(express.json());

async function startServer() {
  await sequelize.sync({ alter: true });
  // Attacher les routes seulement après la création des tables
  const api = require('./src/api/rest');
  app.use('/api/v1', api);
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`API démarrée sur le port ${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
