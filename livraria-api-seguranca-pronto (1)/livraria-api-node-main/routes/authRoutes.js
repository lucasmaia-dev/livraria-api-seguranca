const { Router } = require('express');
const controller = require('../controllers/AuthController');
const { validarCorpo } = require('../middlewares/validationMiddleware');

const router = Router();
router.post('/register', validarCorpo('Registro'), (req, res, next) => controller.register(req, res, next));
router.post('/login', validarCorpo('Login'), (req, res, next) => controller.login(req, res, next));

module.exports = router;
