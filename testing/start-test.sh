#!/bin/bash
# ============================================
# SCRIPT DE INICIO RÁPIDO PARA PRUEBAS
# ============================================
# Este script te guía en la configuración y ejecución de pruebas

echo "════════════════════════════════════════════════════════════════"
echo "🧪 ASISTENTE DE PRUEBAS DE CARGA - ServiFood"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "../package.json" ]; then
    echo "❌ Error: Ejecuta este script desde la carpeta /testing"
    exit 1
fi

# Verificar archivo .env
if [ ! -f "../.env" ]; then
    echo "⚠️  No se encontró archivo .env"
    echo ""
    read -p "¿Quieres copiar .env.example a .env? (s/n): " respuesta
    if [ "$respuesta" = "s" ]; then
        cp ../.env.example ../.env
        echo "✅ Archivo .env creado"
        echo "⚠️  IMPORTANTE: Edita el archivo .env con tus credenciales de Supabase"
        echo ""
        read -p "Presiona Enter cuando hayas configurado el .env..."
    else
        echo "❌ No se puede continuar sin .env"
        exit 1
    fi
fi

# Verificar dependencias
echo ""
echo "📦 Verificando dependencias..."
cd ..
if [ ! -d "node_modules" ]; then
    echo "⚠️  Dependencias no instaladas"
    read -p "¿Instalar dependencias ahora? (s/n): " respuesta
    if [ "$respuesta" = "s" ]; then
        npm install
    else
        echo "❌ Se necesitan las dependencias instaladas"
        exit 1
    fi
fi
cd testing

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🎯 OPCIONES DE PRUEBA"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "1) Crear usuarios de prueba (necesario primero)"
echo "2) Prueba ligera (10 usuarios, 2 pedidos cada uno)"
echo "3) Prueba media (50 usuarios, 5 pedidos cada uno)"
echo "4) Prueba intensa (200 usuarios, 10 pedidos cada uno)"
echo "5) Prueba extrema (500 usuarios, 5 pedidos cada uno)"
echo "6) Monitor en tiempo real"
echo "7) Personalizada"
echo "0) Salir"
echo ""
read -p "Selecciona una opción: " opcion

case $opcion in
    1)
        echo ""
        read -p "¿Cuántos usuarios crear? [100]: " num_users
        num_users=${num_users:-100}
        echo "🚀 Creando $num_users usuarios..."
        TEST_USERS_COUNT=$num_users node create-test-users.js
        ;;
    2)
        echo ""
        echo "🚀 Ejecutando prueba ligera..."
        npm run test:load-light
        ;;
    3)
        echo ""
        echo "🚀 Ejecutando prueba media..."
        npm run test:load-medium
        ;;
    4)
        echo ""
        echo "🚀 Ejecutando prueba intensa..."
        npm run test:load-heavy
        ;;
    5)
        echo ""
        echo "⚠️  ADVERTENCIA: Esta prueba puede ser muy exigente"
        read -p "¿Continuar? (s/n): " confirmar
        if [ "$confirmar" = "s" ]; then
            echo "🚀 Ejecutando prueba extrema..."
            npm run test:load-extreme
        fi
        ;;
    6)
        echo ""
        echo "🚀 Iniciando monitor (Ctrl+C para salir)..."
        npm run monitor
        ;;
    7)
        echo ""
        read -p "Usuarios concurrentes: " users
        read -p "Pedidos por usuario: " orders
        read -p "Delay entre pedidos (ms) [500]: " delay
        delay=${delay:-500}
        echo "🚀 Ejecutando prueba personalizada..."
        CONCURRENT_USERS=$users ORDERS_PER_USER=$orders DELAY_MS=$delay node load-test.js
        ;;
    0)
        echo "👋 ¡Hasta luego!"
        exit 0
        ;;
    *)
        echo "❌ Opción no válida"
        exit 1
        ;;
esac

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Proceso completado"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "💡 Tips:"
echo "   - Usa el monitor para ver actividad en tiempo real"
echo "   - Revisa testing/README.md para más información"
echo "   - Verifica los resultados en Supabase Dashboard"
echo ""
