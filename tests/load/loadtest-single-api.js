import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
};

export default function () {
  // Consultation simultanée des stocks de plusieurs magasins
  http.get('http://localhost:3001/api/v1/produits/1/stock');
  http.get('http://localhost:3001/api/v1/produits/2/stock');
  http.get('http://localhost:3001/api/v1/produits/3/stock');

  // Génération de rapports consolidés
  http.get('http://localhost:3001/api/v1/rapports');

  // Mise à jour de produits à forte fréquence
  http.put('http://localhost:3001/api/v1/produits/1', JSON.stringify({ stock: Math.floor(Math.random()*100) }), { headers: { 'Content-Type': 'application/json' } });

  sleep(1);
}
