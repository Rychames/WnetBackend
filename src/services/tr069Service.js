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
    timeout: 120000, // 120 segundos
    headers,
});

async function getDeviceIdByMac(mac) {
    try {
        console.log(`Buscando dispositivo com MAC ${mac} no GenieACS`);
        const response = await axiosInstance.get(`${ACS_URL}/devices`);
        const devices = response.data;
        const device = devices.find((d) => d["_id"].includes(mac));
        if (!device) {
            throw new Error(`Dispositivo com MAC ${mac} não encontrado no GenieACS`);
        }
        console.log(`Dispositivo encontrado: ${device._id}`);
        return device._id;
    } catch (error) {
        console.error("Erro ao buscar dispositivo:", error.message);
        throw error;
    }
}

async function getDeviceModel(deviceId) {
    return deviceModels["1200R"];
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
        await delay(10000); // Esperar 10 segundos para o dispositivo processar
        return true;
    } catch (error) {
        console.error("Erro ao configurar PeriodicInformInterval:", error.message);
        return false;
    }
}

async function getConnectedDevices(mac) {
    try {
        // Buscar o ID do dispositivo pelo MAC
        const deviceId = await getDeviceIdByMac(mac);
        console.log(`Dispositivo encontrado: ${deviceId}`);

        // Testar conexão com o GenieACS e obter dados dos dispositivos
        const devicesData = await testGenieACSConnection();
        if (!devicesData) throw new Error("Não foi possível conectar ao GenieACS");

        // Encontrar os dados do dispositivo específico
        const deviceData = devicesData.find((d) => d._id === deviceId);
        console.log(`Último Inform do dispositivo:`, deviceData?._lastInform || "Desconhecido");

        // Configurar PeriodicInformInterval (mantido como boa prática)
        await setPeriodicInformInterval(deviceId, 60);

        // Buscar Hosts diretamente dos dados do dispositivo
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

        // Exibir resultado
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
        const deviceId = await getDeviceIdByMac(mac); // Função que busca o ID do dispositivo pelo MAC
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
        const deviceId = await getDeviceIdByMac(mac);
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
};