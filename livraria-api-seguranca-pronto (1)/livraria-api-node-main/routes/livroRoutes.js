const { Router } = require('express');
const controller = require('../controllers/LivroController');
const { autenticarToken, exigirRole } = require('../middlewares/authMiddleware');
const { validarCorpo, validarId } = require('../middlewares/validationMiddleware');

const router = Router();

// Rotas Públicas
router.get('/', (req, res, next) => controller.index(req, res, next));
router.get('/:id', validarId, (req, res, next) => controller.show(req, res, next));

// Rota Restrita: ADMIN
router.post('/', autenticarToken, exigirRole('ADMIN'), validarCorpo('NovoLivro'), (req, res, next) => controller.store(req, res, next));

// Rota Restrita: Usuário Autenticado
router.post('/:id/comentarios', autenticarToken, validarId, validarCorpo('NovoComentario'), (req, res, next) => controller.storeComment(req, res, next));

module.exports = router;
