const venteService = require('../../src/api/rest/services/venteService');
const Vente = require('../../src/models/Vente');
const LigneVente = require('../../src/models/LigneVente');
const Produit = require('../../src/models/Produit');

jest.mock('../../src/models/Vente');
jest.mock('../../src/models/LigneVente');
jest.mock('../../src/models/Produit');

describe('venteService', () => {
  afterEach(() => jest.clearAllMocks());

  it('listerToutes doit appeler Vente.findAll', async () => {
    await venteService.listerToutes();
    expect(Vente.findAll).toHaveBeenCalled();
  });

  it('trouverParId doit appeler Vente.findByPk', async () => {
    await venteService.trouverParId(1);
    expect(Vente.findByPk).toHaveBeenCalledWith(1, { include: [LigneVente] });
  });

  it('creer doit créer une vente et des lignes', async () => {
    Vente.create.mockResolvedValue({ id: 1 });
    Produit.decrement.mockResolvedValue();
    LigneVente.create.mockResolvedValue();
    const data = { magasinId: 1, utilisateurId: 2, lignes: [{ produitId: 3, quantite: 2, prix: 5 }] };
    await venteService.creer(data);
    expect(Vente.create).toHaveBeenCalled();
    expect(LigneVente.create).toHaveBeenCalled();
    expect(Produit.decrement).toHaveBeenCalled();
  });

  it('annuler doit remettre le stock et supprimer la vente', async () => {
    LigneVente.findAll.mockResolvedValue([{ produitId: 3, quantite: 2 }]);
    Produit.increment.mockResolvedValue();
    LigneVente.destroy.mockResolvedValue();
    Vente.destroy.mockResolvedValue();
    await venteService.annuler(1);
    expect(Produit.increment).toHaveBeenCalled();
    expect(LigneVente.destroy).toHaveBeenCalled();
    expect(Vente.destroy).toHaveBeenCalled();
  });
});
