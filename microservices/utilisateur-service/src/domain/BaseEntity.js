// Classe de base pour toutes les entités du microservice utilisateur
class BaseEntity {
  constructor(id) {
    this.id = id;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.dateCreation = new Date();
    this.dateModification = new Date();
  }

  updateTimestamp() {
    this.updatedAt = new Date();
    this.dateModification = new Date();
  }
}

module.exports = BaseEntity;
