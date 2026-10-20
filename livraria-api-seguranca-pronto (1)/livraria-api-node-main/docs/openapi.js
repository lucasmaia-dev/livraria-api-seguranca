const ref = name => ({ $ref: `#/components/schemas/${name}` });
const text = example => ({ type: 'string', minLength: 1, pattern: '\\S', example });
const id = { type: 'integer', minimum: 1, example: 1 };
const object = (required, properties) => ({ type: 'object', required, properties });
const schemas = {
  Registro: object(['nome', 'email', 'senha'], {
    nome: text('Ana Silva'), email: { type: 'string', format: 'email', example: 'ana@example.com' },
    senha: { ...text('minhaSenha123'), maxLength: 72, description: 'Máximo de 72 bytes UTF-8 (limite do BCrypt).' }
  }),
  Login: object(['email', 'senha'], {
    email: { type: 'string', format: 'email', example: 'admin@livraria.com' }, senha: text('admin123')
  }),
  NovoAutor: object(['nome'], {
    nome: text('Clarice Lispector'), nacionalidade: text('Brasileira')
  }),
  NovoLivro: object(['titulo', 'autor_id'], {
    titulo: text('A Hora da Estrela'), ano: { type: 'integer', minimum: 1, example: 1977, description: 'Se omitido, utiliza o ano atual.' }, autor_id: id
  }),
  NovoComentario: object(['texto'], { texto: text('Uma leitura marcante e sensível.') }),
  Erro: object(['erro'], { erro: text('Livro não localizado.') }),
  UsuarioLogin: object(['id', 'nome', 'role'], {
    id, nome: text('Admin'), role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'ADMIN' }
  }),
  Usuario: object(['id', 'nome', 'email', 'role'], {
    id, nome: text('Ana Silva'), email: { type: 'string', format: 'email', example: 'ana@example.com' }, role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' }
  }),
  Sessao: object(['usuario', 'token'], {
    usuario: ref('UsuarioLogin'), token: { type: 'string', description: 'JWT válido por 2 horas. Copie apenas este valor para Authorize.', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInJvbGUiOiJBRE1JTiJ9.assinatura' }
  }),
  Autor: object(['id', 'nome', 'nacionalidade'], { id, nome: text('Machado de Assis'), nacionalidade: text('Brasileiro') }),
  Comentario: object(['id', 'autor_nome', 'texto'], { id, autor_nome: text('Leitor'), texto: text('Clássico indispensável.') }),
  Livro: object(['id', 'titulo', 'ano', 'autor_id', 'comentarios'], {
    id, titulo: text('Dom Casmurro'), ano: { type: 'integer', example: 1899 }, autor_id: id,
    comentarios: { type: 'array', items: ref('Comentario') }
  }),
  LivroDetalhado: { allOf: [ref('Livro'), object(['autor_nome'], { autor_nome: text('Machado de Assis') })] }
};
const json = schema => ({ 'application/json': { schema } });
const response = (description, schema) => ({ description, content: json(schema) });
const errors = {
  400: 'JSON malformado, corpo ausente, campo obrigatório ausente ou tipo/valor inválido.',
  401: 'Token Bearer ausente, inválido, corrompido ou expirado; no login, credenciais inválidas.',
  403: 'O usuário autenticado não possui o perfil ADMIN.',
  404: 'Livro ou autor informado não encontrado.',
  409: 'E-mail já cadastrado.',
  500: 'Falha interna inesperada no servidor.'
};
const errorExamples = {
  400: 'JSON malformado. Verifique o corpo da requisição.',
  401: 'Token inválido, corrompido ou expirado.',
  403: 'Acesso proibido: Privilégio de ADMIN exigido para esta operação.',
  404: 'Livro não localizado.',
  409: 'E-mail já cadastrado no sistema.',
  500: 'Ocorreu um erro interno no servidor.'
};
const operation = (operationId, tag, summary, description, success, output, failures, input, access = 'PUBLIC') => ({
  operationId, tags: [tag], summary, description,
  security: access === 'PUBLIC' ? [] : [{ bearerAuth: [] }],
  'x-roles': access === 'PUBLIC' ? [] : access === 'ADMIN' ? ['ADMIN'] : ['USER', 'ADMIN'],
  ...(input ? { requestBody: { required: true, content: json(ref(input)) } } : {}),
  responses: {
    [success]: response(success === 201 ? 'Recurso criado com sucesso.' : 'Operação realizada com sucesso.', output),
    ...Object.fromEntries(failures.map(code => [code, {
      description: errors[code],
      content: { 'application/json': { schema: ref('Erro'), example: { erro: errorExamples[code] } } }
    }]))
  }
});
const livroId = { name: 'id', in: 'path', required: true, description: 'Identificador inteiro positivo do livro.', schema: id };
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Livraria API - Livros, Autores e Segurança', version: '1.1.0',
    description: 'Contrato da API REST v1. Faça login em POST /api/v1/auth/login, copie o campo token e clique em Authorize. Cole somente o JWT, sem o prefixo Bearer. O Swagger adiciona Authorization: Bearer automaticamente. Cadastro público sempre cria USER; somente ADMIN cadastra autores e livros. Validações retornam 400. Senhas e hashes nunca são retornados.'
  },
  servers: [{ url: '/', description: 'Servidor atual (mesma origem da documentação)' }],
  tags: [{ name: 'Autenticação' }, { name: 'Livros' }, { name: 'Autores' }, { name: 'Comentários' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Insira somente o token JWT obtido no login.' } }, schemas
  },
  paths: {
    '/api/v1/auth/register': { post: operation('registrarUsuario', 'Autenticação', 'Cadastrar usuário USER', 'Público. Nome, e-mail e senha obrigatórios. O e-mail é normalizado; duplicidade retorna 409. Qualquer role enviada é ignorada, impedindo elevação de privilégios.', 201, ref('Usuario'), [400, 409, 500], 'Registro') },
    '/api/v1/auth/login': { post: operation('login', 'Autenticação', 'Autenticar e obter JWT', 'Público. Valida a senha com BCrypt e retorna JWT de 2 horas e dados básicos do usuário. Credenciais incorretas retornam 401.', 200, ref('Sessao'), [400, 401, 500], 'Login') },
    '/api/v1/livros': {
      get: operation('listarLivros', 'Livros', 'Listar livros', 'Público. Retorna todos os livros com nome do autor e comentários. Sem registros, retorna lista vazia.', 200, { type: 'array', items: ref('LivroDetalhado') }, [500]),
      post: operation('criarLivro', 'Livros', 'Cadastrar livro (ADMIN)', 'Exige JWT com perfil ADMIN. Título e autor_id obrigatórios. O autor deve existir (404). Ano opcional, com padrão no ano atual. O livro criado inicia sem comentários.', 201, ref('Livro'), [400, 401, 403, 404, 500], 'NovoLivro', 'ADMIN')
    },
    '/api/v1/livros/{id}': { parameters: [livroId], get: operation('buscarLivro', 'Livros', 'Consultar livro por ID', 'Público. Retorna livro, nome do autor e comentários. ID inexistente retorna 404; ID com formato inválido retorna 400.', 200, ref('LivroDetalhado'), [400, 404, 500]) },
    '/api/v1/livros/{id}/comentarios': { parameters: [livroId], post: operation('criarComentario', 'Comentários', 'Comentar livro (USER ou ADMIN)', 'Exige JWT válido de USER ou ADMIN. Texto obrigatório e não vazio. O nome do autor do comentário é obtido do token, e não do corpo enviado. Livro inexistente retorna 404.', 201, ref('Comentario'), [400, 401, 404, 500], 'NovoComentario', 'AUTHENTICATED') },
    '/api/v1/autores': {
      get: operation('listarAutores', 'Autores', 'Listar autores', 'Público. Retorna os autores disponíveis para associação com livros.', 200, { type: 'array', items: ref('Autor') }, [500]),
      post: operation('criarAutor', 'Autores', 'Cadastrar autor (ADMIN)', 'Exige JWT com perfil ADMIN. Nome obrigatório. Nacionalidade opcional; se omitida, recebe Não informada.', 201, ref('Autor'), [400, 401, 403, 500], 'NovoAutor', 'ADMIN')
    }
  }
};
