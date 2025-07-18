-- Base de données PostgreSQL pour le service legacy POS

-- Table Magasins
CREATE TABLE IF NOT EXISTS Magasins (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(100),
    manager VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Employes
CREATE TABLE IF NOT EXISTS Employes (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    telephone VARCHAR(20),
    poste VARCHAR(50),
    magasin_id INTEGER,
    salaire DECIMAL(10,2),
    date_embauche DATE,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (magasin_id) REFERENCES Magasins(id)
);

-- Table Commandes (historique legacy)
CREATE TABLE IF NOT EXISTS Commandes (
    id SERIAL PRIMARY KEY,
    numero_commande VARCHAR(50) UNIQUE NOT NULL,
    magasin_id INTEGER,
    employe_id INTEGER,
    total DECIMAL(10,2),
    statut VARCHAR(20) DEFAULT 'en_cours',
    date_commande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (magasin_id) REFERENCES Magasins(id),
    FOREIGN KEY (employe_id) REFERENCES Employes(id)
);

-- Table Configuration système
CREATE TABLE IF NOT EXISTS Configuration (
    id SERIAL PRIMARY KEY,
    cle VARCHAR(100) UNIQUE NOT NULL,
    valeur TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_employes_magasin ON Employes(magasin_id);
CREATE INDEX IF NOT EXISTS idx_commandes_magasin ON Commandes(magasin_id);
CREATE INDEX IF NOT EXISTS idx_commandes_employe ON Commandes(employe_id);
CREATE INDEX IF NOT EXISTS idx_commandes_date ON Commandes(date_commande);

-- Données de test
INSERT INTO Magasins (nom, adresse, telephone, email, manager) VALUES 
('Magasin Centre-ville', '123 Rue Principale', '514-555-0001', 'centre@pos.com', 'Jean Dupont'),
('Magasin Banlieue', '456 Av. Commerciale', '514-555-0002', 'banlieue@pos.com', 'Marie Martin'),
('Magasin Mall', '789 Blvd. Shopping', '514-555-0003', 'mall@pos.com', 'Pierre Tremblay')
ON CONFLICT DO NOTHING;

INSERT INTO Employes (nom, prenom, email, telephone, poste, magasin_id, salaire, date_embauche) VALUES 
('Dupont', 'Jean', 'jean.dupont@pos.com', '514-555-0101', 'Gérant', 1, 55000.00, '2023-01-15'),
('Martin', 'Marie', 'marie.martin@pos.com', '514-555-0102', 'Gérant', 2, 55000.00, '2023-02-01'),
('Tremblay', 'Pierre', 'pierre.tremblay@pos.com', '514-555-0103', 'Gérant', 3, 55000.00, '2023-03-01'),
('Lavoie', 'Sophie', 'sophie.lavoie@pos.com', '514-555-0104', 'Caissier', 1, 35000.00, '2023-04-01'),
('Gagnon', 'Michel', 'michel.gagnon@pos.com', '514-555-0105', 'Caissier', 2, 35000.00, '2023-05-01')
ON CONFLICT DO NOTHING;

INSERT INTO Configuration (cle, valeur, description) VALUES 
('version_pos', '1.0.0', 'Version du système POS'),
('timezone', 'America/Montreal', 'Fuseau horaire par défaut'),
('currency', 'CAD', 'Devise par défaut'),
('tax_rate', '0.15', 'Taux de taxe par défaut'),
('receipt_footer', 'Merci de votre visite!', 'Message de pied de page des reçus')
ON CONFLICT DO NOTHING;
