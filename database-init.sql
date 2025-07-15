-- Base de données SQLite pour le service legacy POS

-- Table Magasins
CREATE TABLE IF NOT EXISTS Magasins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom VARCHAR(100) NOT NULL,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(100),
    manager VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table Employes
CREATE TABLE IF NOT EXISTS Employes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    telephone VARCHAR(20),
    poste VARCHAR(50),
    magasin_id INTEGER,
    salaire DECIMAL(10,2),
    date_embauche DATE,
    actif BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (magasin_id) REFERENCES Magasins(id)
);

-- Table Commandes (historique legacy)
CREATE TABLE IF NOT EXISTS Commandes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_commande VARCHAR(50) UNIQUE NOT NULL,
    magasin_id INTEGER,
    employe_id INTEGER,
    total DECIMAL(10,2),
    statut VARCHAR(20) DEFAULT 'en_cours',
    date_commande DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (magasin_id) REFERENCES Magasins(id),
    FOREIGN KEY (employe_id) REFERENCES Employes(id)
);

-- Table Configuration système
CREATE TABLE IF NOT EXISTS Configuration (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cle VARCHAR(100) UNIQUE NOT NULL,
    valeur TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des données de base
INSERT OR REPLACE INTO Magasins (id, nom, adresse, telephone, email, manager) VALUES 
(1, 'Magasin Principal', '123 Rue Commerce, Montréal', '514-555-0001', 'principal@pos-system.com', 'Jean Dupont'),
(2, 'Succursale Est', '456 Ave Sherbrooke, Montréal', '514-555-0002', 'est@pos-system.com', 'Marie Martin'),
(3, 'Succursale Ouest', '789 Boul St-Laurent, Montréal', '514-555-0003', 'ouest@pos-system.com', 'Pierre Tremblay');

INSERT OR REPLACE INTO Employes (id, nom, prenom, email, telephone, poste, magasin_id, salaire, date_embauche) VALUES 
(1, 'Dupont', 'Jean', 'jean.dupont@pos-system.com', '514-555-1001', 'Gérant', 1, 65000.00, '2023-01-15'),
(2, 'Martin', 'Marie', 'marie.martin@pos-system.com', '514-555-1002', 'Gérant', 2, 62000.00, '2023-02-01'),
(3, 'Tremblay', 'Pierre', 'pierre.tremblay@pos-system.com', '514-555-1003', 'Gérant', 3, 60000.00, '2023-03-01'),
(4, 'Lavoie', 'Sophie', 'sophie.lavoie@pos-system.com', '514-555-1004', 'Caissier', 1, 35000.00, '2023-04-15'),
(5, 'Roy', 'Michel', 'michel.roy@pos-system.com', '514-555-1005', 'Caissier', 2, 35000.00, '2023-05-01');

INSERT OR REPLACE INTO Configuration (cle, valeur, description) VALUES 
('system_version', '1.5', 'Version du système POS'),
('api_gateway_url', 'http://kong:8000', 'URL de l''API Gateway Kong'),
('max_retry_attempts', '3', 'Nombre max de tentatives de reconnexion'),
('session_timeout', '3600', 'Timeout de session en secondes'),
('debug_mode', 'false', 'Mode debug activé/désactivé');

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_employes_magasin ON Employes(magasin_id);
CREATE INDEX IF NOT EXISTS idx_commandes_magasin ON Commandes(magasin_id);
CREATE INDEX IF NOT EXISTS idx_commandes_date ON Commandes(date_commande);
CREATE INDEX IF NOT EXISTS idx_configuration_cle ON Configuration(cle);
