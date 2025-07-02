const produitService = require('../../src/api/rest/services/produitService');
const Produit = require('../../src/models/Produit');

jest.mock('../../src/models/Produit');

describe('produitService', () => {
  afterEach(() => jest.clearAllMocks());

  it('listerTous doit appeler Produit.findAll', async () => {
    await produitService.listerTous(1);
    expect(Produit.findAll).toHaveBeenCalled();
  });

  it('trouverParId doit appeler Produit.findByPk', async () => {
    await produitService.trouverParId(1);
    expect(Produit.findByPk).toHaveBeenCalledWith(1);
  });

  it('creer doit appeler Produit.create', async () => {
    await produitService.creer({ nom: 'Test', prix: 1, stock: 1, magasinId: 1 });
    expect(Produit.create).toHaveBeenCalled();
  });

  it('mettreAJour doit appeler Produit.update', async () => {
    await produitService.mettreAJour(1, { nom: 'Test' });
    expect(Produit.update).toHaveBeenCalled();
  });

  it('supprimer doit appeler Produit.destroy', async () => {
    await produitService.supprimer(1);
    expect(Produit.destroy).toHaveBeenCalled();
  });
});
