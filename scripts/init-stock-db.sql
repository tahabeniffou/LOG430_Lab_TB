-- Initialisation base Stock Service (PostgreSQL)

CREATE TABLE IF NOT EXISTS stock_items (
    id SERIAL PRIMARY KEY,
    produit_id INTEGER NOT NULL UNIQUE,
    quantite_disponible INTEGER NOT NULL DEFAULT 0,
    quantite_reservee INTEGER NOT NULL DEFAULT 0,
    seuil_minimum INTEGER NOT NULL DEFAULT 5,
    seuil_maximum INTEGER NOT NULL DEFAULT 100,
    emplacement VARCHAR(50),
    derniere_mise_a_jour TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_mouvements (
    id SERIAL PRIMARY KEY,
    produit_id INTEGER NOT NULL,
    type_mouvement VARCHAR(20) NOT NULL, -- 'entree', 'sortie', 'reservation', 'annulation'
    quantite INTEGER NOT NULL,
    reference_externe VARCHAR(100), -- vente_id, commande_id, etc.
    motif TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

-- Index pour performance
CREATE INDEX idx_stock_produit ON stock_items(produit_id);
CREATE INDEX idx_mouvements_produit ON stock_mouvements(produit_id);
CREATE INDEX idx_mouvements_type ON stock_mouvements(type_mouvement);
CREATE INDEX idx_mouvements_date ON stock_mouvements(created_at);

-- Données de test
INSERT INTO stock_items (produit_id, quantite_disponible, seuil_minimum, seuil_maximum) VALUES
(1, 50, 5, 100),
(2, 30, 3, 50),
(3, 75, 10, 150),
(4, 20, 2, 40),
(5, 100, 15, 200);
