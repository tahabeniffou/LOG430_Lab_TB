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
      prixUnitaire: l.prixUnitaire,
      sousTotal: l.sousTotal,
      prixTotal: l.sousTotal // pour compatibilité avec l'entité de domaine
    }));

    // Utiliser sousTotal pour le montant total
    const montantRecalcule = lignes.reduce((sum, ligne) => sum + (ligne.sousTotal || 0), 0);
    // Prendre montantTotal du modèle si présent, sinon recalculé
    const montantTotal = vente.montantTotal != null ? vente.montantTotal : montantRecalcule;

    const venteEntity = new Vente(vente.id, vente.magasinId, vente.utilisateurId, lignes, vente.statut, montantTotal);
    
    // Retourne un Plain Old Javascript Object (POJO) pour éviter les soucis de sérialisation
    return JSON.parse(JSON.stringify(venteEntity));
  }

  async sauvegarder(vente) {
    const transaction = await this.sequelize.transaction();
    try {
      const nouvelleVente = await this.Vente.create({ ...vente, montantTotal: vente.montantTotal }, { transaction });

      const lignesDeVente = vente.lignes.map(ligne => ({
        quantite: ligne.quantite,
        prixUnitaire: ligne.prixUnitaire,
        sousTotal: ligne.prixUnitaire * ligne.quantite,
        venteId: nouvelleVente.id,
        produitId: ligne.produitId,
        magasinId: nouvelleVente.magasinId
      }));

      await this.LigneVente.bulkCreate(lignesDeVente, { transaction });

      // Relire la vente et ses lignes pour calcul correct du montantTotal
      const venteAvecLignes = await this.Vente.findByPk(nouvelleVente.id, {
        include: [{ model: this.LigneVente, as: 'lignesDeVente' }],
        transaction
      });
      // Calculer le montant total à partir des sousTotal
      const montantTotal = venteAvecLignes.lignesDeVente.reduce((sum, l) => sum + (l.sousTotal || 0), 0);
      venteAvecLignes.montantTotal = montantTotal;
      await venteAvecLignes.save({ transaction });

      // Relire la vente pour garantir que montantTotal est bien à jour
      const venteFinale = await this.Vente.findByPk(nouvelleVente.id, {
        include: [{ model: this.LigneVente, as: 'lignesDeVente' }],
        transaction
      });

      await transaction.commit();

      // Retourner l'entité de domaine correctement mappée
      return this.mapToEntity(venteFinale);
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
