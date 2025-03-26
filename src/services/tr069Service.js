const axios = require("axios");
const { ACS_URL, ACS_USERNAME, ACS_PASSWORD } = require("../config/config");

const deviceModels = {
  "1200R": require("../tr069Models/intelbras1200R"),
};

const headers = {
  "Content-Type": "application/json",
  Authorization: `Basic ${Buffer.from(`${ACS_USERNAME}:${ACS_PASSWORD}`).toString("base64")}`,
  "Connection": "keep-alive",
};

const axiosInstance = axios.create({
  timeout: 120000,
  headers,
});

function normalizeMac(mac) {
  if (!mac || typeof mac !== "string") return null;
  return mac.replace(/:/g, "").toLowerCase();
}

function isValidMac(mac) {
  const normalized = normalizeMac(mac);
  return normalized && /^[0-9a-z]{12}$/i.test(normalized) && normalized !== "na";
}

function extractMacFromId(deviceId) {
  if (!deviceId || typeof deviceId !== "string") return null;
  const match = deviceId.match(/^([0-9A-Z]{6})/i);
  return match ? match[1].toLowerCase() : null;
}

async function getDeviceIdByMac(mac) {
  if (!isValidMac(mac)) {
    console.log(`MAC inválido: ${mac}, pulando busca no GenieACS`);
    return null;
  }

  const normalizedMac = normalizeMac(mac);
  try {
    console.log(`Buscando dispositivo com MAC ${normalizedMac} no GenieACS`);
    const macQuery = {
      "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.MACAddress": mac,
    };
    const encodedQuery = encodeURIComponent(JSON.stringify(macQuery));
    const response = await axiosInstance.get(`${ACS_URL}/devices/?query=${encodedQuery}`);
    const devices = response.data;

    console.log(`Resposta da consulta por MAC:`, devices);

    if (devices.length > 0) {
      const device = devices[0];
      console.log(`Dispositivo encontrado por MAC: ${device._id}`);
      return { id: device._id, data: device };
    }

    console.log(`Dispositivo não encontrado por MAC, tentando busca genérica`);
    const allDevicesResponse = await axiosInstance.get(`${ACS_URL}/devices`);
    const allDevices = allDevicesResponse.data;

    const device = allDevices.find((d) => {
      const deviceMac =
        normalizeMac(d["InternetGatewayDevice.DeviceInfo.MACAddress"]?._value) ||
        normalizeMac(d["InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.MACAddress"]?._value) ||
        normalizeMac(d["InternetGatewayDevice.DeviceInfo.SerialNumber"]?._value);
      const idMac = extractMacFromId(d._id);
      return deviceMac === normalizedMac || idMac === normalizedMac || d._id.toLowerCase().includes(normalizedMac);
    });

    if (!device) {
      console.log(`Dispositivo com MAC ${normalizedMac} não encontrado no GenieACS`);
      return null;
    }

    console.log(`Dispositivo encontrado por fallback: ${device._id}`);
    return { id: device._id, data: device };
  } catch (error) {
    console.error("Erro ao buscar dispositivo:", error.message);
    return null;
  }
}

async function getDeviceModel(deviceResult) {
  if (!deviceResult || !deviceResult.data) {
    console.log("Nenhum dado de dispositivo fornecido para getDeviceModel");
    return { model: "Unknown" };
  }

  try {
    const device = deviceResult.data;
    const model = device?.["InternetGatewayDevice.DeviceInfo.ModelName"]?._value || "Unknown";
    return deviceModels[model] ? deviceModels[model] : { model };
  } catch (error) {
    console.error(`Erro ao processar modelo para ${deviceResult.id}:`, error.message);
    return { model: "Unknown" };
  }
}

