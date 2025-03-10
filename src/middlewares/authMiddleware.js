const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/config");

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Token não fornecido" 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: "Token inválido ou expirado" 
    });
  }
}

module.exports = authMiddleware;