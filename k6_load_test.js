import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 100, // 100 utilisateurs simultanés
  duration: '5m', // test sur 5 minutes
};

const users = [
  { nom: 'Dupont', motDePasse: '1234' },
  { nom: 'Martin', motDePasse: 'abcd' },
  { nom: 'Durand', motDePasse: 'pass1' },
  { nom: 'Lefevre', motDePasse: 'pass2' },
];

export default function () {
  // Sélectionne un caissier aléatoire
  const user = users[Math.floor(Math.random() * users.length)];
  // Authentification
  const loginRes = http.post('http://localhost:8080/api/v1/utilisateurs/auth', JSON.stringify({
    nom: user.nom,
    motDePasse: user.motDePasse,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(loginRes, {
    'login status 200': (r) => r.status === 200,
  });
  // Effectue plusieurs opérations protégées pour stresser l'API
  for (let i = 0; i < 5; i++) {
    // Consultation des produits
    const produitsRes = http.get('http://localhost:8080/api/v1/produits?magasinId=1', {
      headers: { 'Content-Type': 'application/json' },
    });
    check(produitsRes, { 'produits status 200': (r) => r.status === 200 });
    // Consultation du stock
    const stockRes = http.get('http://localhost:8080/api/v1/produits/stock?magasinId=1', {
      headers: { 'Content-Type': 'application/json' },
    });
    check(stockRes, { 'stock status 200': (r) => r.status === 200 });
    // Création d'une vente fictive
    const venteRes = http.post('http://localhost:8080/api/v1/ventes', JSON.stringify({
      magasinId: 1,
      utilisateurId: 1,
      lignes: [{ produitId: 1, quantite: 1 }]
    }), { headers: { 'Content-Type': 'application/json' } });
    check(venteRes, { 'vente status 201': (r) => r.status === 201 || r.status === 200 });
    sleep(0.1);
  }
  sleep(0.1);
}
