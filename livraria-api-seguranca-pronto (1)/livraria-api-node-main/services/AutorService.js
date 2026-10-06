const repository = require('../repositories/LivrariaRepository');

class AutorService {
  listarTodos() {
    return repository.listarAutores();
  }

  criar({ nome, nacionalidade }) {
    if (!nome || nome.trim() === "") {
      throw { status: 400, message: "O nome do autor é obrigatório." };
    }

    return repository.salvarAutor({
      nome: nome.trim(),
      nacionalidade: nacionalidade || "Não informada"
    });
  }
}

module.exports = new AutorService();