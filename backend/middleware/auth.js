const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const authHeader = req.headers['authorization']; // récupère le header
  if (!authHeader) return res.status(401).json({ message: "Token manquant" });

  // Extrait le token après "Bearer "
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  next();
} catch (err) {
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token expiré" });
  }
  return res.status(401).json({ message: "Token invalide" });
}

}

module.exports = auth;


