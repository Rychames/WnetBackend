const express = require("express");
const { changeSSID, changeWifiPassword, listConnectedDevices } = require("../controllers/tr069Controller");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/wifi/ssid", authMiddleware, changeSSID);
router.post("/wifi/password", authMiddleware, changeWifiPassword);
router.get("/wifi/devices", authMiddleware, listConnectedDevices);

module.exports = router;