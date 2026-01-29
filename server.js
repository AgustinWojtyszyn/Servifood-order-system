import bodyParser from 'body-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import path from 'path';
import cluster from 'cluster';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendDailyOrdersExcel } from './sendDailyOrdersEmail.js';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const PORT = process.env.PORT || 3000;
const numCPUs = os.cpus().length;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');
const assetsPath = path.join(distPath, 'assets');

const setNoStoreHeaders = (res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};

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

  // Supabase backend client (prefiere service role)
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  const supabase = SUPABASE_URL
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    : null;

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

  // --- Health check con auditoría liviana ---
  app.get('/health', async (req, res) => {
    const start = Date.now();
    let ok = true;
    let supabaseOk = null;
    let errorMessage = null;

    if (supabase) {
      try {
        // Ping minimal a Supabase (HEAD-equivalente)
        const { error } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .limit(1);
        if (error) {
          ok = false;
          supabaseOk = false;
          errorMessage = error.message;
        } else {
          supabaseOk = true;
        }
      } catch (e) {
        ok = false;
        supabaseOk = false;
        errorMessage = e?.message || 'Supabase ping failed';
      }
    }

    const latencyMs = Date.now() - start;
    const requestId = req.header('x-request-id') || crypto.randomUUID();
    const ip = (req.header('x-forwarded-for')?.split(',')[0] || req.socket?.remoteAddress || null);
    const ua = req.header('user-agent') || null;

    res.status(ok ? 200 : 503).json({
      ok,
      supabase_ok: supabaseOk,
      ts: new Date().toISOString(),
      latency_ms: latencyMs,
      request_id: requestId
    });

    // Loguear en background (best-effort) como telemetría/auditoría
    if (supabase) {
      supabase
        .from('audit_logs')
        .insert([{
          action: 'health_probe',
          details: ok ? 'Health OK' : `Health degraded: ${errorMessage || 'unknown'}`,
          actor_name: 'health-endpoint',
          target_name: 'telemetry',
          metadata: {
            latency_ms: latencyMs,
            path: req.path,
            method: req.method,
            status_code: ok ? 200 : 503,
            request_id: requestId,
            ip,
            user_agent: ua,
            supabase_ok: supabaseOk
          },
          created_at: new Date().toISOString()
        }])
        .catch(() => {}); // No romper health
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



  // Servir assets estáticos versionados con cache largo e immutable
  app.use('/assets', express.static(assetsPath, {
    maxAge: '1y',
    immutable: true,
    etag: true,
    index: false,
    fallthrough: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }));

  // Manifest y service worker siempre sin cache
  app.get(['/manifest.json', '/manifest.webmanifest', '/service-worker.js'], (req, res, next) => {
    const fileName = req.path === '/manifest.json' || req.path === '/manifest.webmanifest'
      ? (fs.existsSync(path.join(distPath, 'manifest.webmanifest')) ? 'manifest.webmanifest' : 'manifest.json')
      : 'service-worker.js';
    const filePath = path.join(distPath, fileName);
    setNoStoreHeaders(res);
    res.sendFile(filePath, (err) => {
      if (err) next();
    });
  });

  // Archivos sueltos (robots, sitemap, etc) con cache corto
  app.use((req, res, next) => {
    if (req.url.startsWith('/api') || req.url === '/' || /^\/(assets|manifest(\.json|\.webmanifest)?|service-worker\.js)/.test(req.url)) {
      return next();
    }
    express.static(distPath, {
      maxAge: '1h',
      etag: true,
      index: false,
      fallthrough: true
    })(req, res, next);
  });

  // Index para raíz explícita sin cache
  app.get(['/', '/index.html'], (req, res) => {
    setNoStoreHeaders(res);
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // Endpoint opcional de diagnóstico de caché (activar con CACHE_DEBUG=1)
  if (process.env.CACHE_DEBUG === '1') {
    app.get('/__cache-debug', (req, res) => {
      let sampleAsset = null;
      try {
        const files = fs.readdirSync(assetsPath).filter((file) =>
          fs.statSync(path.join(assetsPath, file)).isFile()
        );
        sampleAsset = files.length ? `/assets/${files[0]}` : null;
      } catch {
        sampleAsset = null;
      }

      const mimeMap = (p) => {
        const ext = path.extname(p || '').toLowerCase();
        const map = {
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.map': 'application/json',
          '.json': 'application/json',
          '.webmanifest': 'application/manifest+json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.woff2': 'font/woff2'
        };
        return map[ext] || 'application/octet-stream';
      };

      res.json({
        paths: {
          '/': { cache: 'no-store', type: 'text/html' },
          '/index.html': { cache: 'no-store', type: 'text/html' },
          [sampleAsset || '/assets/<hash>.js']: { cache: 'public, max-age=31536000, immutable', type: mimeMap(sampleAsset || '.js') },
          '/manifest.webmanifest': { cache: 'no-store', type: 'application/manifest+json' },
          '/service-worker.js': { cache: 'no-store', type: 'application/javascript' }
        }
      });
    });
  }

  // Si se solicita un archivo con extensión y no existe, devolver 404 sin fallback a index.html
  app.get(/^.+\.[a-zA-Z0-9]+$/, (req, res, next) => {
    res.status(404).type('text/plain').send('Not found');
  });

  // Fallback SPA: cualquier ruta desconocida devuelve index sin cache
  app.get(/^\/(?!api\/|assets\/|manifest(\.json|\.webmanifest)?$|service-worker\.js$).*/, (req, res) => {
    setNoStoreHeaders(res);
    res.sendFile(path.join(distPath, 'index.html'));
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
