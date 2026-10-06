const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'chave_super_secreta_livraria_2026';

function autenticarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      erro: 'Acesso negado: Token de autenticação não fornecido.'
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      erro: 'Acesso negado: Token de autenticação não fornecido.'
    });
  }

  try {
    const usuarioDecodificado = jwt.verify(token, JWT_SECRET);
    req.usuario = usuarioDecodificado;
    return next();
  } catch (error) {
    return res.status(401).json({
      erro: 'Token inválido, corrompido ou expirado.'
    });
  }
}

function exigirRole(roleEsperada) {
  return (req, res, next) => {
    if (!req.usuario || req.usuario.role !== roleEsperada) {
      return res.status(403).json({
        erro: `Acesso proibido: Privilégio de ${roleEsperada} exigido para esta operação.`
      });
    }

    return next();
  };
}

module.exports = { autenticarToken, exigirRole };
