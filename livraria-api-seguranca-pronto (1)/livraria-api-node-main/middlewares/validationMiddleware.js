const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { components } = require('../docs/openapi');
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validators = new Map();

function validarCorpo(schemaName) {
  if (!validators.has(schemaName)) validators.set(schemaName, ajv.compile(components.schemas[schemaName]));
  return (req, res, next) => {
    const validate = validators.get(schemaName);
    if (!validate(req.body)) return res.status(400).json({ erro: `Dados inválidos: ${ajv.errorsText(validate.errors, { separator: '; ' })}` });
    if (schemaName === 'Registro' && Buffer.byteLength(req.body.senha, 'utf8') > 72) {
      return res.status(400).json({ erro: 'A senha deve ter no máximo 72 bytes UTF-8.' });
    }
    return next();
  };
}

function validarId(req, res, next) {
  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro positivo.' });
  }
  return next();
}
module.exports = { validarCorpo, validarId };
