/**
 * @fileoverview Configuration base de données Sequelize - Infrastructure Layer (DDD)
 */

const { Sequelize, DataTypes } = require('sequelize');

// Configuration Sequelize
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'compte_db',
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

// Modèle Sequelize Compte
const CompteModel = sequelize.define('Compte', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    motDePasse: {
        type: DataTypes.STRING,
        allowNull: false
    },
    nom: {
        type: DataTypes.STRING,
        allowNull: false
    },
    prenom: {
        type: DataTypes.STRING,
        allowNull: false
    },
    telephone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    adresse: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    dateCreation: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    statut: {
        type: DataTypes.ENUM('ACTIF', 'INACTIF', 'SUSPENDU'),
        allowNull: false,
        defaultValue: 'ACTIF'
    },
    typeCompte: {
        type: DataTypes.ENUM('CLIENT', 'ADMIN'),
        allowNull: false,
        defaultValue: 'CLIENT'
    }
}, {
    tableName: 'comptes',
    timestamps: true,
    createdAt: 'dateCreation',
    updatedAt: 'dateMiseAJour'
});

module.exports = {
    sequelize,
    CompteModel
};
