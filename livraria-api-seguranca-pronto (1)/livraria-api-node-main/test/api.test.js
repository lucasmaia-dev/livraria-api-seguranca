const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const SwaggerParser = require('@apidevtools/swagger-parser');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const jwt = require('jsonwebtoken');

test('OpenAPI, documentação interativa e matriz real de permissões', async t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'livraria-test-'));
  process.env.DATABASE_PATH = path.join(temporary, 'database.txt');
  process.env.JWT_SECRET = 'segredo-exclusivo-dos-testes';
  const app = require('../server');
  const repository = require('../repositories/LivrariaRepository');
  const original = require('../docs/openapi');
  const spec = await SwaggerParser.validate(JSON.parse(JSON.stringify(original)));
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    fs.unlinkSync(process.env.DATABASE_PATH);
    fs.rmdirSync(temporary);
  });
  async function request(method, uri, status, body, token, raw = false) {
    const response = await fetch(base + uri, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body !== undefined ? { body: raw ? body : JSON.stringify(body) } : {})
    });
    const data = await response.json();
    assert.equal(response.status, status, `${method} ${uri}: ${JSON.stringify(data)}`);
    const contractPath = uri.replace(/\/livros\/[^/]+/, '/livros/{id}');
    const contract = spec.paths[contractPath][method.toLowerCase()].responses[status];
    assert.ok(contract, `Resposta ${status} documentada em ${contractPath}`);
    const validate = ajv.compile(contract.content['application/json'].schema);
    assert.ok(validate(data), JSON.stringify(validate.errors));
    return data;
  }

  await t.test('especificação OAS 3.0 válida, schemas compartilhados e todas as rotas cobertas', () => {
    assert.equal(spec.openapi, '3.0.3');
    assert.deepEqual(original.components.securitySchemes.bearerAuth.scheme, 'bearer');
    let count = 0;
    for (const [prefix, router] of [
      ['/api/v1/auth', require('../routes/authRoutes')],
      ['/api/v1/autores', require('../routes/autorRoutes')],
      ['/api/v1/livros', require('../routes/livroRoutes')]
    ]) {
      for (const layer of router.stack.filter(layer => layer.route)) {
        const uri = (prefix + (layer.route.path === '/' ? '' : layer.route.path)).replace(':id', '{id}');
        for (const method of Object.keys(layer.route.methods)) {
          assert.ok(spec.paths[uri]?.[method], `${method} ${uri} sem documentação`);
          count++;
        }
      }
    }
    assert.equal(count, 8);
    assert.equal(Object.values(spec.paths).reduce((sum, item) => sum + Object.keys(item).filter(key => ['get', 'post'].includes(key)).length, 0), count);
  });
  await t.test('Swagger UI, JavaScript e JSON acessíveis sem autenticação', async () => {
    const ui = await fetch(base + '/docs');
    assert.equal(ui.status, 200);
    assert.match(await ui.text(), /swagger-ui/);
    const init = await fetch(base + '/docs/swagger-ui-init.js');
    assert.match(await init.text(), /\/docs\/api.json/);
    assert.equal((await fetch(base + '/docs/swagger-ui-bundle.js')).status, 200);
    assert.deepEqual(await (await fetch(base + '/docs/api.json')).json(), original);
  });
  let admin, user;
  await t.test('rotas públicas, cadastro sem elevação de privilégios e login', async () => {
    await request('GET', '/api/v1/livros', 200);
    await request('GET', '/api/v1/livros/1', 200);
    await request('GET', '/api/v1/autores', 200);
    const registered = await request('POST', '/api/v1/auth/register', 201, { nome: 'Ana Silva', email: 'ana@example.com', senha: 'minhaSenha123', role: 'ADMIN' });
    assert.equal(registered.role, 'USER');
    assert.equal(registered.senha_hash, undefined);
    await request('POST', '/api/v1/auth/register', 409, { nome: 'Ana', email: 'ana@example.com', senha: 'senha123' });
    admin = (await request('POST', '/api/v1/auth/login', 200, { email: 'admin@livraria.com', senha: 'admin123' })).token;
    user = (await request('POST', '/api/v1/auth/login', 200, { email: 'leitor@gmail.com', senha: 'leitor123' })).token;
    const stored = repository.buscarUsuarioPorEmail('ana@example.com');
    assert.match(stored.senha_hash, /^\$2[ab]\$10\$/);
    await request('POST', '/api/v1/auth/login', 401, { email: 'admin@livraria.com', senha: 'errada' });
  });
  await t.test('401 para token ausente, corrompido e expirado; 403 para USER', async () => {
    const expired = jwt.sign({ sub: 2, nome: 'Leitor', role: 'USER' }, process.env.JWT_SECRET, { expiresIn: -1 });
    for (const token of [undefined, 'token-corrompido', expired]) {
      await request('POST', '/api/v1/livros/1/comentarios', 401, { texto: 'Comentário' }, token);
      await request('POST', '/api/v1/autores', 401, { nome: 'Autor' }, token);
      await request('POST', '/api/v1/livros', 401, { titulo: 'Livro', autor_id: 1 }, token);
    }
    await request('POST', '/api/v1/autores', 403, { nome: 'Autor' }, user);
    await request('POST', '/api/v1/livros', 403, { titulo: 'Livro', autor_id: 1 }, user);
    assert.deepEqual(original.paths['/api/v1/livros'].post.security, [{ bearerAuth: [] }]);
    assert.deepEqual(original.paths['/api/v1/livros'].get.security, []);
  });
  await t.test('ADMIN cria autor/livro; USER e ADMIN comentam com identidade do JWT', async () => {
    const author = await request('POST', '/api/v1/autores', 201, { nome: 'Clarice Lispector', nacionalidade: 'Brasileira' }, admin);
    const book = await request('POST', '/api/v1/livros', 201, { titulo: 'A Hora da Estrela', ano: 1977, autor_id: author.id }, admin);
    const comment = await request('POST', `/api/v1/livros/${book.id}/comentarios`, 201, { texto: 'Leitura marcante.', autor_nome: 'Falso' }, user);
    assert.equal(comment.autor_nome, 'Leitor');
    await request('POST', `/api/v1/livros/${book.id}/comentarios`, 201, { texto: 'Recomendo.' }, admin);
    const detail = await request('GET', `/api/v1/livros/${book.id}`, 200);
    assert.equal(detail.autor_nome, 'Clarice Lispector');
    assert.equal(detail.comentarios.length, 2);
  });
  await t.test('400 para campos, tipos, JSON, identificadores e corpos inválidos', async () => {
    for (const body of [{}, { email: 123, senha: 'senha' }, null, []]) await request('POST', '/api/v1/auth/login', 400, body);
    await request('POST', '/api/v1/auth/login', 400);
    await request('POST', '/api/v1/auth/login', 400, '{', undefined, true);
    for (const body of [
      { nome: ' ', email: 'ana@example.com', senha: 'senha' },
      { nome: 'Ana', email: 'invalido', senha: 'senha' },
      { nome: 'Ana', email: 'ana@example.com', senha: 'á'.repeat(40) }
    ]) await request('POST', '/api/v1/auth/register', 400, body);
    await request('POST', '/api/v1/autores', 400, { nome: 123 }, admin);
    await request('POST', '/api/v1/autores', 400, { nome: ' ' }, admin);
    await request('POST', '/api/v1/livros', 400, { titulo: 'Livro', autor_id: '1' }, admin);
    await request('POST', '/api/v1/livros', 400, { titulo: 'Livro', autor_id: 1, ano: 1.5 }, admin);
    await request('POST', '/api/v1/livros/1/comentarios', 400, { texto: ' ' }, user);
    await request('POST', '/api/v1/livros/1/comentarios', 400, { texto: 123 }, user);
    await request('GET', '/api/v1/livros/abc', 400);
    await request('GET', '/api/v1/livros/1.5', 400);
  });
  await t.test('404 para recursos inexistentes e 500 com payload documentado', async () => {
    await request('GET', '/api/v1/livros/999', 404);
    await request('POST', '/api/v1/livros/999/comentarios', 404, { texto: 'Teste' }, user);
    await request('POST', '/api/v1/livros', 404, { titulo: 'Livro', autor_id: 999 }, admin);
    const list = repository.listarLivros;
    repository.listarLivros = () => { throw new Error('Erro interno de teste'); };
    try {
      const error = await request('GET', '/api/v1/livros', 500);
      assert.doesNotMatch(error.erro, /Erro interno de teste/);
    } finally { repository.listarLivros = list; }
  });
});
