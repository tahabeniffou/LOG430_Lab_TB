const magasinService = require('../../src/api/rest/services/magasinService');
const Magasin = require('../../src/models/Magasin');

jest.mock('../../src/models/Magasin');

describe('magasinService', () => {
  afterEach(() => jest.clearAllMocks());

  it('listerTous doit appeler Magasin.findAll', async () => {
    await magasinService.listerTous();
    expect(Magasin.findAll).toHaveBeenCalled();
  });

  it('trouverParId doit appeler Magasin.findByPk', async () => {
    await magasinService.trouverParId(1);
    expect(Magasin.findByPk).toHaveBeenCalledWith(1);
  });

  it('creer doit appeler Magasin.create', async () => {
    await magasinService.creer({ nom: 'Test', adresse: 'Adresse' });
    expect(Magasin.create).toHaveBeenCalled();
  });

  it('mettreAJour doit appeler Magasin.update', async () => {
    await magasinService.mettreAJour(1, { nom: 'Test' });
    expect(Magasin.update).toHaveBeenCalled();
  });

  it('supprimer doit appeler Magasin.destroy', async () => {
    await magasinService.supprimer(1);
    expect(Magasin.destroy).toHaveBeenCalled();
  });
});
