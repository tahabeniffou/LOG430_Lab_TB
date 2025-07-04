// Classe de base pour toutes les entités
class BaseEntity {
  constructor(id) {
    this.id = id;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  updateTimestamp() {
    this.updatedAt = new Date();
  }
}

module.exports = BaseEntity;
