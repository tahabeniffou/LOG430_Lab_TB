const { Sequelize, DataTypes } = require('sequelize');

// Configuration de la base de données spécifique au microservice produit
const sequelize = new Sequelize(
  process.env.DB_NAME || 'produit_service_db',
  process.env.DB_USER || 'produit_user',
  process.env.DB_PASSWORD || 'produit_password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mysql',
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

// Modèle Sequelize pour les produits
const ProduitModel = sequelize.define('Produit', {
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
  prix: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  categorie: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'General',
  },
}, {
  tableName: 'produits',
  indexes: [
    {
      fields: ['nom'],
    },
    {
      fields: ['categorie'],
    },
    {
      fields: ['stock'],
    },
  ],
});

module.exports = {
  sequelize,
  ProduitModel,
};
