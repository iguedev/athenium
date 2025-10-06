#!/usr/bin/env node

/**
 * ATHENIUM Trading Platform - Sistema de Reparación Automática
 * 
 * Este script diagnostica y repara automáticamente problemas comunes de configuración
 * que pueden impedir que la aplicación se inicie correctamente.
 * 
 * Uso: node repair-system.js
 */

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

console.log('🔧 ATHENIUM - Sistema de Reparación Automática');
console.log('===============================================\n');

let issuesFound = 0;
let issuesFixed = 0;

/**
 * Utilidad para ejecutar comandos de sistema
 */
function runCommand(command, description) {
  try {
    console.log(`⏳ ${description}...`);
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} - Completado`);
    return { success: true, output: result };
  } catch (error) {
    console.log(`❌ ${description} - Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Verificación 1: Estructura de archivos del proyecto
 */
function checkProjectStructure() {
  console.log('1️⃣ Verificando estructura del proyecto...\n');
  
  const requiredFiles = [
    'package.json',
    'server.js',
    'server/auth.js',
    'server/storage.js',
    'server/db.js',
    'shared/schema.js',
    'drizzle.config.js'
  ];
  
  const missingFiles = [];
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      missingFiles.push(file);
      issuesFound++;
    }
  });
  
  if (missingFiles.length > 0) {
    console.log(`❌ Archivos faltantes: ${missingFiles.join(', ')}`);
    console.log('   💡 Asegúrate de que todos los archivos del proyecto estén en el directorio raíz\n');
    return false;
  }
  
  console.log('✅ Estructura del proyecto correcta\n');
  return true;
}

/**
 * Verificación 2: Variables de entorno críticas
 */
function checkEnvironmentVariables() {
  console.log('2️⃣ Verificando variables de entorno...\n');
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'SESSION_SECRET'
  ];
  
  const missingVars = [];
  
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
      issuesFound++;
    } else {
      console.log(`✅ ${varName} configurada`);
    }
  });
  
  if (missingVars.length > 0) {
    console.log(`❌ Variables de entorno faltantes: ${missingVars.join(', ')}`);
    console.log('   💡 Usa las herramientas de Replit para configurar estas variables\n');
    return false;
  }
  
  console.log('✅ Variables de entorno configuradas correctamente\n');
  return true;
}

/**
 * Verificación 3: Configuración de package.json
 */
function checkPackageConfiguration() {
  console.log('3️⃣ Verificando configuración de package.json...\n');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Verificar script de desarrollo
    if (packageJson.scripts && packageJson.scripts.dev === 'node server.js') {
      console.log('✅ Script dev configurado correctamente');
    } else {
      console.log('❌ Script dev incorrecto');
      console.log('   💡 Debería ser: "dev": "node server.js"');
      
      // Intentar reparar automáticamente
      if (packageJson.scripts) {
        packageJson.scripts.dev = 'node server.js';
        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
        console.log('✅ Script dev reparado automáticamente');
        issuesFixed++;
      }
    }
    
    // Verificar dependencias críticas
    const requiredDeps = [
      '@neondatabase/serverless',
      'drizzle-orm',
      'drizzle-kit',
      'express',
      'passport',
      'express-session',
      'connect-pg-simple'
    ];
    
    const missingDeps = requiredDeps.filter(dep => 
      !packageJson.dependencies || !packageJson.dependencies[dep]
    );
    
    if (missingDeps.length > 0) {
      console.log(`❌ Dependencias faltantes: ${missingDeps.join(', ')}`);
      issuesFound++;
      return false;
    }
    
    console.log('✅ Dependencias verificadas\n');
    return true;
    
  } catch (error) {
    console.log(`❌ Error leyendo package.json: ${error.message}\n`);
    issuesFound++;
    return false;
  }
}

/**
 * Verificación 4: Base de datos y migraciones
 */
