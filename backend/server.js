// server.js
require("dotenv").config();
const express = require('express');
const cors = require('cors');
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
const technicienRoutes = require("./routes/technicien");
const aiRoutes = require("./routes/ai");

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
const { repairInvoiceHtml } = require('./utils/invoiceHtml');
const invoicesDir = path.join(__dirname, 'invoices');
if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });
app.get('/invoices/:file', (req, res) => {
  const file = path.basename(String(req.params.file || ''));
  if (!/^facture_[\w-]+\.html$/i.test(file)) return res.status(400).send('Facture invalide');
  const fullPath = path.join(invoicesDir, file);
  if (!fs.existsSync(fullPath)) return res.status(404).send('Facture introuvable');
  const html = fs.readFileSync(fullPath, 'utf8');
  return res.set('Content-Type', 'text/html; charset=utf-8').send(repairInvoiceHtml(html));
});
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));


app.use('/auth', authRoutes);
app.use('/api', dashboardRoutes);
app.use("/api/reabonnement", reabonnementRoutes);
app.use("/api", adminRoutes);
app.use("/api/abonne", abonneRoutes);
app.use("/api/partner", withdrawRoutes);
app.use("/api", require("./routes/abonnements"));
app.use("/api/partner", technicienRoutes);
app.use("/api", technicienRoutes);
app.use("/api", aiRoutes);

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
