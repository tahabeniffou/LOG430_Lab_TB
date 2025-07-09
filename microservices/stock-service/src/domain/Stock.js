const BaseEntity = require('./BaseEntity');

// Entité Stock - Domaine métier du microservice stock UNIQUEMENT
class Stock extends BaseEntity {
  constructor(id, produitId, quantiteDisponible, quantiteReservee, seuilMinimum = 5, seuilMaximum = 100, emplacement = '', createdAt, updatedAt) {
    super(id);
    this.produitId = produitId;
    this.quantiteDisponible = quantiteDisponible || 0;
    this.quantiteReservee = quantiteReservee || 0;
    this.seuilMinimum = seuilMinimum;
    this.seuilMaximum = seuilMaximum;
    this.emplacement = emplacement;
    if (createdAt) this.createdAt = createdAt;
    if (updatedAt) this.updatedAt = updatedAt;
  }

  // ✅ RESPONSABILITÉ STOCK SERVICE UNIQUEMENT
  peutVendre(quantite) {
    return this.quantiteDisponible >= quantite;
  }

  decrementerStock(quantite) {
    if (!this.peutVendre(quantite)) {
      throw new Error(`Stock insuffisant. Disponible: ${this.quantiteDisponible}, Demandé: ${quantite}`);
    }
    this.quantiteDisponible -= quantite;
    this.updateTimestamp();
  }

  incrementerStock(quantite) {
    if (quantite <= 0) {
      throw new Error('La quantité doit être positive');
    }
    this.quantiteDisponible += quantite;
    this.updateTimestamp();
  }

  reserverStock(quantite) {
    if (!this.peutVendre(quantite)) {
      throw new Error(`Stock insuffisant pour réservation. Disponible: ${this.quantiteDisponible}, Demandé: ${quantite}`);
    }
    this.quantiteDisponible -= quantite;
    this.quantiteReservee += quantite;
    this.updateTimestamp();
  }

  libererReservation(quantite) {
    if (this.quantiteReservee < quantite) {
      throw new Error(`Réservation insuffisante. Réservé: ${this.quantiteReservee}, Demandé: ${quantite}`);
    }
    this.quantiteReservee -= quantite;
    this.quantiteDisponible += quantite;
    this.updateTimestamp();
  }

  confirmerVente(quantite) {
    if (this.quantiteReservee < quantite) {
      throw new Error(`Réservation insuffisante pour confirmation. Réservé: ${this.quantiteReservee}, Demandé: ${quantite}`);
    }
    this.quantiteReservee -= quantite;
    // Ne remet pas en stock disponible car vendu
    this.updateTimestamp();
  }

  estEnRupture() {
    return this.quantiteDisponible <= 0;
  }

  estSousSeuilMinimum() {
    return this.quantiteDisponible <= this.seuilMinimum;
  }

  estEnSurstock() {
    return this.quantiteDisponible > this.seuilMaximum;
  }

  getQuantiteTotale() {
    return this.quantiteDisponible + this.quantiteReservee;
  }

  valider() {
    if (!this.produitId) {
      throw new Error('L\'ID du produit est requis');
    }
    if (this.quantiteDisponible < 0) {
      throw new Error('La quantité disponible ne peut pas être négative');
    }
    if (this.quantiteReservee < 0) {
      throw new Error('La quantité réservée ne peut pas être négative');
    }
    if (this.seuilMinimum < 0) {
      throw new Error('Le seuil minimum ne peut pas être négatif');
    }
    if (this.seuilMaximum <= this.seuilMinimum) {
      throw new Error('Le seuil maximum doit être supérieur au seuil minimum');
    }
    return true;
  }

  formaterPourAffichage() {
    return {
      id: this.id,
      produitId: this.produitId,
      quantiteDisponible: this.quantiteDisponible,
      quantiteReservee: this.quantiteReservee,
      quantiteTotale: this.getQuantiteTotale(),
      seuilMinimum: this.seuilMinimum,
      seuilMaximum: this.seuilMaximum,
      emplacement: this.emplacement,
      statut: this.estEnRupture() ? 'rupture' : 
              this.estSousSeuilMinimum() ? 'faible' :
              this.estEnSurstock() ? 'surstock' : 'normal'
    };
  }
}

module.exports = Stock;
