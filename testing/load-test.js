// ============================================
// SCRIPT DE PRUEBAS DE CARGA - USUARIOS CONCURRENTES
// ============================================
// Simula múltiples usuarios logueándose y creando pedidos simultáneamente
// Ejecutar con: node testing/load-test.js

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

// Configuración
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const CONFIG = {
  numUsers: parseInt(process.env.CONCURRENT_USERS) || 50, // Usuarios concurrentes
  ordersPerUser: parseInt(process.env.ORDERS_PER_USER) || 3, // Pedidos por usuario
  delayBetweenOrders: parseInt(process.env.DELAY_MS) || 500, // ms entre pedidos
  userStartDelay: parseInt(process.env.USER_DELAY_MS) || 100 // ms entre inicio de usuarios
};

// Verificar configuración
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('Asegúrate de tener VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu .env');
  process.exit(1);
}

// Datos para generar pedidos realistas
const ubicaciones = [
  'Av. Libertador 1234, CABA',
  'Calle Corrientes 5678, CABA',
  'Av. Rivadavia 910, CABA',
  'San Martín 234, Vicente López',
  'Belgrano 567, San Isidro',
  'Mitre 890, Olivos',
  'Sarmiento 123, Martinez',
  'Maipú 456, Florida',
  'Santa Fe 789, Palermo',
  'Cabildo 1011, Belgrano'
];

const platosMenu = [
  { name: 'Milanesa con Papas Fritas', price: 2500 },
  { name: 'Empanadas de Carne (docena)', price: 3000 },
  { name: 'Pizza Muzzarella', price: 3500 },
  { name: 'Hamburguesa Completa', price: 2800 },
  { name: 'Ensalada César', price: 2200 },
  { name: 'Pasta Bolognesa', price: 2600 },
  { name: 'Pollo al Horno con Verduras', price: 3200 },
  { name: 'Sándwich de Jamón y Queso', price: 1800 },
  { name: 'Tacos Mexicanos (3 unidades)', price: 2400 },
  { name: 'Sushi Roll (10 piezas)', price: 4000 },
  { name: 'Coca Cola 1.5L', price: 800 },
  { name: 'Agua Mineral 500ml', price: 500 }
];

const comentarios = [
  'Por favor, sin cebolla',
  'Entregar en recepción del edificio',
  'Llamar al llegar',
  'Sin sal adicional',
  'Bien cocido por favor',
  'Con extra de queso',
  '',
  'Dejar en portería'
];

// Utilidades
function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateOrderData(userEmail, userName) {
  // Generar items del pedido (entre 1 y 5 items)
  const numItems = randomInt(1, 5);
  const items = [];
  let totalItems = 0;
  
  for (let i = 0; i < numItems; i++) {
    const plato = randomElement(platosMenu);
    const quantity = randomInt(1, 3);
    items.push({
      name: plato.name,
      price: plato.price,
      quantity: quantity
    });
    totalItems += quantity;
  }
  
  // Generar fecha de entrega (hoy + 1-7 días)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + randomInt(1, 7));
  
  return {
    location: randomElement(ubicaciones),
    customer_name: userName || 'Cliente Test',
    customer_email: userEmail,
    customer_phone: `+54911${randomInt(10000000, 99999999)}`,
    items: items,
    comments: randomElement(comentarios),
    delivery_date: deliveryDate.toISOString().split('T')[0],
    status: 'pending',
    total_items: totalItems
  };
}

// Clase para simular un usuario
class VirtualUser {
  constructor(userIndex, email, password) {
    this.userIndex = userIndex;
    this.email = email;
    this.password = password;
    this.client = null;
    this.session = null;
    this.stats = {
      loginSuccess: false,
      ordersCreated: 0,
      ordersFailed: 0,
      totalTime: 0,
      errors: []
    };
  }
  
