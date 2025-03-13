const { listarFaturasPorCliente, gerarBoleto, gerarPix } = require("../services/ixcService");

async function getFaturas(req, res) {
  const { id: clienteId } = req.user;
  console.log("Buscando faturas para clienteId:", clienteId);

  try {
    const faturas = await listarFaturasPorCliente(clienteId);
    console.log("Faturas encontradas:", faturas);

    if (faturas.length === 0) {
      return res.status(200).json({
        success: true,
        faturas: [],
        message: "Nenhuma fatura encontrada para este cliente",
      });
    }

    res.status(200).json({
      success: true,
      faturas,
    });
  } catch (error) {
    console.error("Erro em getFaturas:", error.message || error);
    res.status(500).json({
      success: false,
      message: "Erro interno ao buscar faturas",
    });
  }
}

async function getBoleto(req, res) {
  const { id: clienteId } = req.user;
  const { id: idFatura } = req.params;
  console.log("Tentando obter dados do boleto", { clienteId, idFatura });

  try {
    const faturas = await listarFaturasPorCliente(clienteId);
    const fatura = faturas.find(f => f.id === idFatura);
    if (!fatura) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para acessar este boleto ou ele não existe",
      });
    }

    const pdfBuffer = await gerarBoleto(idFatura);
    const pdfBase64 = pdfBuffer.toString("base64");

    let pixData = null;
    if (fatura.status === "Aberto") { // Só gerar PIX para faturas abertas
      try {
        pixData = await gerarPix(idFatura);
      } catch (pixError) {
        console.warn(`PIX não gerado para fatura ${idFatura}: ${pixError.message}`);
        pixData = null; // Continuar mesmo com erro no PIX
      }
    } else {
      console.log(`Fatura ${idFatura} está fechada, não gerando PIX`);
    }

    res.status(200).json({
      success: true,
      data: {
        boleto_id: idFatura,
        pdf: pdfBase64,
        pix: pixData,
        codigo_barras: fatura.linhaDigitavel !== "N/A" ? fatura.linhaDigitavel : null,
      },
      message: "Dados do boleto gerados com sucesso",
    });
  } catch (error) {
    console.error("Erro em getBoleto:", error.message || error);
    res.status(error.message === "Retorno não é um PDF válido" ? 400 : 500).json({
      success: false,
      message: error.message || "Erro interno ao gerar boleto",
    });
  }
}

module.exports = { getFaturas, getBoleto };