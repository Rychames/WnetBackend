const { listarFaturasPorCliente, gerarBoleto } = require("../services/ixcService");

async function getFaturas(req, res) {
  const { id: clienteId } = req.user;
  console.log("Buscando faturas para clienteId:", clienteId); // Log para debug

  try {
    const faturas = await listarFaturasPorCliente(clienteId);
    console.log("Faturas encontradas:", faturas); // Log para debug

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
    console.error("Erro em getFaturas:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno ao buscar faturas",
    });
  }
}

async function getBoleto(req, res) {
  const { id: clienteId } = req.user;
  const { id: idFatura } = req.params;
  console.log("Tentando baixar boleto", { clienteId, idFatura }); // Log para debug

  try {
    const faturas = await listarFaturasPorCliente(clienteId);
    console.log("Faturas do cliente:", faturas); // Log para debug
    const fatura = faturas.find(f => f.id === idFatura);
    if (!fatura) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para acessar este boleto ou ele não existe",
      });
    }

    const pdfBuffer = await gerarBoleto(idFatura);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=boleto_${idFatura}.pdf`);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("Erro em getBoleto:", error);
    res.status(error.message === "Retorno não é um PDF válido" ? 400 : 500).json({
      success: false,
      message: error.message || "Erro interno ao gerar boleto",
    });
  }
}

module.exports = { getFaturas, getBoleto };