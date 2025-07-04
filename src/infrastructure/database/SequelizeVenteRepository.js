// Implémentation Sequelize du repository Vente
const VenteRepository = require('../../domain/vente/VenteRepository');
const Vente = require('../../domain/vente/Vente');
const LigneVente = require('../../domain/vente/LigneVente');

class SequelizeVenteRepository extends VenteRepository {
  constructor(db) {
    super();
    this.Vente = db.Vente;
    this.LigneVente = db.LigneVente;
    this.sequelize = db.sequelize;
  }

  mapToEntity(vente) {
    if (!vente) return null;
    const lignes = (vente.lignesDeVente || []).map(l => ({
      produitId: l.produitId,
      quantite: l.quantite,
      prixUnitaire: l.prixUnitaire, // Assurez-vous que ce champ existe sur le modèle LigneVente
      prixTotal: l.prixTotal
    }));

    const montantRecalcule = lignes.reduce((sum, ligne) => sum + (ligne.prixTotal || 0), 0);

    const venteEntity = new Vente(vente.id, vente.magasinId, vente.utilisateurId, lignes, vente.statut, montantRecalcule);
    
    // Retourne un Plain Old Javascript Object (POJO) pour éviter les soucis de sérialisation
    return JSON.parse(JSON.stringify(venteEntity));
  }

  async sauvegarder(vente) {
    const transaction = await this.sequelize.transaction();
    try {
      const nouvelleVente = await this.Vente.create({ ...vente, montantTotal: vente.montantTotal }, { transaction });

      const lignesDeVente = vente.lignes.map(ligne => ({
        ...ligne,
        venteId: nouvelleVente.id,
        prixTotal: ligne.prixUnitaire * ligne.quantite
      }));

      await this.LigneVente.bulkCreate(lignesDeVente, { transaction });

      await transaction.commit();

      return new Vente(nouvelleVente.id, nouvelleVente.magasinId, nouvelleVente.utilisateurId, lignesDeVente, nouvelleVente.statut, nouvelleVente.montantTotal);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async trouverParId(id) {
    const venteModel = await this.Vente.findByPk(id, { include: 'lignesDeVente' });
    return venteModel ? this.mapToEntity(venteModel) : null;
  }

  async listerParMagasin(magasinId) {
    const ventesModel = await this.Vente.findAll({ 
      where: { magasinId },
      include: 'lignesDeVente' 
    });
    return ventesModel.map(v => this.mapToEntity(v));
  }

  async listerToutes() {
    const ventesModel = await this.Vente.findAll({ 
      include: 'lignesDeVente' 
    });
    return ventesModel.map(v => this.mapToEntity(v));
  }
}

module.exports = SequelizeVenteRepository;