async function getWifiConfig(deviceResult) {
  if (!deviceResult || !deviceResult.data) {
    console.log("Nenhum dado de dispositivo fornecido para getWifiConfig");
    return {
      "2.4GHz": { ssid: "Not Available", password: "Not Available" },
      "5GHz": { ssid: "Not Available", password: "Not Available" },
    };
  }

  try {
    const device = deviceResult.data;
    const modelData = await getDeviceModel(deviceResult);

    console.log(`Dados do dispositivo ${deviceResult.id}:`, device);

    const wifiConfig = {
      "2.4GHz": {
        ssid: "Not Available",
        password: "Not Available",
      },
      "5GHz": {
        ssid: "Not Available",
        password: "Not Available",
      },
    };

    if (modelData.model === "Intelbras 1200R") {
      wifiConfig["2.4GHz"].ssid =
        device?.["InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.SSID"]?._value || "Not Available";
      wifiConfig["2.4GHz"].password =
        device?.["InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.KeyPassphrase"]?._value || "Not Available";
      wifiConfig["5GHz"].ssid =
        device?.["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID"]?._value || "Not Available";
      wifiConfig["5GHz"].password =
        device?.["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase"]?._value || "Not Available";
    } else {
      const wlanConfigs = Object.keys(device).filter((key) => key.includes("WLANConfiguration"));
      if (wlanConfigs.length > 0) {
        wlanConfigs.forEach((path, index) => {
          const band = index === 0 ? "5GHz" : "2.4GHz";
          wifiConfig[band].ssid = device[path]?.SSID?._value || "Not Available";
          wifiConfig[band].password = device[path]?.KeyPassphrase?._value || "Not Available";
        });
      }
    }

    console.log(`Configuração Wi-Fi retornada para ${deviceResult.id}:`, wifiConfig);
    return wifiConfig;
  } catch (error) {
    console.error(`Erro ao processar wifiConfig para ${deviceResult.id}:`, error.message);
    return {
      "2.4GHz": { ssid: "Not Available", password: "Not Available" },
      "5GHz": { ssid: "Not Available", password: "Not Available" },
    };
  }
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testGenieACSConnection() {
  try {
    console.log(`Testando conexão com o GenieACS em ${ACS_URL}/devices`);
    const response = await axiosInstance.get(`${ACS_URL}/devices`);
    console.log(`Conexão confirmada: ${response.status} - ${response.data.length} dispositivos encontrados`);
    return response.data;
  } catch (error) {
    console.error("Erro ao testar conexão com GenieACS:", error.message);
    return null;
  }
}

async function setPeriodicInformInterval(deviceId, interval) {
  try {
    console.log(`Configurando PeriodicInformInterval para ${interval} segundos no dispositivo ${deviceId}`);
    const response = await axiosInstance.post(`${ACS_URL}/devices/${deviceId}/tasks`, {
      name: "setParameterValues",
      parameterValues: [["InternetGatewayDevice.ManagementServer.PeriodicInformInterval", interval]],
    });
    console.log(`Resposta do GenieACS para PeriodicInformInterval:`, JSON.stringify(response.data, null, 2));
    await delay(10000);
    return true;
  } catch (error) {
    console.error("Erro ao configurar PeriodicInformInterval:", error.message);
    return false;
  }
}

async function getConnectedDevices(mac) {
  try {
    const deviceResult = await getDeviceIdByMac(mac);
    const deviceId = deviceResult?.id;
    console.log(`Dispositivo encontrado: ${deviceId}`);

    const devicesData = await testGenieACSConnection();
    if (!devicesData) throw new Error("Não foi possível conectar ao GenieACS");

    const deviceData = devicesData.find((d) => d._id === deviceId);
    console.log(`Último Inform do dispositivo:`, deviceData?._lastInform || "Desconhecido");

    await setPeriodicInformInterval(deviceId, 60);

    let devices = [];
    console.log("Buscando Hosts diretamente...");
    if (deviceData && deviceData["InternetGatewayDevice.LANDevice.1.Hosts.Host"]) {
      const hosts = deviceData["InternetGatewayDevice.LANDevice.1.Hosts.Host"];
      devices = Object.keys(hosts).map((key) => ({
        ip: hosts[key].IPAddress?._value || "N/A",
        mac: hosts[key].MACAddress?._value || "N/A",
        hostname: hosts[key].HostName?._value || "N/A",
        lastSeen: hosts[key].LastSeen?._value || "Desconhecido",
      }));
      console.log(`Hosts encontrados:`, devices);
    } else {
      console.log("Nenhum Host disponível nos dados do dispositivo.");
    }

    if (devices.length === 0) {
      console.log("Nenhum dispositivo conectado encontrado.");
    } else {
      console.log(`Dispositivos processados (Hosts):`, devices);
    }
    return devices;
  } catch (error) {
    console.error("Erro ao buscar dispositivos:", error.message);
    throw error;
  }
}

async function setWifiSSID(mac, newSSID) {
  try {
    const deviceResult = await getDeviceIdByMac(mac);
    const deviceId = deviceResult?.id;
    console.log(`Alterando SSID para ${newSSID} no dispositivo ${deviceId}`);
    const response = await axiosInstance.post(`${ACS_URL}/devices/${deviceId}/tasks`, {
      name: "setParameterValues",
      parameterValues: [["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID", newSSID]],
    });
    console.log(`Resposta do GenieACS:`, response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao alterar SSID:", error.message);
    throw error;
  }
}

async function setWifiPassword(mac, newPassword) {
  try {
    const deviceResult = await getDeviceIdByMac(mac);
    const deviceId = deviceResult?.id;
    console.log(`Alterando senha Wi-Fi no dispositivo ${deviceId}`);
    const response = await axiosInstance.post(`${ACS_URL}/devices/${deviceId}/tasks`, {
      name: "setParameterValues",
      parameterValues: [["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase", newPassword]],
    });
    console.log(`Resposta do GenieACS:`, response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao alterar senha Wi-Fi:", error.message);
    throw error;
  }
}

module.exports = {
  setWifiSSID,
  setWifiPassword,
  getConnectedDevices,
  getDeviceIdByMac,
  getDeviceModel,
  getWifiConfig,
};