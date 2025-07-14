const { Sequelize, DataTypes } = require('sequelize');

// Configuration de la base de données spécifique au microservice vente
const sequelize = new Sequelize(
  process.env.DB_NAME || 'vente_service_db',
  process.env.DB_USER || 'vente_user',
  process.env.DB_PASSWORD || 'vente_password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
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

// Modèle Sequelize pour Vente
const VenteModel = sequelize.define('Vente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  magasin_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  utilisateur_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  statut: {
    type: DataTypes.ENUM('en_cours', 'confirmee', 'annulee'),
    allowNull: false,
    defaultValue: 'en_cours'
  },
  montant_total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
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
  tableName: 'ventes',
  timestamps: true,
  createdAt: 'date_creation',
  updatedAt: 'date_modification'
});

// Modèle Sequelize pour LigneVente
const LigneVenteModel = sequelize.define('LigneVente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  vente_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: VenteModel,
      key: 'id'
    }
  },
  produit_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  nom_produit: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  prix_unitaire: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  quantite: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  sous_total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'lignes_vente',
  timestamps: false
});

// Associations
VenteModel.hasMany(LigneVenteModel, {
  foreignKey: 'vente_id',
  as: 'lignes'
});

LigneVenteModel.belongsTo(VenteModel, {
  foreignKey: 'vente_id',
  as: 'vente'
});

module.exports = {
  sequelize,
  VenteModel,
  LigneVenteModel
};
