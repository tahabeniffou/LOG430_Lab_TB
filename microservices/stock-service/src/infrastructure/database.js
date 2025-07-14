const { Sequelize, DataTypes } = require('sequelize');

// Configuration de la base de données spécifique au microservice stock
const sequelize = new Sequelize(
  process.env.DB_NAME || 'stock_service_db',
  process.env.DB_USER || 'stock_user',
  process.env.DB_PASSWORD || 'stock_password',
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

// Modèle Sequelize pour Stock
const StockModel = sequelize.define('Stock', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  produit_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  quantite: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  seuil_minimum: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  emplacement: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  derniere_mise_a_jour: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'stocks',
  indexes: [
    {
      unique: true,
      fields: ['produit_id']
    },
    {
      fields: ['quantite']
    },
    {
      fields: ['seuil_minimum']
    }
  ]
});

// Modèle Sequelize pour Mouvement de Stock
const MouvementStockModel = sequelize.define('MouvementStock', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  produit_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type_mouvement: {
    type: DataTypes.ENUM('entree', 'sortie', 'ajustement'),
    allowNull: false
  },
  quantite: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  quantite_avant: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  quantite_après: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  motif: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  reference_externe: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  utilisateur_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'mouvements_stock',
  indexes: [
    {
      fields: ['produit_id']
    },
    {
      fields: ['type_mouvement']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Relations
StockModel.hasMany(MouvementStockModel, {
  foreignKey: 'produit_id',
  sourceKey: 'produit_id',
  as: 'mouvements'
});

MouvementStockModel.belongsTo(StockModel, {
  foreignKey: 'produit_id',
  targetKey: 'produit_id',
  as: 'stock'
});

module.exports = {
  sequelize,
  StockModel,
  MouvementStockModel
};
