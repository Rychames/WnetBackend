const axios = require("axios");
const QRCode = require("qrcode");
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
        mac: registro.onu_mac || registro.mac || "N/A",
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
      mac: mac,
      senha: cliente.senha,
    };
    console.log("Cliente validado:", clienteValidado);

    return clienteValidado;
  } catch (error) {
    console.error("Erro ao validar na Central do Assinante:", error.message || error);
    throw error;
  }
}

async function listarEquipamentosFibra(clienteId, loginPPPoE) {
  console.log("Iniciando listarEquipamentosFibra com clienteId:", clienteId, "e loginPPPoE:", loginPPPoE);

  try {
    const { login, mac } = await buscarLoginPPPoE(clienteId);
    console.log("Dados encontrados em /radusuarios:", { login, mac });

    if (login && mac !== "N/A") {
      const equipamento = {
        id: "N/A",
        login: login,
        mac: mac,
        tipo: "Fibra",
        status: "Ativo",
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

async function listarFaturasPorCliente(clienteId) {
  let allFaturas = [];
  let page = 1;
  const rp = 100;

  try {
    while (true) {
      const jsonData = {
        qtype: "fn_areceber.id_cliente",
        query: clienteId,
        oper: "=",
        page: page.toString(),
        rp: rp.toString(),
        sortname: "fn_areceber.data_vencimento",
        sortorder: "asc", // Ordem ascendente para priorizar próximas vencimentos
      };

      const response = await axios.post(`${API_URL}/fn_areceber`, jsonData, { headers });
      const data = response.data;

      if (!data.registros || data.registros.length === 0) break;

      allFaturas = allFaturas.concat(data.registros);
      if (allFaturas.length >= parseInt(data.total)) break;

      page++;
    }

    const dataAtual = new Date(); // 18/03/2025
    const mesAtual = dataAtual.getMonth(); // 2 (março)
    const anoAtual = dataAtual.getFullYear(); // 2025

    const faturasMapeadas = allFaturas.map(fatura => {
      const dataVencimento = new Date(fatura.data_vencimento);
      let statusFatura;

      if (fatura.status === "R") {
        statusFatura = "Fechado";
      } else if (fatura.status === "A" && dataVencimento < dataAtual) {
        statusFatura = "Atrasado";
      } else if (fatura.status === "A") {
        statusFatura = "Aberto";
      } else {
        statusFatura = "Aberto";
      }

      return {
        id: fatura.id,
        dataEmissao: fatura.data_emissao,
        dataVencimento: fatura.data_vencimento,
        valor: fatura.valor,
        status: statusFatura,
        linhaDigitavel: fatura.linha_digitavel || null,
      };
    });

    // Filtrar fatura do mês atual (março de 2025)
    const faturaMesAtual = faturasMapeadas.find(fatura => {
      const vencimento = new Date(fatura.dataVencimento);
      return vencimento.getMonth() === mesAtual && vencimento.getFullYear() === anoAtual;
    });

    // Ordenar: 
    // 1. Fatura do mês atual (se existir)
    // 2. Próxima fatura a vencer (ordem ascendente)
    // 3. Demais faturas em ordem ascendente
    const faturasOrdenadas = faturasMapeadas.sort((a, b) => {
      const dataA = new Date(a.dataVencimento);
      const dataB = new Date(b.dataVencimento);

      // Priorizar fatura do mês atual
      if (faturaMesAtual && a.id === faturaMesAtual.id) return -1;
      if (faturaMesAtual && b.id === faturaMesAtual.id) return 1;

      // Ordenar por data de vencimento ascendente
      return dataA - dataB;
    });

    return faturasOrdenadas;
  } catch (error) {
    console.error("Erro ao listar faturas:", error.response?.data || error.message);
    throw error;
  }
}

async function gerarBoleto(idFatura) {
  const jsonData = {
    boletos: idFatura,
    juro: "",
    multa: "",
    atualiza_boleto: "S",
    tipo_boleto: "arquivo",
    base64: "S",
    layout_impressao: "",
  };

  try {
    console.log(`Gerando boleto para fatura ${idFatura}`);
    const response = await axios.post(`${API_URL}/get_boleto`, jsonData, { headers });
    const boletoData = response.data;

    let base64String;
    if (typeof boletoData === "string") {
      base64String = boletoData;
    } else if (boletoData && boletoData.boleto) {
      base64String = boletoData.boleto;
    } else {
      console.warn(`Nenhum PDF retornado para fatura ${idFatura}`);
      return null;
    }

    if (!base64String.startsWith("JVBERi")) {
      console.warn(`Retorno para fatura ${idFatura} não é um PDF válido`);
      return null;
    }

    return Buffer.from(base64String, "base64");
  } catch (error) {
    console.error(`Erro ao gerar boleto para fatura ${idFatura}:`, error.response?.data || error.message);
    return null;
  }
}

async function gerarPix(idFatura) {
  const jsonData = {
    id_areceber: idFatura,
  };

  try {
    console.log(`Gerando PIX para fatura ${idFatura} com dados:`, jsonData);
    const response = await axios.post(`${API_URL}/get_pix`, jsonData, { headers });
    const pixData = response.data;

    console.log("Resposta da API PIX:", pixData);

    if (!pixData || pixData.type !== "success" || !pixData.pix) {
      console.warn(`PIX não disponível para fatura ${idFatura}`);
      return null;
    }

    const qrCodeBase64 = await QRCode.toDataURL(pixData.pix.qrCode.qrcode, {
      type: "image/png",
      margin: 1,
      width: 250,
    });
    const base64Image = qrCodeBase64.split(',')[1];

    return {
      chave: pixData.pix.qrCode.qrcode,
      qrCodeBase64: base64Image,
    };
  } catch (error) {
    console.error(`Erro ao gerar PIX para fatura ${idFatura}:`, error.response?.data || error.message);
    return null;
  }
}

module.exports = { 
  buscarClientePorCPF, 
  validarCentralAssinante, 
  listarEquipamentosFibra, 
  listarFaturasPorCliente, 
  gerarBoleto,
  gerarPix,
};