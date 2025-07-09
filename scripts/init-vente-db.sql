-- Initialisation base Vente Service (MySQL)

CREATE TABLE IF NOT EXISTS ventes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    magasin_id INT NOT NULL,
    utilisateur_id INT NOT NULL,
    numero_transaction VARCHAR(50) UNIQUE,
    statut ENUM('en_cours', 'terminee', 'annulee') DEFAULT 'en_cours',
    montant_total DECIMAL(10,2) DEFAULT 0.00,
    montant_tva DECIMAL(10,2) DEFAULT 0.00,
    mode_paiement VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_magasin (magasin_id),
    INDEX idx_utilisateur (utilisateur_id),
    INDEX idx_statut (statut),
    INDEX idx_numero (numero_transaction),
    INDEX idx_date (created_at)
);

CREATE TABLE IF NOT EXISTS lignes_vente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vente_id INT NOT NULL,
    produit_id INT NOT NULL,
    nom_produit VARCHAR(255) NOT NULL, -- Denormalization pour performance
    quantite INT NOT NULL,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    prix_total DECIMAL(10,2) NOT NULL,
    taux_tva DECIMAL(5,2) DEFAULT 20.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vente_id) REFERENCES ventes(id) ON DELETE CASCADE,
    INDEX idx_vente (vente_id),
    INDEX idx_produit (produit_id),
    INDEX idx_date (created_at)
);

-- Données de test
INSERT INTO ventes (magasin_id, utilisateur_id, numero_transaction, statut, montant_total) VALUES
(1, 1, 'TX2025010001', 'terminee', 129.99),
(1, 2, 'TX2025010002', 'terminee', 89.50),
(2, 3, 'TX2025010003', 'en_cours', 45.00);

INSERT INTO lignes_vente (vente_id, produit_id, nom_produit, quantite, prix_unitaire, prix_total) VALUES
(1, 1, 'Laptop Dell XPS', 1, 129.99, 129.99),
(2, 2, 'Souris Logitech', 2, 44.75, 89.50),
(3, 3, 'Clavier mécanique', 1, 45.00, 45.00);
