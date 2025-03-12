const express = require("express");
const { getEquipamentosFibra } = require("../controllers/fibraController");
const { getFaturas, getBoleto } = require("../controllers/faturasController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/equipamentos", authMiddleware, getEquipamentosFibra);
router.get("/faturas", authMiddleware, getFaturas);
router.get("/faturas/boleto/:id", authMiddleware, getBoleto);

module.exports = router;