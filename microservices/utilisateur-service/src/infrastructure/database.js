const { Sequelize, DataTypes } = require('sequelize');

// Configuration de la base de données spécifique au microservice utilisateur
const sequelize = new Sequelize(
  process.env.DB_NAME || 'utilisateur_service_db',
  process.env.DB_USER || 'utilisateur_user',
  process.env.DB_PASSWORD || 'utilisateur_password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.NODE_ENV === 'production' ? false : console.log,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
);

// Modèle Sequelize pour Utilisateur
const UtilisateurModel = sequelize.define('Utilisateur', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nom: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  role: {
    type: DataTypes.ENUM('employe', 'manager', 'admin'),
    allowNull: false,
    defaultValue: 'employe'
  },
  actif: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  date_creation: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  date_modification: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'utilisateurs',
  timestamps: true,
  createdAt: 'date_creation',
  updatedAt: 'date_modification'
});

module.exports = {
  sequelize,
  UtilisateurModel
};
