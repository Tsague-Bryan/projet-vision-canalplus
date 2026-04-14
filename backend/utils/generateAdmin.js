const bcrypt = require("bcrypt");

async function createAdminPassword() {
  const password = "admin123"; // le mot de passe que tu veux
  const hash = await bcrypt.hash(password, 10);
  console.log("Mot de passe hashé :", hash);
}

createAdminPassword();
