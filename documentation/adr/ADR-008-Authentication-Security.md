# ADR-008: Authentification et Sécurité

## Statut
Accepté - 2024-12-15

## Contexte
Système POS multi-tenant nécessite :
- Authentification utilisateurs sécurisée
- Autorisation fine par rôle
- Sécurité communication inter-services
- Protection contre attaques communes

## Décision
**JWT Bearer tokens** avec **RBAC** et **mTLS** inter-services.

## Options considérées

### Authentification

#### JSON Web Tokens (JWT)
- **Avantages** : Stateless, décodable, standard industrie
- **Inconvénients** : Révocation complexe, taille importante
- **Adapté** : Microservices distribués

#### Session cookies
- **Avantages** : Révocation simple, secure HTTP-only
- **Inconvénients** : Stateful, problème CORS, sticky sessions
- **Adapté** : Applications monolithiques

#### OAuth 2.0 / OpenID Connect
- **Avantages** : Standard sécurité, délégation, SSO
- **Inconvénients** : Complexité haute, serveur autorisation requis
- **Adapté** : Grandes organisations

#### API Keys
- **Avantages** : Simple, révocation facile
- **Inconvénients** : Pas d'expiration, pas d'info utilisateur
- **Adapté** : APIs publiques simples

### Autorisation

#### Role-Based Access Control (RBAC)
- **Avantages** : Simple à comprendre, mapping utilisateur-rôle
- **Inconvénients** : Rigide, explosion rôles complexes
- **Adapté** : POS avec rôles clairs

#### Attribute-Based Access Control (ABAC)
- **Avantages** : Granularité fine, contexte dynamique
- **Inconvénients** : Complexité configuration, performance
- **Adapté** : Systèmes complexes multi-tenants

#### Access Control Lists (ACL)
- **Avantages** : Contrôle granulaire par ressource
- **Inconvénients** : Maintenance coûteuse, performance
- **Adapté** : Systèmes avec peu de ressources

## Décision
**JWT + RBAC** pour authentification/autorisation utilisateur.
**mTLS** pour communication inter-services sécurisée.

## Justification

### Architecture sécurité

```
┌─────────────┐    JWT     ┌─────────────┐    mTLS    ┌─────────────┐
│   Frontend  │ ────────► │ API Gateway │ ────────► │ Microservice│
│  (Console)  │           │    Kong     │           │   Backend   │
└─────────────┘           └─────────────┘           └─────────────┘
                                │
                                │ Validation JWT
                                ▼
                          ┌─────────────┐
                          │   Compte    │
                          │   Service   │
                          └─────────────┘
```

### JWT Configuration

```javascript
// Structure JWT pour le POS
const jwtPayload = {
  // Standard claims
  "iss": "pos-auth-service",
  "sub": "user-12345",
  "exp": 1671234567,
  "iat": 1671230967,
  "jti": "token-uuid-123",
  
  // Custom claims pour POS
  "role": "caissier",
  "magasin_id": "magasin-123",
  "permissions": [
    "vente:create",
    "vente:read",
    "produit:read",
    "stock:read"
  ],
  "session_id": "session-uuid-456"
};

// Configuration signature
const JWT_CONFIG = {
  algorithm: 'RS256',
  issuer: 'pos-auth-service',
  audience: 'pos-microservices',
  expiresIn: '1h',
  notBefore: '0s'
};
```

### Modèle RBAC

| Rôle | Permissions | Services Autorisés |
|------|-------------|-------------------|
| **admin** | `*:*` | Tous services |
| **manager** | `vente:*, stock:*, produit:*, report:read` | Vente, Stock, Produit, Reporting |
| **caissier** | `vente:create, vente:read, produit:read` | Vente, Produit |
| **inventaire** | `stock:*, produit:read` | Stock, Produit |
| **client** | `compte:read, panier:*, checkout:*` | Compte, Panier, Checkout |

### Middleware d'authentification

```javascript
// Middleware JWT validation
const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, PUBLIC_KEY, JWT_CONFIG);
    
    // Validation métier
    if (!decoded.role || !decoded.magasin_id) {
      return res.status(401).json({ error: 'Token invalide' });
    }

    // Injection contexte utilisateur
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      magasinId: decoded.magasin_id,
      permissions: decoded.permissions,
      sessionId: decoded.session_id
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide', details: error.message });
  }
};

// Middleware autorisation RBAC
const authorize = (requiredPermission) => {
  return (req, res, next) => {
    const userPermissions = req.user.permissions || [];
    
    if (!userPermissions.includes(requiredPermission) && !userPermissions.includes('*:*')) {
      return res.status(403).json({ 
        error: 'Permission insuffisante',
        required: requiredPermission,
        user_permissions: userPermissions
      });
    }
    
    next();
  };
};
```

