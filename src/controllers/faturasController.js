const { listarFaturasPorCliente, gerarBoleto, gerarPix } = require("../services/ixcService");

async function getFaturas(req, res) {
  const { id: clienteId } = req.user;
  console.log("Buscando faturas para clienteId:", clienteId);

  try {
    const faturas = await listarFaturasPorCliente(clienteId);
    console.log("Faturas encontradas:", faturas);

    res.status(200).json({
      success: true,
      faturas: faturas.length > 0 ? faturas : [],
      message: faturas.length === 0 ? "Nenhuma fatura encontrada para este cliente" : undefined,
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
      return res.status(404).json({
        success: false,
        message: "Fatura não encontrada ou você não tem permissão para acessá-la",
      });
    }

    // Gerar PDF (segunda via)
    let pdfBase64 = null;
    const pdfBuffer = await gerarBoleto(idFatura);
    if (pdfBuffer) {
      pdfBase64 = pdfBuffer.toString("base64");
    }

    // Gerar PIX e QR Code
    let pixData = null;
    pixData = await gerarPix(idFatura);

    // Código de barras (linha digitável)
    const codigoBarras = fatura.linhaDigitavel;

    // Montar resposta
    const responseData = {
      success: true,
      data: {
        boleto_id: idFatura,
        pdf: pdfBase64,
        pix: pixData,
        codigo_barras: codigoBarras,
      },
      message: "Dados do boleto gerados com sucesso",
    };

    // Ajustar mensagem se algum dado estiver faltando
    if (!pdfBase64 && !pixData && !codigoBarras) {
      responseData.success = false;
      responseData.message = "Nenhum dado disponível para esta fatura";
    } else {
      if (!pdfBase64) responseData.message += " (PDF não disponível)";
      if (!pixData) responseData.message += " (PIX não disponível)";
      if (!codigoBarras) responseData.message += " (Código de barras não disponível)";
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Erro em getBoleto:", error.message || error);
    res.status(500).json({
      success: false,
      message: "Erro interno ao gerar boleto",
    });
  }
}

module.exports = { getFaturas, getBoleto };