// Implémentation Sequelize du repository Vente
const VenteRepository = require('../../domain/vente/VenteRepository');
const Vente = require('../../domain/vente/Vente');
const VenteModel = require('../../models/Vente');
const LigneVenteModel = require('../../models/LigneVente');

class SequelizeVenteRepository extends VenteRepository {
  async sauvegarder(vente) {
    const venteData = {
      magasinId: vente.magasinId,
      utilisateurId: vente.utilisateurId,
      total: vente.total,
      date: vente.date,
      statut: vente.statut
    };

    let venteModel;
    if (vente.id) {
      // Mise à jour
      await VenteModel.update(venteData, { where: { id: vente.id } });
      venteModel = await VenteModel.findByPk(vente.id);
    } else {
      // Création
      venteModel = await VenteModel.create(venteData);
      
      // Créer les lignes de vente
      for (const ligne of vente.lignes) {
        await LigneVenteModel.create({
          venteId: venteModel.id,
          produitId: ligne.produitId,
          quantite: ligne.quantite,
          sousTotal: ligne.sousTotal,
          magasinId: vente.magasinId
        });
      }
    }

    return this.mapToEntity(venteModel);
  }

  async trouverParId(id) {
    const venteModel = await VenteModel.findByPk(id, {
      include: [LigneVenteModel]
    });
    
    return venteModel ? this.mapToEntity(venteModel) : null;
  }

  async listerParMagasin(magasinId) {
    const ventesModel = await VenteModel.findAll({
      where: { magasinId },
      include: [LigneVenteModel]
    });
    
    return ventesModel.map(v => this.mapToEntity(v));
  }

  async listerToutes() {
    const ventesModel = await VenteModel.findAll({
      include: [LigneVenteModel]
    });
    
    return ventesModel.map(v => this.mapToEntity(v));
  }

  async supprimer(id) {
    await VenteModel.destroy({ where: { id } });
  }

  mapToEntity(venteModel) {
    const vente = new Vente(
      venteModel.id,
      venteModel.magasinId,
      venteModel.utilisateurId,
      venteModel.total,
      venteModel.date
    );
    
    vente.statut = venteModel.statut;
    
    if (venteModel.LigneVentes) {
      vente.lignes = venteModel.LigneVentes.map(ligne => ({
        produitId: ligne.produitId,
        quantite: ligne.quantite,
        prix: ligne.sousTotal / ligne.quantite,
        sousTotal: ligne.sousTotal
      }));
    }
    
    return vente;
  }
}

module.exports = SequelizeVenteRepository;
