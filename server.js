import bodyParser from 'body-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import path from 'path';
import cluster from 'cluster';
import os from 'os';
import { fileURLToPath } from 'url';
import { sendDailyOrdersExcel } from './sendDailyOrdersEmail.js';

const PORT = process.env.PORT || 3000;
const numCPUs = os.cpus().length;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Content Security Policy alineado con los recursos reales de la app
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://connect.facebook.net https://jsdelivr.net https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "worker-src 'self' blob:"
].join('; ');

if (cluster.isMaster) {
  console.log(`Master PID ${process.pid} - lanzando ${numCPUs} workers`);
  console.log(`[Security] CSP aplicado: ${CONTENT_SECURITY_POLICY}`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} murió. Lanzando uno nuevo...`);
    cluster.fork();
  });
} else {
  const app = express();

  // --- Seguridad: Headers recomendados ---
  app.use((req, res, next) => {
    // Fuerza HTTPS en navegadores compatibles
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    // Política de contenido alineada con los recursos que usa la app (Supabase, fuentes y analytics)
    res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    // Previene clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Previene sniffing de tipo de contenido
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Controla la información del referer
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Limita permisos de APIs del navegador
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
    next();
  });
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




  // Servir assets estáticos con cache largo (1 año) y responder 404 si no existe
  app.use('/assets', express.static(path.join(__dirname, 'dist/assets'), {
    maxAge: '1y',
    immutable: true,
    etag: true,
    fallthrough: false // Si no existe, responde 404
  }));

  // Servir archivos estáticos sueltos (manifest, robots, etc) con cache corto (1 hora) y responder 404 si no existe
  app.use((req, res, next) => {
    if (/^\/assets\//.test(req.url)) return next();
    if (req.url === '/' || req.url.startsWith('/api')) return next();
    express.static(path.join(__dirname, 'dist'), {
      maxAge: '1h',
      etag: true,
      index: false,
      fallthrough: false // Si no existe, responde 404
    })(req, res, next);
  });

  // Servir index.html SOLO para rutas que no sean assets ni archivos estáticos
  app.get(/^\/(?!api|assets\/|manifest\.json$|robots\.txt$|sitemap\.xml$|version\.txt$).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
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
