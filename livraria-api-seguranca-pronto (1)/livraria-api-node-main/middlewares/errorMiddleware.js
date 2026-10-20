function errorHandler(err, req, res, next) {
  const statusCode = err.status || 500;
  const mensagem = err.type === 'entity.parse.failed'
    ? 'JSON malformado. Verifique o corpo da requisição.'
    : statusCode >= 500 ? 'Ocorreu um erro interno no servidor.' : err.message;

  return res.status(statusCode).json({
    erro: mensagem
  });
}

module.exports = errorHandler;
