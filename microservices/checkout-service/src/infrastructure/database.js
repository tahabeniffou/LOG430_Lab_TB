/**
 * @fileoverview Configuration base de données Sequelize - Infrastructure Layer (DDD)
 */

const { Sequelize, DataTypes } = require('sequelize');

// Configuration Sequelize
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'checkout_db',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Modèle Sequelize Commande
const CommandeModel = sequelize.define('Commande', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    numeroCommande: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    clientId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    adresseLivraison: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    methodePaiement: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sousTotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    taxes: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    fraisLivraison: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    statut: {
        type: DataTypes.ENUM('EN_ATTENTE', 'VALIDEE', 'PAYEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE', 'ANNULEE'),
        allowNull: false,
        defaultValue: 'EN_ATTENTE'
    },
    dateCreation: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    dateMiseAJour: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'commandes',
    timestamps: true,
    createdAt: 'dateCreation',
    updatedAt: 'dateMiseAJour'
});

// Modèle Sequelize ArticleCommande
const ArticleCommandeModel = sequelize.define('ArticleCommande', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    commandeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: CommandeModel,
            key: 'id'
        }
    },
    produitId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nom: {
        type: DataTypes.STRING,
        allowNull: false
    },
    quantite: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        }
    },
    prix: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    }
}, {
    tableName: 'articles_commande',
    timestamps: false
});

// Relations
CommandeModel.hasMany(ArticleCommandeModel, { 
    foreignKey: 'commandeId', 
    as: 'articles',
    onDelete: 'CASCADE'
});
ArticleCommandeModel.belongsTo(CommandeModel, { 
    foreignKey: 'commandeId',
    as: 'commande'
});

module.exports = {
    sequelize,
    CommandeModel,
    ArticleCommandeModel
};
