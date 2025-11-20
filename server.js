const express = require('express');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');

const app = express();
// Rate limiting: máximo 100 requests por IP cada 15 minutos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite por IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);
const PORT = process.env.PORT || 3000;

// Middleware de compresión gzip
app.use(compression());

// Servir archivos estáticos con cache
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  etag: false
}));

// Endpoint básico
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en puerto ${PORT}`);
});
