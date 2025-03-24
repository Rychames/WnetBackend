module.exports = {
    model: "Intelbras 1200R",
    productClass: "1200R",
    hardwareVersion: "PON1200R_v3.0",
    parameters: {
      ssid: "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID", // 5 GHz
      password: "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase", // 5 GHz
      connectedDevices: [
        "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDevice.{i}.AssociatedDeviceIPAddress",
        "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDevice.{i}.AssociatedDeviceMACAddress",
        "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDevice.{i}.X_ITBS_WLAN_ClientMode",
      ],
      connectedDevices24GHz: [
        "InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.AssociatedDevice.{i}.AssociatedDeviceIPAddress",
        "InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.AssociatedDevice.{i}.AssociatedDeviceMACAddress",
        "InternetGatewayDevice.LANDevice.1.WLANConfiguration.6.AssociatedDevice.{i}.X_ITBS_WLAN_ClientMode",
      ],
    },
  };