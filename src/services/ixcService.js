const axios = require("axios");
const { API_URL, API_KEY } = require("../config/config");

const headers = {
  Authorization: `Basic ${Buffer.from(API_KEY).toString("base64")}`,
  "Content-Type": "application/json",
  ixcsoft: "listar",
};

async function buscarClientePorCPF(cpf) {
  try {
    const jsonData = {
      qtype: "cliente.cnpj_cpf",
      query: cpf,
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "cliente.id",
      sortorder: "desc",
    };

    console.log("Buscando cliente com CPF:", cpf);
    const response = await axios.post(`${API_URL}/cliente`, jsonData, { headers });
    console.log("Resposta do IXC para buscarClientePorCPF:", response.data);

    return response.data.registros && response.data.registros.length > 0 
      ? response.data.registros[0] 
      : null;
  } catch (error) {
    console.error("Erro ao buscar cliente no IXC:", error.response?.data || error.message);
    throw error;
  }
}

async function buscarLoginPPPoE(clienteId) {
  try {
    const jsonData = {
      qtype: "radusuarios.id_cliente",
      query: clienteId,
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "radusuarios.id",
      sortorder: "desc",
    };

    console.log("Buscando login PPPoE e MAC para clienteId:", clienteId);
    const response = await axios.post(`${API_URL}/radusuarios`, jsonData, { headers });
    console.log("Resposta do IXC para buscarLoginPPPoE:", response.data);

    if (response.data.registros && response.data.registros.length > 0) {
      const registro = response.data.registros[0];
      return {
        login: registro.login,
        mac: registro.onu_mac || registro.mac || "N/A", // Prioriza onu_mac, mas fallback para mac
      };
    }
    return { login: null, mac: "N/A" };
  } catch (error) {
    console.error("Erro ao buscar login PPPoE no IXC:", error.response?.data || error.message);
    return { login: null, mac: "N/A" };
  }
}

async function validarCentralAssinante(cpf, senha) {
  try {
    const cliente = await buscarClientePorCPF(cpf);
    console.log("Cliente retornado pelo IXC:", cliente);

    if (!cliente || cliente.senha !== senha) {
      console.log("Cliente não encontrado ou senha inválida");
      return null;
    }

    const { login, mac } = await buscarLoginPPPoE(cliente.id);
    console.log("Login PPPoE e MAC encontrados:", { login, mac });

    const clienteValidado = {
      id: cliente.id,
      nome: cliente.razao,
      cpf: cliente.cnpj_cpf,
      loginPPPoE: login || "N/A",
      mac: mac, // Adiciona o MAC ao cliente validado
      senha: cliente.senha,
    };
    console.log("Cliente validado:", clienteValidado);

    return clienteValidado;
  } catch (error) {
    console.error("Erro ao validar na Central do Assinante:", error);
    throw error;
  }
}

async function listarEquipamentosFibra(clienteId, loginPPPoE) {
  console.log("Iniciando listarEquipamentosFibra com clienteId:", clienteId, "e loginPPPoE:", loginPPPoE);

  try {
    // Busca novamente os dados de /radusuarios para garantir consistência
    const { login, mac } = await buscarLoginPPPoE(clienteId);
    console.log("Dados encontrados em /radusuarios:", { login, mac });

    if (login && mac !== "N/A") {
      // Retorna o equipamento diretamente a partir de /radusuarios
      const equipamento = {
        id: "N/A", // Pode ser ajustado se houver um ID específico
        login: login,
        mac: mac,
        tipo: "Fibra", // Valor fixo ou ajustável conforme necessidade
        status: "Ativo", // Valor fixo ou ajustável
      };
      console.log("Equipamento encontrado:", equipamento);
      return [equipamento];
    } else {
      console.log("Nenhum MAC encontrado em /radusuarios para clienteId:", clienteId);
    }

    return [];
  } catch (error) {
    console.error("Erro ao listar equipamentos de fibra:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
}

module.exports = { buscarClientePorCPF, validarCentralAssinante, listarEquipamentosFibra };