import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 }, // ramp-up
    { duration: '1m', target: 50 },  // palier
    { duration: '30s', target: 0 },  // ramp-down
  ],
};

const BASE_URL = 'http://localhost:3000/api/v1';

export default function () {
  // 1. Consultation simultanée des stocks de plusieurs magasins
  let magasinId = Math.floor(Math.random() * 3) + 1;
  let res1 = http.get(`${BASE_URL}/produits?magasinId=${magasinId}`);
  check(res1, { 'produits 200': (r) => r.status === 200 });

  // 2. Génération de rapports consolidés
  let res2 = http.get(`${BASE_URL}/rapports?type=ventes`);
  check(res2, { 'rapport 200': (r) => r.status === 200 });

  // 3. Mise à jour de produits à forte fréquence
  let produitId = Math.floor(Math.random() * 10) + 1;
  let update = http.patch(`${BASE_URL}/produits/${produitId}`, JSON.stringify({ stock: Math.floor(Math.random()*100) }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(update, { 'update 200/204': (r) => r.status === 200 || r.status === 204 });

  sleep(1);
}
