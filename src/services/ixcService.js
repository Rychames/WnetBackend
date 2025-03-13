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
        sortname: "fn_areceber.id",
        sortorder: "desc",
      };

      const response = await axios.post(`${API_URL}/fn_areceber`, jsonData, { headers });
      const data = response.data;

      if (!data.registros || data.registros.length === 0) break;

      allFaturas = allFaturas.concat(data.registros);
      if (allFaturas.length >= parseInt(data.total)) break;

      page++;
    }

    return allFaturas.map(fatura => ({
      id: fatura.id,
      dataEmissao: fatura.data_emissao,
      dataVencimento: fatura.data_vencimento,
      valor: fatura.valor,
      status: fatura.status === "A" ? "Aberto" : "Fechado",
      linhaDigitavel: fatura.linha_digitavel || "N/A",
    }));
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
    atualiza_boleto: "",
    tipo_boleto: "arquivo",
    base64: "S",
    layout_impressao: "",
  };

  try {
    const response = await axios.post(`${API_URL}/get_boleto`, jsonData, { headers });
    const boletoData = response.data;

    let base64String;
    if (typeof boletoData === "string") {
      base64String = boletoData;
    } else if (boletoData && boletoData.boleto) {
      base64String = boletoData.boleto;
    } else {
      throw new Error("Boleto não retornado pela API");
    }

    if (!base64String.startsWith("JVBERi")) {
      throw new Error("Retorno não é um PDF válido");
    }

    return Buffer.from(base64String, "base64");
  } catch (error) {
    console.error("Erro ao gerar boleto:", error.response?.data || error.message);
    throw error;
  }
}

async function gerarPix(idFatura) {
  const jsonData = {
    id_areceber: idFatura,
  };

  try {
    console.log(`Gerando PIX para fatura ${idFatura} com dados:`, jsonData);
    const response = await axios.post(`${API_URL}/pix`, jsonData, { headers });
    const pixData = response.data;

    console.log("Resposta da API PIX:", pixData);

    if (!pixData || pixData.type !== "success" || !pixData.pix) {
      throw new Error(`Erro ao gerar PIX: Resposta inválida - ${JSON.stringify(pixData)}`);
    }

    const pixResponse = {
      chave: pixData.pix.qrCode.qrcode,
      qrCodeBase64: pixData.pix.qrCode.imagemQrcode,
    };

    console.log("PIX gerado com sucesso:", pixResponse);
    return pixResponse;
  } catch (error) {
    console.error("Erro ao gerar PIX para fatura", idFatura, ":", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error(`Erro ao gerar PIX: ${error.response?.data?.message || error.message}`);
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