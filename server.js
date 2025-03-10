require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { PORT } = require("./src/config/config");
const authRoutes = require("./src/routes/authRoutes");
const fibraRoutes = require("./src/routes/fibraRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/fibra", fibraRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Rota não encontrada" });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});