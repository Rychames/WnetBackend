const jwt = require("jsonwebtoken");
const { validarCentralAssinante } = require("../services/ixcService");
const { getDeviceIdByMac, getDeviceModel, getWifiConfig } = require("../services/tr069Service");
const { JWT_SECRET } = require("../config/config");

async function login(req, res) {
  const { cpf, senha } = req.body;

  if (!cpf || !senha) {
    return res.status(400).json({
      success: false,
      message: "CPF e senha são obrigatórios",
    });
  }

  try {
    const cliente = await validarCentralAssinante(cpf, senha);

    if (!cliente) {
      return res.status(401).json({
        success: false,
        message: "CPF ou senha inválidos",
      });
    }

    let equipmentName = "Unknown";
    let wifiConfig = {
      "2.4GHz": { ssid: "Not Available", password: "Not Available" },
      "5GHz": { ssid: "Not Available", password: "Not Available" },
    };

    if (cliente.mac && cliente.mac !== "N/A") {
      const deviceResult = await getDeviceIdByMac(cliente.mac);
      if (deviceResult && deviceResult.id) {
        const modelData = await getDeviceModel(deviceResult);
        equipmentName = modelData.model !== "Unknown" ? modelData.model : "Unknown";
        wifiConfig = await getWifiConfig(deviceResult);
      } else {
        console.log(`Dispositivo não encontrado para MAC ${cliente.mac}`);
      }
    }

    const tokenPayload = {
      id: cliente.id,
      nome: cliente.nome,
      cpf: cliente.cpf,
      loginPPPoE: cliente.loginPPPoE,
      mac: cliente.mac,
    };
    console.log("Payload do token:", tokenPayload);

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "8h" });

    res.status(200).json({
      success: true,
      token,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        cpf: cliente.cpf,
        loginPPPoE: cliente.loginPPPoE,
        mac: cliente.mac,
        equipmentName,
        wifiConfig,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno no servidor",
    });
  }
}

module.exports = { login };