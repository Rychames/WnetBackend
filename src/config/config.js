require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 3000,
  API_URL: process.env.API_URL,          // IXC API
  API_KEY: process.env.API_KEY,         // IXC API Key
  JWT_SECRET: process.env.JWT_SECRET || "minhaChaveSecretaMuitoLongaESegura",
  ACS_URL: process.env.ACS_URL,         // URL do ACS (ex.: http://localhost:7557)
  ACS_USERNAME: process.env.ACS_USERNAME, // Usuário do ACS
  ACS_PASSWORD: process.env.ACS_PASSWORD, // Senha do ACS
};