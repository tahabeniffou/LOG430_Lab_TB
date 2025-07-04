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
    const venteEntity = new Vente(vente.id, vente.magasinId, vente.utilisateurId, vente.lignes.map(l => ({ produitId: l.produitId, quantite: l.quantite, prix: l.prixTotal })), vente.statut, vente.montantTotal);
    return { ...venteEntity, lignes: vente.lignes.map(l => ({ ...l.toJSON(), produit: l.produit.toJSON() })) };
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
