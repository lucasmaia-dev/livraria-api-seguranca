const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const repository = require('../repositories/LivrariaRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'chave_super_secreta_livraria_2026';
const SALT_ROUNDS = 10;

class AuthService {
  async registrar({ nome, email, senha }) {
    if (!nome || !email || !senha) {
      throw { status: 400, message: 'Campos obrigatórios ausentes: nome, email ou senha.' };
    }

    const emailNormalizado = email.trim().toLowerCase();
    const usuarioExistente = repository.buscarUsuarioPorEmail(emailNormalizado);
    if (usuarioExistente) {
      throw { status: 409, message: 'E-mail já cadastrado no sistema.' };
    }

    // BCrypt já incorpora um salt aleatório ao hash. O custo utilizado é 10.
    const senha_hash = await bcrypt.hash(senha, SALT_ROUNDS);

    // Cadastro público nunca pode conceder privilégio administrativo.
    const novoUsuario = repository.salvarUsuario({
      nome: nome.trim(),
      email: emailNormalizado,
      senha_hash,
      role: 'USER'
    });

    const { senha_hash: _, ...usuarioRetorno } = novoUsuario;
    return usuarioRetorno;
  }

  async login({ email, senha }) {
    if (!email || !senha) {
      throw { status: 400, message: 'E-mail e senha são obrigatórios.' };
    }

    const usuario = repository.buscarUsuarioPorEmail(email.trim().toLowerCase());
    if (!usuario) {
      throw { status: 401, message: 'Credenciais inválidas.' };
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      throw { status: 401, message: 'Credenciais inválidas.' };
    }

    const payload = {
      sub: usuario.id,
      nome: usuario.nome,
      role: usuario.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });

    return {
      usuario: { id: usuario.id, nome: usuario.nome, role: usuario.role },
      token
    };
  }
}

module.exports = new AuthService();
