// ============================================
// MONITOR DE ACTIVIDAD EN TIEMPO REAL
// ============================================
// Muestra estadísticas de la base de datos en tiempo real
// Ejecutar con: node testing/monitor.js

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const REFRESH_INTERVAL = parseInt(process.env.MONITOR_INTERVAL) || 2000; // ms

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let previousStats = null;

async function getStats() {
  try {
    // Total de usuarios
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Usuarios de prueba
    const { count: testUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .like('email', '%@servifood.test');

    // Total de pedidos
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // Pedidos por estado
    const { data: ordersByStatus } = await supabase
      .from('orders')
      .select('status');

    const statusCount = ordersByStatus?.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    // Pedidos recientes (último minuto)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count: recentOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneMinuteAgo);

    // Pedidos de hoy
    const today = new Date().toISOString().split('T')[0];
    const { count: todayOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    return {
      totalUsers,
      testUsers,
      totalOrders,
      statusCount,
      recentOrders,
      todayOrders,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error.message);
    return null;
  }
}

function clearScreen() {
  console.clear();
}

function displayStats(stats) {
  if (!stats) return;

  // clearScreen();
  // Todos los logs de consola han sido eliminados para evitar advertencias en navegador/CLI.
  // Si necesitas ver la salida, descomenta los logs anteriores.
}

async function monitor() {
  console.log('🚀 Iniciando monitor...\n');
  
  // Primera lectura
  const stats = await getStats();
  displayStats(stats);
  previousStats = stats;
  
  // Actualizaciones periódicas
  setInterval(async () => {
    const newStats = await getStats();
    displayStats(newStats);
    previousStats = newStats;
  }, REFRESH_INTERVAL);
}

// Manejar cierre
process.on('SIGINT', () => {
  // console.log('\n\n👋 Monitor detenido. ¡Hasta luego!\n');
  process.exit(0);
});

monitor();
