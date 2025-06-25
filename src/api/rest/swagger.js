
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'LOG430 Lab TB POS API',
      version: '1.0.0',
      description: 'Documentation des endpoints REST pour le POS et la maison-mère'
    },
    servers: [
      { url: 'http://localhost:3000/api/v1', description: 'Serveur local' }
    ],
  },
  // Chemins vers tous vos fichiers de routes commentés avec JSDoc @swagger
  apis: [
    './src/api/rest/routes/*.js',
    './src/api/rest/controllers/*.js'
  ],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = {
  swaggerSpec,
  default: swaggerSpec
};
