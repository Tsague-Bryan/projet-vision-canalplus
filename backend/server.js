// server.js
const express = require('express');
const cors = require('cors');
require("dotenv").config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// Import des routes
const authRoutes = require("./routes/auth");
const dashboardRoutes = require('./routes/dashboard');
const reabonnementRoutes = require("./routes/reabonnement");
const adminRoutes = require("./routes/admin");
const abonneRoutes = require("./routes/abonne");
const withdrawRoutes = require("./routes/withdraw");

const app = express();
app.use(cors());
app.use(express.json());

// Création du serveur HTTP pour Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // ou mettre l'URL de ton frontend
    methods: ["GET", "POST"]
  }
});

// Middleware pour injecter io dans les routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Définition des routes
const invoicesDir = path.join(__dirname, 'invoices');
if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });
app.use('/invoices', express.static(invoicesDir));

app.use('/auth', authRoutes);
app.use('/api', dashboardRoutes);
app.use("/api/reabonnement", reabonnementRoutes);
app.use("/api", adminRoutes);
app.use("/api/abonne", abonneRoutes);
app.use("/api/partner", withdrawRoutes);
app.use("/api", require("./routes/abonnements"));

// Gestion des connexions Socket.io
io.on('connection', (socket) => {
  console.log(`Nouvelle connexion Socket.io : ${socket.id}`);

  // Éventuellement gérer les événements spécifiques ici
  socket.on('disconnect', () => {
    console.log(`Déconnexion Socket.io : ${socket.id}`);
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
