const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class Utilisateur extends Model {
    static associate(models) {
      Utilisateur.belongsTo(models.Magasin, { foreignKey: 'magasinId', as: 'magasin' });
      Utilisateur.hasMany(models.Vente, { foreignKey: 'utilisateurId', as: 'ventes' });
    }

    async validerMotDePasse(motDePasse) {
      return bcrypt.compare(motDePasse, this.motDePasse);
    }
  }

  Utilisateur.init({
    nom: {
      type: DataTypes.STRING,
      allowNull: false
    },
    prenom: {
      type: DataTypes.STRING,
      allowNull: false
    },
    courriel: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false
    }, // ex: 'vendeur', 'admin'
    nomUtilisateur: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    motDePasse: {
      type: DataTypes.STRING,
      allowNull: false
    },
    magasinId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Utilisateur',
    hooks: {
      beforeCreate: async (utilisateur) => {
        if (utilisateur.motDePasse) {
          const salt = await bcrypt.genSalt(10);
          utilisateur.motDePasse = await bcrypt.hash(utilisateur.motDePasse, salt);
        }
      }
    }
  });

  return Utilisateur;
};