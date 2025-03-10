require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 3000,
  API_URL: process.env.API_URL,
  API_KEY: process.env.API_KEY,
  JWT_SECRET: process.env.JWT_SECRET || "minhaChaveSecretaMuitoLongaESegura",
};