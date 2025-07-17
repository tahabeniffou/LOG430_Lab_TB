const { Sequelize, DataTypes } = require('sequelize');

// Configuration de la base de données spécifique au microservice reporting
const sequelize = new Sequelize(
  process.env.DB_NAME || 'reporting_db',
  process.env.DB_USER || 'reporting_user',
  process.env.DB_PASSWORD || 'reporting_password',
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

// Modèle Sequelize pour Rapport
const RapportModel = sequelize.define('Rapport', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type_rapport: {
    type: DataTypes.ENUM('ventes', 'stock', 'performance', 'financier'),
    allowNull: false
  },
  periode_debut: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  periode_fin: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  donnees: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  parametres: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  statut: {
    type: DataTypes.ENUM('en_cours', 'termine', 'erreur'),
    allowNull: false,
    defaultValue: 'en_cours'
  },
  utilisateur_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  taille_donnees: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  temps_generation: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Temps de génération en millisecondes'
  }
}, {
  tableName: 'rapports',
  indexes: [
    {
      fields: ['type_rapport']
    },
    {
      fields: ['periode_debut', 'periode_fin']
    },
    {
      fields: ['statut']
    },
    {
      fields: ['utilisateur_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Modèle pour les métadonnées de rapport
const MetadonneesRapportModel = sequelize.define('MetadonneesRapport', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  rapport_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: RapportModel,
      key: 'id'
    }
  },
  nom_metrique: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  valeur_metrique: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  unite: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'metadonnees_rapport',
  indexes: [
    {
      fields: ['rapport_id']
    },
    {
      fields: ['nom_metrique']
    }
  ]
});

// Relations
RapportModel.hasMany(MetadonneesRapportModel, {
  foreignKey: 'rapport_id',
  as: 'metadonnees'
});

MetadonneesRapportModel.belongsTo(RapportModel, {
  foreignKey: 'rapport_id',
  as: 'rapport'
});

module.exports = {
  sequelize,
  RapportModel,
  MetadonneesRapportModel
};