function checkDatabase() {
  console.log('4️⃣ Verificando base de datos...\n');
  
  // Verificar que drizzle.config.js existe
  if (!fs.existsSync('drizzle.config.js')) {
    console.log('❌ drizzle.config.js no encontrado');
    issuesFound++;
    return false;
  }
  
  try {
    // Intentar ejecutar push de schema
    const result = runCommand('npm run db:push', 'Sincronizando schema de base de datos');
    
    if (result.success) {
      console.log('✅ Base de datos configurada correctamente');
      if (result.output.includes('Changes applied')) {
        console.log('   ⚡ Migraciones aplicadas');
        issuesFixed++;
      }
    } else {
      console.log('❌ Error con base de datos');
      console.log('   💡 Verifica que DATABASE_URL esté configurada correctamente');
      issuesFound++;
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error ejecutando migraciones: ${error.message}`);
    issuesFound++;
    return false;
  }
  
  console.log('');
  return true;
}

/**
 * Verificación 5: Servidor y conectividad
 */
function checkServerConnectivity() {
  console.log('5️⃣ Verificando conectividad del servidor...\n');
  
  try {
    // Importar y verificar configuración básica
    const serverContent = fs.readFileSync('server.js', 'utf8');
    
    if (serverContent.includes('app.listen(PORT, \'0.0.0.0\'')) {
      console.log('✅ Servidor configurado para bind en 0.0.0.0');
    } else {
      console.log('❌ Servidor no configurado correctamente para Replit');
      issuesFound++;
    }
    
    if (serverContent.includes('process.env.PORT || 5000')) {
      console.log('✅ Puerto configurado correctamente');
    } else {
      console.log('❌ Puerto no configurado correctamente');
      issuesFound++;
    }
    
  } catch (error) {
    console.log(`❌ Error verificando server.js: ${error.message}`);
    issuesFound++;
    return false;
  }
  
  console.log('');
  return true;
}

/**
 * Verificación 6: Configuración de seguridad
 */
function checkSecurityConfiguration() {
  console.log('6️⃣ Verificando configuración de seguridad...\n');
  
  try {
    const authContent = fs.readFileSync('server/auth.js', 'utf8');
    
    if (authContent.includes('store: storage.sessionStore')) {
      console.log('✅ Almacenamiento persistente de sesiones configurado');
    } else {
      console.log('❌ Sesiones usando almacenamiento en memoria');
      issuesFound++;
    }
    
    if (authContent.includes('sameSite:')) {
      console.log('✅ Protección CSRF configurada');
    } else {
      console.log('⚠️  Protección CSRF mejorable');
    }
    
    if (authContent.includes('secure: process.env.NODE_ENV === \'production\'')) {
      console.log('✅ Cookies seguros configurados');
    } else {
      console.log('⚠️  Cookies seguros mejorable');
    }
    
  } catch (error) {
    console.log(`❌ Error verificando configuración de seguridad: ${error.message}`);
    issuesFound++;
  }
  
  console.log('');
}

/**
 * Función principal de reparación
 */
async function main() {
  console.log('Iniciando diagnóstico del sistema...\n');
  
  // Ejecutar todas las verificaciones
  const checks = [
    checkProjectStructure,
    checkEnvironmentVariables, 
    checkPackageConfiguration,
    checkDatabase,
    checkServerConnectivity,
    checkSecurityConfiguration
  ];
  
  for (const check of checks) {
    try {
      await check();
    } catch (error) {
      console.log(`❌ Error durante verificación: ${error.message}\n`);
      issuesFound++;
    }
  }
  
  // Resumen final
  console.log('='.repeat(50));
  console.log('📊 RESUMEN DE DIAGNÓSTICO');
  console.log('='.repeat(50));
  
  if (issuesFound === 0) {
    console.log('🎉 ¡Sistema configurado correctamente!');
    console.log('   Todos los componentes están funcionando bien.');
  } else {
    console.log(`⚠️  Se encontraron ${issuesFound} problema(s)`);
    if (issuesFixed > 0) {
      console.log(`✅ ${issuesFixed} problema(s) reparado(s) automáticamente`);
    }
    console.log('');
    console.log('💡 RECOMENDACIONES:');
    console.log('   - Verifica las variables de entorno en Replit');
    console.log('   - Asegúrate de que la base de datos esté provisionada');
    console.log('   - Ejecuta: npm install si faltan dependencias');
    console.log('   - Reinicia el workflow si es necesario');
  }
  
  console.log('');
  console.log('🔄 Para ejecutar este diagnóstico nuevamente:');
  console.log('   node repair-system.js');
  console.log('');
  
  process.exit(issuesFound > issuesFixed ? 1 : 0);
}

// Ejecutar diagnóstico
main().catch(console.error);