-- Script d'initialisation pour l'architecture hybride
-- Base de données partagée entre système de base et microservices

-- =======================================
-- TABLES DU SYSTÈME DE BASE (LEGACY)
-- =======================================

-- Tables pour les magasins (reste dans le système de base)
CREATE TABLE IF NOT EXISTS magasins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    adresse TEXT,
    telephone VARCHAR(50),
    email VARCHAR(255),
    gestionnaire_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tables pour les utilisateurs/employés (reste dans le système de base)
CREATE TABLE IF NOT EXISTS utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'vendeur', 'caissier') DEFAULT 'vendeur',
    magasin_id INT,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (magasin_id) REFERENCES magasins(id)
);

-- Sessions utilisateurs (reste dans le système de base)
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    utilisateur_id INT NOT NULL,
    magasin_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    actif BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
    FOREIGN KEY (magasin_id) REFERENCES magasins(id)
);

-- =======================================
-- TABLES PARTAGÉES (SYSTÈME DE BASE + MICROSERVICES)
-- =======================================

-- Table des ventes (utilisée par système de base ET microservice vente)
CREATE TABLE IF NOT EXISTS ventes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_vente VARCHAR(255) UNIQUE NOT NULL,
    magasin_id INT,
    vendeur_id INT,
    client_nom VARCHAR(255),
    client_email VARCHAR(255),
    total_ht DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_tva DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_ttc DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    statut ENUM('en_cours', 'validee', 'annulee', 'remboursee') DEFAULT 'en_cours',
    date_vente TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_validation TIMESTAMP NULL,
    commentaire TEXT,
    source ENUM('pos', 'web', 'mobile', 'api') DEFAULT 'pos',
    source_service ENUM('legacy', 'microservice') DEFAULT 'legacy',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (magasin_id) REFERENCES magasins(id),
    FOREIGN KEY (vendeur_id) REFERENCES utilisateurs(id)
);

-- Détails des ventes (utilisée par système de base ET microservice vente)
CREATE TABLE IF NOT EXISTS vente_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vente_id INT NOT NULL,
    produit_id INT NOT NULL,
    quantite INT NOT NULL DEFAULT 1,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    remise DECIMAL(5,2) DEFAULT 0.00,
    total_ligne DECIMAL(10,2) NOT NULL,
    source_service ENUM('legacy', 'microservice') DEFAULT 'legacy',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vente_id) REFERENCES ventes(id) ON DELETE CASCADE
);

-- Table des stocks (utilisée par microservice stock principalement)
CREATE TABLE IF NOT EXISTS stocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produit_id INT NOT NULL UNIQUE,
    quantite INT NOT NULL DEFAULT 0,
    seuil_min INT DEFAULT 10,
    seuil_max INT DEFAULT 1000,
    derniere_mise_a_jour TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    source_service ENUM('legacy', 'microservice') DEFAULT 'microservice',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mouvements de stock (audit trail)
CREATE TABLE IF NOT EXISTS mouvements_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produit_id INT NOT NULL,
    type_mouvement ENUM('entree', 'sortie', 'ajustement', 'inventaire') NOT NULL,
    quantite_avant INT NOT NULL,
    quantite_mouvement INT NOT NULL,
    quantite_apres INT NOT NULL,
    motif VARCHAR(255),
    reference_document VARCHAR(255), -- ID vente, ID commande, etc.
    utilisateur_id INT,
    magasin_id INT,
    source_service ENUM('legacy', 'microservice') DEFAULT 'microservice',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
    FOREIGN KEY (magasin_id) REFERENCES magasins(id)
);

-- =======================================
-- TABLES POUR REPORTING (MICROSERVICE)
-- =======================================

-- Cache des rapports générés
CREATE TABLE IF NOT EXISTS rapports_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_rapport VARCHAR(255) NOT NULL,
    parametres JSON,
    donnees JSON,
    date_generation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiration TIMESTAMP,
    magasin_id INT,
    INDEX idx_type_magasin (type_rapport, magasin_id),
    INDEX idx_expiration (expiration),
    FOREIGN KEY (magasin_id) REFERENCES magasins(id)
);

