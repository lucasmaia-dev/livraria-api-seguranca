const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./docs/openapi');

const authRoutes = require('./routes/authRoutes');
const livroRoutes = require('./routes/livroRoutes');
const autorRoutes = require('./routes/autorRoutes');
const errorHandler = require('./middlewares/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.get('/docs/api.json', (req, res) => res.json(openapi));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(null, {
  swaggerOptions: { url: '/docs/api.json', validatorUrl: null },
  customSiteTitle: 'Livraria API - Documentação'
}));

// Agrupamento Semântico de Rotas (RESTful /api/v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/livros', livroRoutes);
app.use('/api/v1/autores', autorRoutes);

// Middleware Global de Tratamento de Erros
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Livraria API rodando em http://localhost:${PORT}`);
    console.log(`Swagger UI: http://localhost:${PORT}/docs`);
  });
}
module.exports = app;
