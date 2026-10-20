const { Router } = require('express');
const controller = require('../controllers/AutorController');
const { autenticarToken, exigirRole } = require('../middlewares/authMiddleware');
const { validarCorpo } = require('../middlewares/validationMiddleware');

const router = Router();

router.get('/', (req, res, next) => controller.index(req, res, next));
router.post('/', autenticarToken, exigirRole('ADMIN'), validarCorpo('NovoAutor'), (req, res, next) => controller.store(req, res, next));

module.exports = router;
