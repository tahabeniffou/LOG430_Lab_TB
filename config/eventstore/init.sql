-- Event Store Database Initialization
-- LAB 7 - Architecture Événementielle

-- Extension UUID pour les identifiants
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table principale des événements (Event Store)
CREATE TABLE IF NOT EXISTS event_store (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_version INTEGER NOT NULL DEFAULT 1,
    event_data JSONB NOT NULL,
    event_metadata JSONB DEFAULT '{}',
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte d'unicité pour éviter les doublons
    UNIQUE(aggregate_id, event_version)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_event_store_aggregate_id ON event_store(aggregate_id);
CREATE INDEX IF NOT EXISTS idx_event_store_aggregate_type ON event_store(aggregate_type);
CREATE INDEX IF NOT EXISTS idx_event_store_event_type ON event_store(event_type);
CREATE INDEX IF NOT EXISTS idx_event_store_occurred_at ON event_store(occurred_at);
CREATE INDEX IF NOT EXISTS idx_event_store_composite ON event_store(aggregate_id, event_version);

-- Table des snapshots pour optimiser la reconstruction
CREATE TABLE IF NOT EXISTS event_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_id UUID NOT NULL UNIQUE,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_version INTEGER NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_aggregate_id ON event_snapshots(aggregate_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_aggregate_type ON event_snapshots(aggregate_type);

-- Table pour traquer les projections (CQRS Read Models)
CREATE TABLE IF NOT EXISTS projection_offsets (
    projection_name VARCHAR(100) PRIMARY KEY,
    last_processed_event_id UUID,
    last_processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des événements publiés (pour garantir la livraison)
CREATE TABLE IF NOT EXISTS published_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_store_id UUID NOT NULL REFERENCES event_store(id),
    exchange_name VARCHAR(100) NOT NULL,
    routing_key VARCHAR(200) NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(event_store_id, exchange_name)
);

-- Index pour les événements publiés
CREATE INDEX IF NOT EXISTS idx_published_events_store_id ON published_events(event_store_id);
CREATE INDEX IF NOT EXISTS idx_published_events_published_at ON published_events(published_at);

-- Fonctions utilitaires

-- Fonction pour récupérer les événements d'un agrégat
CREATE OR REPLACE FUNCTION get_aggregate_events(
    p_aggregate_id UUID,
    p_from_version INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    event_type VARCHAR,
    event_version INTEGER,
    event_data JSONB,
    event_metadata JSONB,
    occurred_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        e.id,
        e.event_type,
        e.event_version,
        e.event_data,
        e.event_metadata,
        e.occurred_at
    FROM event_store e
    WHERE e.aggregate_id = p_aggregate_id
      AND e.event_version > p_from_version
    ORDER BY e.event_version ASC;
$$;

-- Fonction pour obtenir la dernière version d'un agrégat
CREATE OR REPLACE FUNCTION get_aggregate_version(p_aggregate_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
    SELECT COALESCE(MAX(event_version), 0)
    FROM event_store
    WHERE aggregate_id = p_aggregate_id;
$$;

-- Trigger pour mettre à jour updated_at dans projection_offsets
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_projection_offsets_updated_at
    BEFORE UPDATE ON projection_offsets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Vues utiles pour les requêtes

-- Vue des événements récents
CREATE OR REPLACE VIEW recent_events AS
SELECT 
    e.id,
    e.aggregate_id,
    e.aggregate_type,
    e.event_type,
    e.event_data,
    e.occurred_at
FROM event_store e
ORDER BY e.occurred_at DESC
LIMIT 100;

-- Vue des statistiques par type d'événement
CREATE OR REPLACE VIEW event_statistics AS
SELECT 
    aggregate_type,
    event_type,
    COUNT(*) as event_count,
    MIN(occurred_at) as first_event,
    MAX(occurred_at) as last_event
FROM event_store
GROUP BY aggregate_type, event_type
ORDER BY event_count DESC;

-- Permissions pour l'utilisateur de l'application
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO eventstore_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO eventstore_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO eventstore_user;

-- Données de test initiales (optionnel)
INSERT INTO projection_offsets (projection_name, last_processed_event_id)
VALUES 
    ('reclamation_summary', NULL),
    ('agent_performance', NULL),
    ('client_satisfaction', NULL)
ON CONFLICT (projection_name) DO NOTHING;

COMMIT;
