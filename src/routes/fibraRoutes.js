const express = require("express");
const { getEquipamentosFibra } = require("../controllers/fibraController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/equipamentos", authMiddleware, getEquipamentosFibra);

module.exports = router;