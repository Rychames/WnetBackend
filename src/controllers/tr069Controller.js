const { setWifiSSID, setWifiPassword, getConnectedDevices } = require("../services/tr069Service");
const { listarEquipamentosFibra } = require("../services/ixcService");

async function changeSSID(req, res) {
    const { id: clienteId, mac } = req.user; // Pegar o MAC do token
    const { newSSID } = req.body;
  
    if (!newSSID) {
      return res.status(400).json({ success: false, message: "Novo SSID é obrigatório" });
    }
  
    try {
      await setWifiSSID(mac, newSSID);
      res.status(200).json({ success: true, message: `SSID alterado para ${newSSID}` });
    } catch (error) {
      console.error("Erro ao alterar SSID:", error.message);
      res.status(500).json({ success: false, message: "Erro ao alterar SSID" });
    }
  }
  
  async function changeWifiPassword(req, res) {
    const { id: clienteId, mac } = req.user;
    const { newPassword } = req.body;
  
    if (!newPassword) {
      return res.status(400).json({ success: false, message: "Nova senha é obrigatória" });
    }
  
    try {
      await setWifiPassword(mac, newPassword);
      res.status(200).json({ success: true, message: "Senha Wi-Fi alterada com sucesso" });
    } catch (error) {
      console.error("Erro ao alterar senha Wi-Fi:", error.message);
      res.status(500).json({ success: false, message: "Erro ao alterar senha Wi-Fi" });
    }
  }
  
  async function listConnectedDevices(req, res) {
    const { id: clienteId, mac } = req.user;
  
    try {
      const devices = await getConnectedDevices(mac);
      res.status(200).json({ success: true, devices });
    } catch (error) {
      console.error("Erro ao listar dispositivos conectados:", error.message);
      res.status(500).json({ success: false, message: "Erro ao listar dispositivos conectados" });
    }
  }

module.exports = {
    changeSSID,
    changeWifiPassword,
    listConnectedDevices,
};