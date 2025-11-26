// ============================================
// SCRIPT DE CREACIÓN MASIVA DE USUARIOS
// ============================================
// Crea usuarios de prueba usando la API Admin de Supabase
// Ejecutar con: node testing/create-test-users.js

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
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Necesitas agregar esto a tu .env
const NUM_USERS = process.env.TEST_USERS_COUNT || 100;

// Verificar configuración
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('Asegúrate de tener VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu .env');
  console.error('El Service Role Key lo encuentras en: Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

// Crear cliente con permisos de admin
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Datos para generar usuarios realistas
const nombres = [
  'Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Carmen', 'Pedro', 'Laura',
  'Miguel', 'Sofia', 'Diego', 'Elena', 'Javier', 'Isabel', 'Fernando',
  'Patricia', 'Roberto', 'Monica', 'Antonio', 'Beatriz', 'Jorge', 'Lucia',
  'Francisco', 'Raquel', 'Manuel', 'Cristina', 'Ricardo', 'Sandra',
  'Alejandro', 'Daniela', 'Pablo', 'Gabriela', 'Sergio', 'Valeria'
];

const apellidos = [
  'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez',
  'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez',
  'Díaz', 'Cruz', 'Morales', 'Reyes', 'Gutiérrez', 'Ortiz',
  'Jiménez', 'Hernández', 'Ruiz', 'Mendoza', 'Castro', 'Vargas'
];

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateUserData(index) {
  const nombre = randomElement(nombres);
  const apellido = randomElement(apellidos);
  const fullName = `${nombre} ${apellido}`;
  const email = `test.user${index}@servifood.test`;
  const password = 'Test123!@#'; // Todos tendrán la misma contraseña para testing
  const role = Math.random() < 0.1 ? 'admin' : 'user'; // 10% admins
  
  return { email, password, fullName, role };
}

async function createTestUser(userData, index, total) {
  try {
    // Crear usuario en auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        full_name: userData.fullName
      }
    });

    if (authError) {
      throw authError;
    }

    // Actualizar el rol en public.users
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: userData.role })
      .eq('id', authData.user.id);

    if (updateError) {
      console.warn(`⚠️  Usuario creado pero no se pudo actualizar el rol: ${userData.email}`);
    }

    console.log(`✅ [${index}/${total}] Usuario creado: ${userData.email} (${userData.role})`);
    return { success: true, user: authData.user };
    
  } catch (error) {
    console.error(`❌ [${index}/${total}] Error creando ${userData.email}:`, error.message);
    return { success: false, error };
  }
}

async function createBatchUsers(startIndex, batchSize, total) {
  const promises = [];
  
  for (let i = 0; i < batchSize; i++) {
    const index = startIndex + i;
    if (index > total) break;
    
    const userData = generateUserData(index);
    promises.push(createTestUser(userData, index, total));
  }
  
  return await Promise.all(promises);
}

async function main() {
  console.log('🚀 Iniciando creación de usuarios de prueba...\n');
  console.log(`📊 Total a crear: ${NUM_USERS} usuarios`);
  console.log("🔑 Password para todos: Test123!@#\n");
  
  const BATCH_SIZE = 10; // Crear 10 usuarios a la vez
  const totalBatches = Math.ceil(NUM_USERS / BATCH_SIZE);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let batch = 0; batch < totalBatches; batch++) {
    const startIndex = batch * BATCH_SIZE + 1;
    console.log(`\n📦 Procesando lote ${batch + 1}/${totalBatches}...`);
    
    const results = await createBatchUsers(startIndex, BATCH_SIZE, NUM_USERS);
    
    successCount += results.filter(r => r.success).length;
    errorCount += results.filter(r => !r.success).length;
    
    // Pequeña pausa entre lotes para no sobrecargar la API
    if (batch < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ RESUMEN DE CREACIÓN DE USUARIOS');
  console.log('='.repeat(50));
  console.log(`✅ Exitosos: ${successCount}`);
  console.log(`❌ Fallidos: ${errorCount}`);
  console.log(`📧 Email pattern: test.user[1-${NUM_USERS}]@servifood.test`);
  console.log("🔑 Password: Test123!@#");
  console.log('='.repeat(50) + '\n');
  
  // Verificar usuarios creados
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .like('email', '%@servifood.test');
  
  console.log(`📊 Total de usuarios de prueba en la BD: ${count}\n`);
}

// Ejecutar
main().catch(console.error);
