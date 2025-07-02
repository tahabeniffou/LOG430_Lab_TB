const Router = require('express');
const logistiqueController = require('../controllers/logistiqueController.js');
const router = Router();

router.post('/reappro', logistiqueController.reappro);

module.exports = router;
