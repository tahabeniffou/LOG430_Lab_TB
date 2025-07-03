import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 100,
  duration: '1m',
};

const users = [
  { nom: 'Dupont', motDePasse: '1234' },
  { nom: 'Martin', motDePasse: 'abcd' },
  { nom: 'Durand', motDePasse: 'pass1' },
  { nom: 'Lefevre', motDePasse: 'pass2' },
];

export default function () {
  const user = users[Math.floor(Math.random() * users.length)];
  const loginRes = http.post('http://localhost:8080/api/v1/utilisateurs/auth', JSON.stringify({
    nom: user.nom,
    motDePasse: user.motDePasse,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(loginRes, { 'login status 200': (r) => r.status === 200 });
  for (let i = 0; i < 5; i++) {
    http.get('http://localhost:8080/api/v1/produits?magasinId=1');
    http.get('http://localhost:8080/api/v1/produits/stock?magasinId=1');
    http.post('http://localhost:8080/api/v1/ventes', JSON.stringify({ magasinId: 1, utilisateurId: 1, lignes: [{ produitId: 1, quantite: 1 }] }), { headers: { 'Content-Type': 'application/json' } });
    sleep(0.1);
  }
  sleep(0.1);
}
