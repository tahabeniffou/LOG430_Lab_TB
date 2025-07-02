const utilisateurService = require('../../src/api/rest/services/utilisateurService');
const Utilisateur = require('../../src/models/Utilisateur');

jest.mock('../../src/models/Utilisateur');

describe('utilisateurService', () => {
  afterEach(() => jest.clearAllMocks());

  it('listerTous doit appeler Utilisateur.findAll', async () => {
    await utilisateurService.listerTous(1);
    expect(Utilisateur.findAll).toHaveBeenCalled();
  });

  it('trouverParId doit appeler Utilisateur.findByPk', async () => {
    await utilisateurService.trouverParId(1);
    expect(Utilisateur.findByPk).toHaveBeenCalledWith(1);
  });

  it('creer doit appeler Utilisateur.create', async () => {
    await utilisateurService.creer({ nom: 'Test', motDePasse: '1234', magasinId: 1 });
    expect(Utilisateur.create).toHaveBeenCalled();
  });

  it('mettreAJour doit appeler Utilisateur.update', async () => {
    await utilisateurService.mettreAJour(1, { nom: 'Test' });
    expect(Utilisateur.update).toHaveBeenCalled();
  });

  it('supprimer doit appeler Utilisateur.destroy', async () => {
    await utilisateurService.supprimer(1);
    expect(Utilisateur.destroy).toHaveBeenCalled();
  });
});
