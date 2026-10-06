# Livraria API — Segurança com BCrypt, JWT e RBAC

Atividade de segurança aplicada a uma API RESTful de Livros e Autores.

## Recursos implementados

- Hash de senhas com BCrypt (salt automático e work factor 10).
- Login stateless com JWT válido por 2 horas.
- Token enviado no padrão `Authorization: Bearer <token>`.
- RBAC com perfis `USER` e `ADMIN`.
- Rotas públicas, autenticadas e administrativas conforme a matriz da atividade.
- Cadastro público cria somente usuários `USER`, impedindo elevação de privilégio pelo endpoint de registro.

## Credenciais de teste

### Administrador
- E-mail: `admin@livraria.com`
- Senha: `admin123`

### Leitor
- E-mail: `leitor@gmail.com`
- Senha: `leitor123`

## Instalação

```bash
npm install
```

## Execução da API

```bash
npm start
```

API: `http://localhost:3000/api/v1`

## Front-end de testes

O arquivo `index.html` está na raiz do projeto. Abra com Live Server no VS Code ou execute:

```bash
py -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Matriz de permissões

| Método | Rota | Acesso |
|---|---|---|
| GET | `/api/v1/livros` | Público |
| GET | `/api/v1/livros/:id` | Público |
| POST | `/api/v1/auth/register` | Público |
| POST | `/api/v1/auth/login` | Público |
| POST | `/api/v1/livros/:id/comentarios` | USER ou ADMIN autenticado |
| POST | `/api/v1/autores` | ADMIN |
| POST | `/api/v1/livros` | ADMIN |

## Testes esperados

1. Anônimo: GET de livros funciona; POST de livro retorna `401`.
2. Leitor: login funciona; comentário retorna `201`; POST de livro retorna `403`.
3. Admin: login funciona; cadastro de autor e livro retorna `201`.

## GitHub

Após testar:

```bash
git add .
git commit -m "feat: implementacao de auth jwt, hashes bcrypt e controle rbac"
git push origin main
```