### Sécurité inter-services (mTLS)

```yaml
# Configuration Kong pour mTLS
services:
  - name: produit-service
    url: https://produit-service:3001
    client_certificate: produit-client-cert
    tls_verify: true
    
  - name: stock-service  
    url: https://stock-service:3002
    client_certificate: stock-client-cert
    tls_verify: true

# Certificats par service
certificates:
  - cert: |
      -----BEGIN CERTIFICATE-----
      [produit-service-client-cert]
      -----END CERTIFICATE-----
    key: |
      -----BEGIN PRIVATE KEY-----
      [produit-service-client-key]
      -----END PRIVATE KEY-----
    id: produit-client-cert
```

## Implémentation

### Service d'authentification

```javascript
// compte-service : Authentification centralisée
class AuthService {
  async login(email, password) {
    // 1. Validation credentials
    const user = await this.validateCredentials(email, password);
    if (!user) throw new Error('Credentials invalides');

    // 2. Récupération rôle et permissions
    const role = await this.getUserRole(user.id);
    const permissions = await this.getRolePermissions(role);

    // 3. Génération JWT
    const payload = {
      sub: user.id,
      role: role,
      magasin_id: user.magasin_id,
      permissions: permissions,
      session_id: uuidv4()
    };

    const token = jwt.sign(payload, PRIVATE_KEY, JWT_CONFIG);
    
    // 4. Audit log
    await this.logAuthEvent('LOGIN', user.id, req.ip);

    return { token, user: payload };
  }

  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, PUBLIC_KEY);
      
      // Vérification session active
      const sessionValid = await this.isSessionActive(decoded.session_id);
      if (!sessionValid) throw new Error('Session expirée');

      return decoded;
    } catch (error) {
      await this.logAuthEvent('TOKEN_VALIDATION_FAILED', null, null, error.message);
      throw error;
    }
  }
}
```

### Protection Kong

```yaml
# Kong plugins sécurité
plugins:
  # Rate limiting
  - name: rate-limiting
    config:
      minute: 100
      hour: 1000
      day: 10000
      limit_by: consumer
      
  # CORS sécurisé
  - name: cors
    config:
      origins: 
        - http://localhost:3000
        - https://pos.domain.com
      methods:
        - GET
        - POST
        - PUT
        - DELETE
      headers:
        - Accept
        - Authorization
        - Content-Type
      credentials: true
      
  # Validation JWT
  - name: jwt
    config:
      secret_is_base64: false
      key_claim_name: iss
      claims_to_verify:
        - exp
        - iss
        - aud
```

### Audit et monitoring

```javascript
// Service d'audit sécurité
class SecurityAuditService {
  async logSecurityEvent(event, userId, ip, details = {}) {
    const auditRecord = {
      event_type: event,
      user_id: userId,
      ip_address: ip,
      timestamp: new Date(),
      details: details,
      service: 'auth-service'
    };

    // Log local
    logger.security(auditRecord);
    
    // Métriques Prometheus
    securityEventsCounter.inc({ event_type: event });
    
    // Alerting si événement critique
    if (this.isCriticalEvent(event)) {
      await this.sendSecurityAlert(auditRecord);
    }
  }

  isCriticalEvent(event) {
    return ['BRUTE_FORCE', 'TOKEN_ABUSE', 'PRIVILEGE_ESCALATION'].includes(event);
  }
}
```

## Conséquences

### Avantages obtenus
- ✅ **Stateless** : JWT permet scaling horizontal
- ✅ **Standard** : Interopérabilité avec outils existants
- ✅ **Granularité** : Permissions fines par endpoint
- ✅ **Audit** : Trail complet des accès
- ✅ **Performance** : Validation locale sans DB

### Défis acceptés
- ⚠️ **Révocation** : Tokens JWT difficiles à invalider
- ⚠️ **Taille** : Payload JWT plus lourd que session ID
- ⚠️ **Complexité** : mTLS requiert gestion certificats
- ⚠️ **Debugging** : Sécurité peut compliquer troubleshooting

### Métriques de sécurité
- **Auth latency** : < 100ms authentification
- **Token lifetime** : 1h avec refresh possible
- **Failed attempts** : Max 5 par minute par IP
- **Audit completeness** : 100% événements tracés

## Conformité

- ✅ **OWASP** : Protection contre Top 10 2021
- ✅ **JWT RFC 7519** : Standard respecté
- ✅ **RBAC NIST** : Modèle de référence suivi
- ✅ **PCI DSS** : Prêt pour certification paiement

---

**Références** :
- RFC 7519 - JSON Web Token (JWT)
- NIST RBAC Model
- OWASP Authentication Cheat Sheet
- Kong Security Best Practices
