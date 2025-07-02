const { Utilisateur } = require('../../../models');


exports.getUtilisateursByMagasin = async (req, res) => {
  try {
    const utilisateurs = await Utilisateur.findAll({
      where: { magasinId: req.params.id }
    });

    res.json(utilisateurs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};


exports.creerMagasin = async (req, res) => {
  try {
    const { nom, adresse } = req.body;
    if (!nom || !adresse) {
      return res.status(400).json({ message: 'Nom et adresse requis' });
    }
    const magasin = await require('../../../models/Magasin').create({ nom, adresse });
    res.status(201).json(magasin);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
