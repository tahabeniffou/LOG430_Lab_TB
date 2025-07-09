-- Script d'initialisation pour la base de données Legacy System
-- Base de données séparée conforme aux standards microservices

USE legacy_system_db;

-- Table pour la gestion des magasins
CREATE TABLE IF NOT EXISTS magasins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    adresse TEXT,
    ville VARCHAR(100),
    code_postal VARCHAR(20),
    telephone VARCHAR(20),
    email VARCHAR(255),
    gestionnaire VARCHAR(255),
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_modification DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    statut ENUM('actif', 'inactif', 'maintenance') DEFAULT 'actif',
    INDEX idx_ville (ville),
    INDEX idx_statut (statut)
);

-- Table pour les utilisateurs du système legacy
CREATE TABLE IF NOT EXISTS utilisateurs_legacy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    role ENUM('admin', 'gestionnaire', 'employe') DEFAULT 'employe',
    magasin_id INT,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_modification DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    statut ENUM('actif', 'inactif', 'suspendu') DEFAULT 'actif',
    FOREIGN KEY (magasin_id) REFERENCES magasins(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_statut (statut)
);

-- Table pour la configuration du système
CREATE TABLE IF NOT EXISTS configuration_systeme (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cle_config VARCHAR(255) UNIQUE NOT NULL,
    valeur TEXT,
    description TEXT,
    type_valeur ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_modification DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cle_config (cle_config)
);

-- Table pour le Point de Vente (POS)
CREATE TABLE IF NOT EXISTS pos_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    magasin_id INT NOT NULL,
    utilisateur_id INT NOT NULL,
    caisse_numero INT,
    date_ouverture DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_fermeture DATETIME NULL,
    montant_ouverture DECIMAL(10,2) DEFAULT 0.00,
    montant_fermeture DECIMAL(10,2) DEFAULT 0.00,
    statut ENUM('ouverte', 'fermee', 'suspendue') DEFAULT 'ouverte',
    FOREIGN KEY (magasin_id) REFERENCES magasins(id) ON DELETE CASCADE,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs_legacy(id) ON DELETE CASCADE,
    INDEX idx_magasin_id (magasin_id),
    INDEX idx_utilisateur_id (utilisateur_id),
    INDEX idx_statut (statut)
);

-- Table pour les logs d'audit du système legacy
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT,
    action VARCHAR(255) NOT NULL,
    table_affectee VARCHAR(255),
    enregistrement_id INT,
    donnees_avant JSON,
    donnees_apres JSON,
    adresse_ip VARCHAR(45),
    user_agent TEXT,
    date_action DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs_legacy(id) ON DELETE SET NULL,
    INDEX idx_utilisateur_id (utilisateur_id),
    INDEX idx_action (action),
    INDEX idx_date_action (date_action)
);

-- Insertion de données de base
INSERT INTO magasins (nom, adresse, ville, code_postal, telephone, email, gestionnaire) VALUES
('Magasin Central', '123 Rue Principale', 'Montréal', 'H1A 1A1', '514-555-0001', 'central@entreprise.com', 'Jean Dupont'),
('Magasin Nord', '456 Boulevard Nord', 'Laval', 'H7A 2B2', '450-555-0002', 'nord@entreprise.com', 'Marie Tremblay'),
('Magasin Sud', '789 Avenue Sud', 'Longueuil', 'J4A 3C3', '450-555-0003', 'sud@entreprise.com', 'Pierre Gagnon');

INSERT INTO utilisateurs_legacy (nom, prenom, email, mot_de_passe, role, magasin_id) VALUES
('Admin', 'Système', 'admin@entreprise.com', '$2b$10$encrypted_password', 'admin', NULL),
('Dupont', 'Jean', 'jean.dupont@entreprise.com', '$2b$10$encrypted_password', 'gestionnaire', 1),
('Tremblay', 'Marie', 'marie.tremblay@entreprise.com', '$2b$10$encrypted_password', 'gestionnaire', 2),
('Gagnon', 'Pierre', 'pierre.gagnon@entreprise.com', '$2b$10$encrypted_password', 'gestionnaire', 3);

INSERT INTO configuration_systeme (cle_config, valeur, description, type_valeur) VALUES
('timezone', 'America/Montreal', 'Fuseau horaire du système', 'string'),
('currency', 'CAD', 'Devise utilisée', 'string'),
('tax_rate', '14.975', 'Taux de taxe par défaut (QC)', 'number'),
('backup_enabled', 'true', 'Sauvegarde automatique activée', 'boolean'),
('max_sessions', '10', 'Nombre maximum de sessions POS simultanées', 'number');

-- Permissions et index finaux
GRANT ALL PRIVILEGES ON legacy_system_db.* TO 'legacy_user'@'%';
FLUSH PRIVILEGES;
