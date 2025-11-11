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

  clearScreen();
  
  const now = stats.timestamp.toLocaleTimeString('es-AR');
  
  console.log('═'.repeat(70));
  console.log(`📊 MONITOR EN TIEMPO REAL - ServiFood ${now}`);
  console.log('═'.repeat(70));
  console.log();
  
  // Usuarios
  console.log('👥 USUARIOS');
  console.log('─'.repeat(70));
  console.log(`   Total: ${stats.totalUsers}`);
  console.log(`   De prueba: ${stats.testUsers} (${stats.totalUsers > 0 ? ((stats.testUsers/stats.totalUsers)*100).toFixed(1) : 0}%)`);
  console.log();
  
  // Pedidos
  console.log('📦 PEDIDOS');
  console.log('─'.repeat(70));
  console.log(`   Total: ${stats.totalOrders}`);
  console.log(`   Hoy: ${stats.todayOrders}`);
  console.log(`   Último minuto: ${stats.recentOrders} ${stats.recentOrders > 0 ? '🔥' : ''}`);
  
  // Cambios desde la última actualización
  if (previousStats) {
    const newOrders = stats.totalOrders - previousStats.totalOrders;
    const newUsers = stats.totalUsers - previousStats.totalUsers;
    
    if (newOrders > 0 || newUsers > 0) {
      console.log();
      console.log('   ⚡ Cambios recientes:');
      if (newUsers > 0) console.log(`      +${newUsers} usuario(s)`);
      if (newOrders > 0) console.log(`      +${newOrders} pedido(s)`);
    }
  }
  
  console.log();
  
  // Estado de pedidos
  console.log('📊 DISTRIBUCIÓN POR ESTADO');
  console.log('─'.repeat(70));
  
  const statusLabels = {
    pending: '⏳ Pendiente',
    processing: '🔄 En Proceso',
    completed: '✅ Completado',
    delivered: '🚚 Entregado',
    cancelled: '❌ Cancelado'
  };
  
  Object.entries(stats.statusCount || {}).forEach(([status, count]) => {
    const label = statusLabels[status] || status;
    const percentage = stats.totalOrders > 0 ? ((count / stats.totalOrders) * 100).toFixed(1) : 0;
    const bar = '█'.repeat(Math.round(percentage / 2));
    console.log(`   ${label.padEnd(20)} ${count.toString().padStart(5)} (${percentage}%) ${bar}`);
  });
  
  console.log();
  console.log('═'.repeat(70));
  console.log(`⏱️  Actualización cada ${REFRESH_INTERVAL/1000}s | Presiona Ctrl+C para salir`);
  console.log('═'.repeat(70));
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
  console.log('\n\n👋 Monitor detenido. ¡Hasta luego!\n');
  process.exit(0);
});

monitor().catch(console.error);