-- Métriques quotidiennes pré-calculées
CREATE TABLE IF NOT EXISTS metriques_quotidiennes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date_metrique DATE NOT NULL,
    magasin_id INT,
    nombre_ventes INT DEFAULT 0,
    chiffre_affaires DECIMAL(12,2) DEFAULT 0.00,
    nombre_articles_vendus INT DEFAULT 0,
    ticket_moyen DECIMAL(10,2) DEFAULT 0.00,
    source_service ENUM('legacy', 'microservice') DEFAULT 'microservice',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_date_magasin (date_metrique, magasin_id),
    FOREIGN KEY (magasin_id) REFERENCES magasins(id)
);

-- =======================================
-- DONNÉES DE TEST
-- =======================================

-- Insertion de magasins de test
INSERT IGNORE INTO magasins (id, nom, adresse, telephone, email) VALUES
(1, 'Magasin Centre-Ville', '123 Rue Principal, Montréal', '+1-514-555-0101', 'centreville@exemple.com'),
(2, 'Magasin Banlieue', '456 Avenue Commerciale, Laval', '+1-450-555-0102', 'banlieue@exemple.com'),
(3, 'Magasin Express', '789 Boulevard Rapide, Longueuil', '+1-450-555-0103', 'express@exemple.com');

-- Insertion d'utilisateurs de test
INSERT IGNORE INTO utilisateurs (id, nom, prenom, email, mot_de_passe, role, magasin_id) VALUES
(1, 'Dubois', 'Marie', 'marie.dubois@exemple.com', '$2b$10$hash', 'admin', 1),
(2, 'Martin', 'Jean', 'jean.martin@exemple.com', '$2b$10$hash', 'manager', 1),
(3, 'Tremblay', 'Sophie', 'sophie.tremblay@exemple.com', '$2b$10$hash', 'vendeur', 1),
(4, 'Gagnon', 'Pierre', 'pierre.gagnon@exemple.com', '$2b$10$hash', 'vendeur', 2),
(5, 'Roy', 'Lucie', 'lucie.roy@exemple.com', '$2b$10$hash', 'caissier', 3);

-- Insertion de stocks de test (pour les microservices)
INSERT IGNORE INTO stocks (produit_id, quantite, seuil_min, seuil_max, source_service) VALUES
(1, 100, 10, 500, 'microservice'),
(2, 50, 5, 200, 'microservice'),
(3, 75, 15, 300, 'microservice'),
(4, 200, 20, 800, 'microservice'),
(5, 30, 10, 150, 'microservice');

-- Insertion de ventes de test
INSERT IGNORE INTO ventes (id, numero_vente, magasin_id, vendeur_id, total_ht, total_tva, total_ttc, statut, source_service) VALUES
(1, 'V-2025-001', 1, 3, 85.00, 12.75, 97.75, 'validee', 'legacy'),
(2, 'V-2025-002', 1, 3, 150.00, 22.50, 172.50, 'validee', 'microservice'),
(3, 'V-2025-003', 2, 4, 75.50, 11.33, 86.83, 'validee', 'legacy'),
(4, 'V-2025-004', 3, 5, 200.00, 30.00, 230.00, 'validee', 'microservice');

-- Insertion de détails de ventes de test
INSERT IGNORE INTO vente_details (vente_id, produit_id, quantite, prix_unitaire, total_ligne, source_service) VALUES
(1, 1, 2, 42.50, 85.00, 'legacy'),
(2, 2, 3, 50.00, 150.00, 'microservice'),
(3, 3, 1, 75.50, 75.50, 'legacy'),
(4, 4, 4, 50.00, 200.00, 'microservice');

-- Insertion de métriques quotidiennes de test
INSERT IGNORE INTO metriques_quotidiennes (date_metrique, magasin_id, nombre_ventes, chiffre_affaires, nombre_articles_vendus, ticket_moyen) VALUES
('2025-01-07', 1, 15, 1250.00, 45, 83.33),
('2025-01-07', 2, 8, 680.00, 22, 85.00),
('2025-01-07', 3, 12, 950.00, 38, 79.17),
('2025-01-08', 1, 18, 1450.00, 52, 80.56),
('2025-01-08', 2, 10, 820.00, 28, 82.00),
('2025-01-08', 3, 14, 1100.00, 42, 78.57);

COMMIT;
