const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
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
