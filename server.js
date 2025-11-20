const bodyParser = require('body-parser');
const { sendDailyOrdersExcel } = require('./sendDailyOrdersEmail');
  app.use(bodyParser.json());
  // Endpoint para enviar pedidos diarios por email
  app.post('/api/send-daily-orders-email', async (req, res) => {
    const { toEmail, orders } = req.body;
    if (!toEmail || !orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: 'Faltan datos o formato incorrecto' });
    }
    try {
      await sendDailyOrdersExcel(toEmail, orders);
      res.json({ success: true });
    } catch (err) {
      console.error('Error enviando email:', err);
      res.status(500).json({ error: 'Error enviando email' });
    }
  });

const express = require('express');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const cluster = require('cluster');
const os = require('os');

const PORT = process.env.PORT || 3000;
const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master PID ${process.pid} - lanzando ${numCPUs} workers`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} murió. Lanzando uno nuevo...`);
    cluster.fork();
  });
} else {
  const app = express();
  // Rate limiting: máximo 1000 requests por IP cada 15 minutos (más permisivo para pruebas de carga)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // límite por IP
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

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

  // Manejo global de errores
  app.use((err, req, res, next) => {
    console.error('Error global:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  process.on('uncaughtException', (err) => {
    console.error('Excepción no capturada:', err);
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Promesa no manejada:', reason);
  });

  app.listen(PORT, () => {
    console.log(`Worker PID ${process.pid} - Servidor Express corriendo en puerto ${PORT}`);
  });
}