  async login() {
    const startTime = Date.now();
    
    try {
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      const { data, error } = await this.client.auth.signInWithPassword({
        email: this.email,
        password: this.password
      });
      
      if (error) throw error;
      
      this.session = data.session;
      this.stats.loginSuccess = true;
      
      const elapsed = Date.now() - startTime;
      
      
      return true;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ [Usuario ${this.userIndex}] Error en login (${elapsed}ms):`, error.message);
      this.stats.errors.push({ action: 'login', error: error.message });
      return false;
    }
  }
  
  async createOrder() {
    if (!this.stats.loginSuccess) {
      console.warn(`⚠️  [Usuario ${this.userIndex}] No puede crear pedido sin login`);
      return false;
    }
    
    const startTime = Date.now();
    
    try {
      // Obtener datos del usuario
      const { data: userData } = await this.client
        .from('users')
        .select('full_name')
        .eq('email', this.email)
        .single();
      
      const orderData = generateOrderData(
        this.email,
        userData?.full_name || 'Usuario Test'
      );
      
      const { data, error } = await this.client
        .from('orders')
        .insert([orderData])
        .select();
      
      if (error) throw error;
      
      this.stats.ordersCreated++;
      
      const elapsed = Date.now() - startTime;
      
      
      return true;
    } catch (error) {
      this.stats.ordersFailed++;
      const elapsed = Date.now() - startTime;
      console.error(`❌ [Usuario ${this.userIndex}] Error creando pedido (${elapsed}ms):`, error.message);
      this.stats.errors.push({ action: 'create_order', error: error.message });
      return false;
    }
  }
  
  async run() {
    const startTime = Date.now();
    
    // Login
    const loginOk = await this.login();
    if (!loginOk) {
      this.stats.totalTime = Date.now() - startTime;
      return this.stats;
    }
    
    // Crear múltiples pedidos
    for (let i = 0; i < CONFIG.ordersPerUser; i++) {
      await this.createOrder();
      
      // Pausa entre pedidos
      if (i < CONFIG.ordersPerUser - 1) {
        await sleep(CONFIG.delayBetweenOrders);
      }
    }
    
    // Logout
    await this.client.auth.signOut();
    
    this.stats.totalTime = Date.now() - startTime;
    return this.stats;
  }
}

// Función principal
async function runLoadTest() {
  
  
  
  
  
  
  
  
  
  const testStartTime = Date.now();
  const users = [];
  const allStats = [];
  
  // Crear y lanzar usuarios de forma escalonada
  for (let i = 1; i <= CONFIG.numUsers; i++) {
    const email = `test.user${i}@servifood.test`;
    const password = 'Test123!@#';
    
    const virtualUser = new VirtualUser(i, email, password);
    users.push(virtualUser);
    
    // Lanzar usuario (no esperar)
    virtualUser.run().then(stats => {
      allStats.push(stats);
    });
    
    // Delay antes de lanzar el siguiente usuario
    if (i < CONFIG.numUsers) {
      await sleep(CONFIG.userStartDelay);
    }
  }
  
  
  
  // Esperar a que todos terminen
  const results = await Promise.all(users.map(u => u.run()));
  
  const totalTime = Date.now() - testStartTime;
  
  // Calcular estadísticas
  const successLogins = results.filter(s => s.loginSuccess).length;
  const totalOrders = results.reduce((sum, s) => sum + s.ordersCreated, 0);
  const totalOrdersFailed = results.reduce((sum, s) => sum + s.ordersFailed, 0);
  const avgUserTime = results.reduce((sum, s) => sum + s.totalTime, 0) / results.length;
  const totalErrors = results.reduce((sum, s) => sum + s.errors.length, 0);
  
  // Mostrar resultados
  
  
  
  
  
  
  
  
  
  
  
  
  // Mostrar errores si los hay
  if (totalErrors > 0) {
    
    results.forEach((stats, index) => {
      if (stats.errors.length > 0) {
        
        stats.errors.forEach(err => {
          
        });
      }
    });
  }
  
  
}

// Ejecutar
runLoadTest().catch(console.error);
