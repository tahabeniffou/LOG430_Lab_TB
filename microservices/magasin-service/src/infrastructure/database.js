const { Sequelize, DataTypes } = require('sequelize');

// Configuration de la base de données spécifique au microservice magasin
const sequelize = new Sequelize(
  process.env.DB_NAME || 'magasin_service_db',
  process.env.DB_USER || 'magasin_user',
  process.env.DB_PASSWORD || 'magasin_password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
    },
  }
);

// Modèle Sequelize pour les magasins
const MagasinModel = sequelize.define('Magasin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nom: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  adresse: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  utilisateurs: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
}, {
  tableName: 'magasins',
  indexes: [
    {
      fields: ['nom'],
    },
    {
      fields: ['adresse'],
    },
  ],
});

module.exports = {
  sequelize,
  MagasinModel,
};
