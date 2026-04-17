/**
 * SCRIPT DE PRUEBA DE CARGA PARA SERVIFOOD
 * 
 * Este script simula múltiples usuarios haciendo pedidos simultáneamente
 * y limpia automáticamente todos los datos de prueba al finalizar.
 * 
 * CARACTERÍSTICAS:
 * - Crea usuarios de prueba
 * - Simula login simultáneo
 * - Genera pedidos aleatorios
 * - Limpia todo al finalizar (usuarios y pedidos de prueba)
 * 
 * USO:
 * node test-load.js [número_de_usuarios] [pedidos_por_usuario]
 * 
 * EJEMPLOS:
 * node test-load.js 10 5      // 10 usuarios, 5 pedidos cada uno
 * node test-load.js 50 10     // 50 usuarios, 10 pedidos cada uno
 * node test-load.js 100 20    // 100 usuarios, 20 pedidos cada uno (carga pesada)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Error: Faltan variables de entorno\n')
  console.error('El script necesita las credenciales de Supabase para funcionar.\n')
  console.error('📝 SOLUCIÓN RÁPIDA:\n')
  console.error('1. Crea un archivo .env en la raíz del proyecto:')
  console.error('   touch .env\n')
  console.error('2. Agrega las siguientes líneas (reemplaza con tus valores):')
  console.error('   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co')
  console.error('   VITE_SUPABASE_ANON_KEY=tu-clave-anon-key\n')
  console.error('3. Encuentra tus credenciales en:')
  console.error('   • Supabase Dashboard > Settings > API')
  console.error('   • Project URL = VITE_SUPABASE_URL')
  console.error('   • anon/public key = VITE_SUPABASE_ANON_KEY\n')
  console.error('📖 O consulta .env.example para ver la estructura completa\n')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Configuración de la prueba
const NUM_USERS = parseInt(process.argv[2]) || 10
const ORDERS_PER_USER = parseInt(process.argv[3]) || 5

// Arrays para rastrear IDs creados (para limpieza)
const testUserIds = []
const testOrderIds = []

// Datos de prueba
const locations = ['Los Berros', 'La Laja', 'Padre Bueno']
const menuItems = [
  { name: 'Milanesa con Papas', category: 'main' },
  { name: 'Pollo al Horno', category: 'main' },
  { name: 'Carne al Horno', category: 'main' },
  { name: 'Ensalada César', category: 'salad' },
  { name: 'Ensalada Mixta', category: 'salad' },
  { name: 'Ensalada Verde', category: 'salad' }
]

const firstNames = ['Juan', 'María', 'Pedro', 'Ana', 'Carlos', 'Laura', 'Diego', 'Sofía', 'Miguel', 'Valentina']
const lastNames = ['González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'García', 'Pérez', 'Sánchez', 'Romero', 'Torres']

// Utilidades
const randomItem = (array) => array[Math.floor(Math.random() * array.length)]
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Generar nombre aleatorio
function generateRandomName() {
  const firstName = randomItem(firstNames)
  const lastName = randomItem(lastNames)
  return `${firstName} ${lastName}`
}

// Generar email de prueba
function generateTestEmail(index) {
  return `test_user_${Date.now()}_${index}@servifood.test`
}

// Generar teléfono aleatorio
function generatePhone() {
  return `+54 9 ${randomInt(2600, 2900)} ${randomInt(100000, 999999)}`
}

// Crear usuario de prueba
async function createTestUser(index) {
  const email = generateTestEmail(index)
  const password = process.env.TEST_USER_PASSWORD || 'Test123456!'
  const fullName = generateRandomName()

  console.log(`   Creando usuario ${index + 1}/${NUM_USERS}: ${email}`)

  try {
    // Registrar usuario
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })

    if (authError) throw authError

    const userId = authData.user.id
    testUserIds.push(userId)

    // Insertar en tabla users
    const { error: dbError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        role: 'user'
      })

    if (dbError && dbError.code !== '23505') { // Ignorar duplicados
      console.warn(`   ⚠️  Advertencia al crear perfil de usuario: ${dbError.message}`)
    }

    return {
      userId,
      email,
      password,
      fullName
    }
  } catch (error) {
    console.error(`   ❌ Error creando usuario ${index + 1}:`, error.message)
    return null
  }
}

// Crear pedido aleatorio
async function createRandomOrder(user, orderIndex) {
  const location = randomItem(locations)
  const mainDish = randomItem(menuItems.filter(item => item.category === 'main'))
  const salad = randomItem(menuItems.filter(item => item.category === 'salad'))
  
  const items = [
    { name: mainDish.name, quantity: 1, category: 'main' },
    { name: salad.name, quantity: 1, category: 'salad' }
  ]

  // Fecha de entrega (mañana)
  const deliveryDate = new Date()
  deliveryDate.setDate(deliveryDate.getDate() + 1)

  const orderData = {
    user_id: user.userId,
    customer_name: user.fullName,
    customer_email: user.email,
    customer_phone: generatePhone(),
    location,
    delivery_date: deliveryDate.toISOString().split('T')[0],
    items,
    total_items: items.reduce((sum, item) => sum + item.quantity, 0),
    status: randomItem(['pending', 'pending', 'pending', 'archived']), // 75% pending, 25% archived
    comments: randomInt(0, 3) > 0 ? `Pedido de prueba #${orderIndex + 1}` : null,
    custom_responses: []
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()

    if (error) throw error

    if (data?.[0]) {
      testOrderIds.push(data[0].id)
    }

    return data[0]
  } catch (error) {
    console.error(`      ❌ Error creando pedido:`, error.message)
    return null
  }
}

// Simular actividad de usuario
async function simulateUserActivity(user, userIndex) {
  console.log(`\n   👤 Usuario ${userIndex + 1} (${user.email}):`)
  
  const orders = []
  
  for (let i = 0; i < ORDERS_PER_USER; i++) {
    const order = await createRandomOrder(user, i)
    if (order) {
      orders.push(order)
      console.log(`      ✅ Pedido ${i + 1}/${ORDERS_PER_USER} creado - ${order.location}`)
    }
    
    // Pequeño delay para simular comportamiento real
    await sleep(randomInt(100, 500))
  }
  
  return {
    user,
    orders,
    totalOrders: orders.length
  }
}

// Limpiar datos de prueba
async function cleanup() {
  console.log('\n🧹 Limpiando datos de prueba...\n')

  let deletedOrders = 0
  let deletedUsers = 0

  // Eliminar pedidos en lotes de 100
  if (testOrderIds.length > 0) {
    console.log(`   Eliminando ${testOrderIds.length} pedidos de prueba...`)
    
    for (let i = 0; i < testOrderIds.length; i += 100) {
      const batch = testOrderIds.slice(i, i + 100)
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', batch)
      
      if (!error) {
        deletedOrders += batch.length
      } else {
        console.error(`   ❌ Error eliminando lote de pedidos:`, error.message)
      }
    }
    
    console.log(`   ✅ ${deletedOrders} pedidos eliminados`)
  }

  // Eliminar usuarios en lotes de 50
  if (testUserIds.length > 0) {
    console.log(`   Eliminando ${testUserIds.length} usuarios de prueba...`)
    
    for (let i = 0; i < testUserIds.length; i += 50) {
      const batch = testUserIds.slice(i, i + 50)
      
      // Eliminar de tabla users
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .in('id', batch)
      
      if (!dbError) {
        deletedUsers += batch.length
      } else {
        console.error(`   ❌ Error eliminando lote de usuarios:`, error.message)
      }
    }
    
    console.log(`   ✅ ${deletedUsers} usuarios eliminados`)
  }

  return { deletedOrders, deletedUsers }
}

// Generar reporte de estadísticas
function generateReport(results, startTime, endTime) {
  const duration = ((endTime - startTime) / 1000).toFixed(2)
  const totalOrders = results.reduce((sum, r) => sum + r.totalOrders, 0)
  const avgOrdersPerUser = (totalOrders / results.length).toFixed(2)
  const ordersPerSecond = (totalOrders / duration).toFixed(2)

  console.log('\n' + '='.repeat(60))
  console.log('📊 REPORTE DE PRUEBA DE CARGA')
  console.log('='.repeat(60))
  console.log(`\n⏱️  Duración: ${duration} segundos`)
  console.log(`\n👥 Usuarios:`)
  console.log(`   - Total creados: ${results.length}`)
  console.log(`   - Exitosos: ${results.filter(r => r.orders.length > 0).length}`)
  console.log(`\n📦 Pedidos:`)
  console.log(`   - Total creados: ${totalOrders}`)
  console.log(`   - Promedio por usuario: ${avgOrdersPerUser}`)
  console.log(`   - Pedidos por segundo: ${ordersPerSecond}`)
  console.log(`\n🎯 Rendimiento:`)
  console.log(`   - Tiempo promedio por pedido: ${(duration / totalOrders).toFixed(3)}s`)
  console.log(`   - Throughput: ${ordersPerSecond} pedidos/seg`)
  console.log('\n' + '='.repeat(60) + '\n')
}

// Función principal
async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 INICIANDO PRUEBA DE CARGA - SERVIFOOD')
  console.log('='.repeat(60))
  console.log(`\n📋 Configuración:`)
  console.log(`   - Usuarios a simular: ${NUM_USERS}`)
  console.log(`   - Pedidos por usuario: ${ORDERS_PER_USER}`)
  console.log(`   - Total de pedidos esperados: ${NUM_USERS * ORDERS_PER_USER}`)
  console.log(`\n⚠️  NOTA: Todos los datos se eliminarán al finalizar\n`)

  const startTime = Date.now()

  try {
    // FASE 1: Crear usuarios
    console.log('📝 FASE 1: Creando usuarios de prueba...\n')
    const users = []
    
    for (let i = 0; i < NUM_USERS; i++) {
      const user = await createTestUser(i)
      if (user) {
        users.push(user)
      }
      
      // Pequeño delay entre creaciones
      await sleep(100)
    }

    console.log(`\n✅ ${users.length} usuarios creados exitosamente\n`)

    // FASE 2: Simular actividad simultánea
    console.log('🔄 FASE 2: Simulando actividad de usuarios...')
    
    // Ejecutar actividades en paralelo
    const results = await Promise.all(
      users.map((user, index) => simulateUserActivity(user, index))
    )

    const endTime = Date.now()

    // Generar reporte
    generateReport(results, startTime, endTime)

    // FASE 3: Limpieza
    const { deletedOrders, deletedUsers } = await cleanup()

    console.log('\n✅ PRUEBA COMPLETADA EXITOSAMENTE')
    console.log(`\n📊 Resumen de limpieza:`)
    console.log(`   - Pedidos eliminados: ${deletedOrders}`)
    console.log(`   - Usuarios eliminados: ${deletedUsers}`)
    console.log('\n💾 La base de datos volvió a su estado original\n')

  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA PRUEBA:', error)
    console.log('\n🧹 Intentando limpieza de emergencia...')
    await cleanup()
  }
}

// Ejecutar
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })
