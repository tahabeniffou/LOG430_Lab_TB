const { Sequelize, DataTypes } = require('sequelize');

// Configuration de la base de données spécifique au microservice produit
const dbConfig = {
  dialect: process.env.DB_DIALECT || 'postgres',
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
};

// Configuration selon le dialecte
if (process.env.DB_DIALECT === 'postgres' || !process.env.DB_DIALECT) {
  // Configuration PostgreSQL (par défaut)
  Object.assign(dbConfig, {
    host: process.env.DB_HOST || 'postgres-produit',
    port: process.env.DB_PORT || 5432,
    username: process.env.DB_USER || 'produit_user',
    password: process.env.DB_PASSWORD || 'produit_password',
    database: process.env.DB_NAME || 'produit_service_db'
  });
} else if (process.env.DB_DIALECT === 'mysql') {
  // Configuration MySQL
  Object.assign(dbConfig, {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USER || 'produit_user',
    password: process.env.DB_PASSWORD || 'produit_password',
    database: process.env.DB_NAME || 'produit_service_db'
  });
}

const sequelize = new Sequelize(dbConfig);

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
