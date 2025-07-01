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
