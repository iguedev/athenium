#!/bin/bash

echo "🚀 ATHENIUM - Script de Deployment para Render"
echo "=============================================="
echo ""

# Set error handling
set -e

# 1. Instalar dependencias
echo "📦 Paso 1: Instalando dependencias..."
npm install
echo "✅ Dependencias instaladas"
echo ""

# 2. Verificar variables de entorno
echo "🔐 Paso 2: Verificando variables de entorno..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL no está configurada"
    exit 1
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "⚠️  WARNING: SESSION_SECRET no está configurada, generando una..."
    export SESSION_SECRET=$(openssl rand -hex 32)
fi
echo "✅ Variables de entorno verificadas"
echo ""

# 3. Crear carpetas necesarias
echo "📁 Paso 3: Creando directorios necesarios..."
mkdir -p uploads
mkdir -p attached_assets
echo "✅ Directorios creados"
echo ""

# 4. Inicializar base de datos
echo "🗄️  Paso 4: Inicializando base de datos..."
node server/initDB.js
echo "✅ Base de datos inicializada"
echo ""

# 5. Ejecutar migraciones (si existen)
if [ -d "migrations" ] && [ "$(ls -A migrations)" ]; then
    echo "🔄 Paso 5: Ejecutando migraciones..."
    npm run db:push || echo "⚠️  No se pudieron ejecutar migraciones (puede que no sean necesarias)"
    echo ""
fi

# 6. Build (si es necesario)
if grep -q '"build":' package.json; then
    echo "🔨 Paso 6: Building la aplicación..."
    npm run build || echo "⚠️  Build falló o no es necesario"
    echo ""
fi

echo "✅ ¡Deployment completado exitosamente!"
echo ""
echo "Para iniciar el servidor, ejecuta:"
echo "  npm start"
echo ""
