# Livraria API - OpenAPI 3.0, Swagger UI e JWT

Atividade da Semana 10: documentação formal de uma API de livros e autores com BCrypt, autenticação JWT stateless e controle de acesso por perfis (RBAC).

## Executar

Requer Node.js 22.19 ou superior (recomendado: Node.js 24). No terminal, entre nesta pasta (a que contém `package.json`):

```bash
npm ci
npm start
```

- Documentação interativa: http://localhost:3000/docs
- Especificação OpenAPI JSON: http://localhost:3000/docs/api.json
- API: http://localhost:3000/api/v1

A porta pode ser configurada pela variável de ambiente `PORT`. `JWT_SECRET` permite configurar a chave de assinatura; `.env.example` lista as variáveis, que devem ser definidas no ambiente do processo. O aplicativo não carrega `.env` automaticamente. As credenciais e a chave padrão existentes são para demonstração local.

Os dados são persistidos em `database.txt`, criado automaticamente na pasta do projeto e ignorado pelo Git. Os testes utilizam um arquivo temporário separado. O front-end anterior continua disponível em `index.html`; abra com o Live Server do VS Code.

## Testar pelo Swagger (Authorize)

1. Inicie a API e abra `/docs`.
2. Expanda `POST /api/v1/auth/login`, clique em **Try it out**, informe as credenciais abaixo e clique em **Execute**.
3. Copie apenas o valor do campo `token` da resposta, sem as aspas.
4. Clique em **Authorize** no topo da página, cole somente o JWT e confirme. Não digite `Bearer`: o Swagger adiciona o cabeçalho `Authorization: Bearer <token>` automaticamente.
5. Teste o cadastro de autor e livro como ADMIN. Para criar livro, use o `id` de um autor existente em `autor_id` (número inteiro).
6. Clique em **Authorize > Logout** e faça login como USER. Substitua o token no Authorize: comentários retornam `201`, enquanto cadastro de autor/livro retorna `403`.
7. Remova a autorização e tente comentar: o retorno deve ser `401`. As consultas públicas continuam disponíveis.

| Perfil de demonstração | E-mail | Senha |
|---|---|---|
| ADMIN | admin@livraria.com | admin123 |
| USER | leitor@gmail.com | leitor123 |

Os tokens expiram em 2 horas. Depois da expiração, faça login novamente. Não há rota de refresh token. O cadastro público sempre cria USER, mesmo que o cliente envie `role: "ADMIN"`. Respostas não expõem senhas nem hashes.

## Matriz de endpoints e contratos

| Método | Rota | Acesso | Sucesso | Falhas documentadas |
|---|---|---|---|---|
| GET | `/api/v1/livros` | Público | 200 | 500 |
| GET | `/api/v1/livros/{id}` | Público | 200 | 400, 404, 500 |
| GET | `/api/v1/autores` | Público | 200 | 500 |
| POST | `/api/v1/auth/register` | Público | 201 | 400, 409, 500 |
| POST | `/api/v1/auth/login` | Público | 200 | 400, 401, 500 |
| POST | `/api/v1/livros/{id}/comentarios` | USER ou ADMIN | 201 | 400, 401, 404, 500 |
| POST | `/api/v1/autores` | ADMIN | 201 | 400, 401, 403, 500 |
| POST | `/api/v1/livros` | ADMIN | 201 | 400, 401, 403, 404, 500 |

Todos os corpos de requisição usam `application/json`. Os schemas em `/docs` indicam campos obrigatórios, tipos, restrições e exemplos. Esta API utiliza **400 Bad Request** para validação, uma das alternativas previstas na atividade (400 ou 422). Não anuncia 422 porque não o retorna.

| Corpo | Obrigatórios | Opcionais e regras |
|---|---|---|
| Registro | `nome`, `email`, `senha` (strings) | E-mail válido e único; senha limitada a 72 bytes UTF-8 pelo BCrypt |
| Login | `email`, `senha` (strings) | Credenciais inválidas retornam 401 |
| Autor | `nome` (string) | `nacionalidade` (string); padrão: Não informada |
| Livro | `titulo` (string), `autor_id` (integer positivo) | `ano` (integer positivo); padrão: ano atual; autor precisa existir |
| Comentário | `texto` (string) | Autor do comentário vem do JWT |

Strings obrigatórias não aceitam conteúdo vazio ou apenas espaços. IDs de caminho devem ser inteiros positivos. Erros têm formato uniforme: `{"erro":"Mensagem explicativa"}`. Listas e detalhes de livros incluem `autor_nome`; a criação retorna o livro com `comentarios: []`.

## Verificação e manutenção do contrato

```bash
npm test
npm run docs:export
```

`npm test` valida a especificação com Swagger Parser, verifica a cobertura de todas as rotas e compara os payloads HTTP reais com os schemas de resposta. Exercita login, cadastro sem elevação de privilégio, permissões, token ausente/corrompido/expirado, validação, conflitos e recursos inexistentes. Também verifica os arquivos do Swagger e o JSON público.

A fonte do contrato é `docs/openapi.js`. Os schemas de entrada são reutilizados pelo middleware AJV, reduzindo divergências entre documentação e validação. `npm run docs:export` gera `docs/openapi.json`, pronto para importação em clientes, mocks e geradores de SDKs. A rota `/docs/api.json` sempre utiliza a fonte atual; atualize também o arquivo exportado ao alterar o contrato. O workflow do GitHub verifica testes e se a exportação está atualizada.

## Contrato, integração e governança

O OpenAPI permite que o front-end conheça os campos, tipos e falhas antes de integrar com a implementação. O JSON exportado pode alimentar mocks e geradores de SDKs tipados, permitindo desenvolvimento paralelo. O contrato deve acompanhar cada alteração de rota.

Os quatro níveis de documentação neste projeto são: referência formal (`docs/openapi.json`), interface interativa (Swagger UI em `/docs`), guia de integração (passo a passo deste README) e coleção executável (`docs/requisicoes.http`, compatível com a extensão REST Client do VS Code). Execute primeiro os logins nomeados na coleção para que as requisições seguintes capturem os tokens das respostas.

**Code-first** deriva o contrato de tipos/anotações do código e favorece rapidez, mas exige que as anotações sejam completas. **Spec-first** define o contrato antes da implementação, permitindo revisão e mocks antecipados, com maior custo inicial e necessidade de testes de conformidade. Como a API já existia, esta atualização formaliza seu contrato em um módulo explícito compartilhado com a validação; não usa reflexão automática nem JSDoc.

O **documentation drift** acontece quando o contrato deixa de refletir o comportamento real. Schemas compartilhados e testes de respostas reduzem esse risco, mas mudanças de regras também exigem revisão das descrições. Remover/renomear campos, mudar tipos ou tornar campos opcionais obrigatórios pode quebrar clientes; futuras mudanças incompatíveis devem ser planejadas em `/api/v2` com comunicação aos consumidores. A validação desta entrega passa a rejeitar tipos incorretos, como `autor_id: "1"`; envie `autor_id: 1`. Documentar apenas sucesso omite decisões necessárias ao cliente: 401 pede novo login, 403 indica falta de privilégio, 404 indica recurso ausente e 409 indica conflito de cadastro.

O esquema HTTP Bearer segue a [documentação oficial do Swagger](https://swagger.io/docs/specification/v3_0/authentication/bearer-authentication/).
