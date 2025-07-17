/**
 * Configuration des règles de cache pour les différents endpoints
 */

const cacheConfig = {
  // Cache pour les produits
  produits: {
    list: {
      keyPrefix: 'produits',
      ttl: 300, // 5 minutes
      keyGenerator: (req) => {
        const { magasinId, nom } = req.query;
        return `produits:list:magasin:${magasinId}${nom ? `:nom:${nom}` : ''}`;
      },
      condition: (req) => req.method === 'GET' && req.query.magasinId
    },
    stock: {
      keyPrefix: 'produits',
      ttl: 180, // 3 minutes (plus court car données critiques)
      keyGenerator: (req) => {
        const { magasinId } = req.query;
        return `produits:stock:magasin:${magasinId}`;
      },
      condition: (req) => req.method === 'GET' && req.query.magasinId
    },
    detail: {
      keyPrefix: 'produits',
      ttl: 600, // 10 minutes (détails changent moins souvent)
      keyGenerator: (req) => `produits:detail:${req.params.id}`,
      condition: (req) => req.method === 'GET' && req.params.id
    }
  },

  // Cache pour les rapports
  rapports: {
    sales: {
      keyPrefix: 'rapports',
      ttl: 900, // 15 minutes (rapports coûteux à générer)
      keyGenerator: (req) => {
        const { type, start, end } = req.query;
        return `rapports:${type || 'default'}:${start || 'no-start'}:${end || 'no-end'}`;
      },
      condition: (req) => req.method === 'GET'
    },
    detail: {
      keyPrefix: 'rapports',
      ttl: 1800, // 30 minutes
      keyGenerator: (req) => `rapports:detail:${req.params.id}`,
      condition: (req) => req.method === 'GET' && req.params.id
    }
  },

  // Cache pour les magasins
  magasins: {
    list: {
      keyPrefix: 'magasins',
      ttl: 3600, // 1 heure (changent rarement)
      keyGenerator: () => 'magasins:list',
      condition: (req) => req.method === 'GET'
    },
    utilisateurs: {
      keyPrefix: 'magasins',
      ttl: 600, // 10 minutes
      keyGenerator: (req) => `magasins:${req.params.id}:utilisateurs`,
      condition: (req) => req.method === 'GET' && req.params.id
    }
  }
};

/**
 * Patterns d'invalidation de cache
 */
const invalidationPatterns = {
  // Invalider le cache des produits
  produits: {
    create: (req) => [`produits:list:magasin:${req.body.magasinId}*`, `produits:stock:magasin:${req.body.magasinId}`],
    update: (req) => [
      `produits:detail:${req.params.id}`,
      `produits:list:magasin:*`,
      `produits:stock:magasin:*`
    ],
    delete: (req) => [
      `produits:detail:${req.params.id}`,
      `produits:list:magasin:*`,
      `produits:stock:magasin:*`
    ]
  },

  // Invalider le cache des rapports
  rapports: {
    // Les rapports sont générés, donc on invalide après création de ventes
    onVenteCreated: () => ['rapports:*']
  },

  // Invalider le cache des magasins
  magasins: {
    create: () => ['magasins:list'],
    update: (req) => [`magasins:list`, `magasins:${req.params.id}:*`],
    delete: (req) => [`magasins:list`, `magasins:${req.params.id}:*`]
  },

  // Invalider le cache des utilisateurs
  utilisateurs: {
    create: (req) => [`magasins:${req.body.magasinId}:utilisateurs`],
    update: (req) => ['magasins:*:utilisateurs'],
    delete: (req) => ['magasins:*:utilisateurs']
  }
};

module.exports = {
  cacheConfig,
  invalidationPatterns
};
