/**
 * @fileoverview Configuration base de données Sequelize - Infrastructure Layer (DDD)
 */

const { Sequelize, DataTypes } = require('sequelize');

// Configuration Sequelize
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'panier_db',
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

// Modèle Sequelize Panier
const PanierModel = sequelize.define('Panier', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    clientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true  // Un panier par client
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
    },
    statut: {
        type: DataTypes.ENUM('ACTIF', 'COMMANDE', 'ABANDONNE'),
        allowNull: false,
        defaultValue: 'ACTIF'
    }
}, {
    tableName: 'paniers',
    timestamps: true,
    createdAt: 'dateCreation',
    updatedAt: 'dateMiseAJour'
});

// Modèle Sequelize ArticlePanier
const ArticlePanierModel = sequelize.define('ArticlePanier', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    panierId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: PanierModel,
            key: 'id'
        }
    },
    produitId: {
        type: DataTypes.INTEGER,
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
    },
    nom: {
        type: DataTypes.STRING,
        allowNull: true  // Peut être enrichi plus tard
    }
}, {
    tableName: 'articles_panier',
    timestamps: false
});

// Relations
PanierModel.hasMany(ArticlePanierModel, { 
    foreignKey: 'panierId', 
    as: 'articles',
    onDelete: 'CASCADE'
});
ArticlePanierModel.belongsTo(PanierModel, { 
    foreignKey: 'panierId',
    as: 'panier'
});

module.exports = {
    sequelize,
    PanierModel,
    ArticlePanierModel
};
