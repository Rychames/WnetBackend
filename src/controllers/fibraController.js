const { listarEquipamentosFibra } = require("../services/ixcService");

async function getEquipamentosFibra(req, res) {
  const { id: clienteId, loginPPPoE } = req.user;
  console.log("Token decodificado em getEquipamentosFibra:", req.user);

  console.log("Iniciando getEquipamentosFibra para clienteId:", clienteId, "e loginPPPoE:", loginPPPoE);

  try {
    const equipamentos = await listarEquipamentosFibra(clienteId, loginPPPoE);

    if (!equipamentos || equipamentos.length === 0) {
      console.log("Nenhum equipamento encontrado após filtragem");
      return res.status(404).json({
        success: false,
        message: "Nenhum equipamento de fibra encontrado para este cliente",
      });
    }

    const equipamentosFormatados = equipamentos.map(equip => {
      const formatted = {
        id: equip.id,
        mac: equip.mac || equip.serial || equip.mac_address || equip.onu_mac || "N/A",
        login: equip.login || "N/A",
        tipo: equip.tipo || "Desconhecido",
        status: equip.status || "N/A",
      };
      console.log("Equipamento formatado:", formatted);
      return formatted;
    });

    console.log("Enviando resposta com equipamentos:", equipamentosFormatados);
    res.status(200).json({
      success: true,
      equipamentos: equipamentosFormatados,
    });
  } catch (error) {
    console.error("Erro em getEquipamentosFibra:", error.message || error);
    res.status(500).json({
      success: false,
      message: "Erro interno ao buscar equipamentos",
    });
  }
}

module.exports = { getEquipamentosFibra };