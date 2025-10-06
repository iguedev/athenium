# 🚀 Guía de Deployment para ATHENIUM Trading Platform

Esta guía te ayudará a deployar la aplicación ATHENIUM en Render u otros servicios de hosting.

## Opción 1: Deployment en Render (Recomendado)

### Método A: Usando render.yaml (Automático)

1. **Crea una cuenta en Render**: https://render.com

2. **Conecta tu repositorio Git**:
   - Ve a tu dashboard de Render
   - Click en "New +" → "Blueprint"
   - Conecta tu repositorio de GitHub/GitLab
   - Render detectará automáticamente el archivo `render.yaml`

3. **Configura las variables de entorno**:
   - `DATABASE_URL`: Se configura automáticamente si usas la base de datos de Render
   - `SESSION_SECRET`: Se genera automáticamente
   - `DISCORD_BOT_TOKEN` (opcional): Si usas el bot de Discord

4. **Deploy**: 
   - Render ejecutará automáticamente el script `build.sh`
   - La aplicación estará disponible en pocos minutos

### Método B: Deployment Manual

1. **Crea un nuevo Web Service**:
   - Dashboard de Render → "New +" → "Web Service"
   - Conecta tu repositorio

2. **Configura el servicio**:
   - **Build Command**: `./build.sh`
   - **Start Command**: `npm start`
   - **Environment**: Node
   - **Node Version**: 20.19.3

3. **Crea una base de datos PostgreSQL**:
   - Dashboard de Render → "New +" → "PostgreSQL"
   - Copia la "Internal Database URL"

4. **Configura variables de entorno**:
   ```
   DATABASE_URL=<tu-database-url-de-render>
   SESSION_SECRET=<genera-un-string-aleatorio-seguro>
   NODE_ENV=production
   ```

5. **Deploy**: Click en "Manual Deploy" o espera el auto-deploy

---

## Opción 2: Deployment en otros servicios (Heroku, Railway, etc.)

### Requisitos previos:
- Node.js 20.x o superior
- PostgreSQL 14 o superior
- Variables de entorno configuradas

### Pasos generales:

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   ```bash
   DATABASE_URL=postgresql://usuario:contraseña@host:5432/nombre_db
   SESSION_SECRET=tu-secreto-seguro-aqui
   NODE_ENV=production
   ```

3. **Ejecutar el script de build**:
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

4. **Iniciar el servidor**:
   ```bash
   npm start
   ```

---

## Variables de Entorno Requeridas

| Variable | Descripción | Obligatoria |
|----------|-------------|-------------|
| `DATABASE_URL` | URL de conexión a PostgreSQL | ✅ Sí |
| `SESSION_SECRET` | Secreto para sesiones (32+ caracteres) | ✅ Sí |
| `NODE_ENV` | Entorno de ejecución (production/development) | ⚠️  Recomendado |
| `DISCORD_BOT_TOKEN` | Token del bot de Discord | ❌ Opcional |
| `PORT` | Puerto del servidor (default: 3000) | ❌ Opcional |

---

## Script de Build Explicado

El script `build.sh` realiza los siguientes pasos automáticamente:

1. ✅ Instala todas las dependencias de npm
2. ✅ Verifica que las variables de entorno críticas existan
3. ✅ Crea los directorios necesarios (`uploads`, `attached_assets`)
4. ✅ Inicializa las tablas de la base de datos
5. ✅ Ejecuta migraciones si es necesario
6. ✅ Prepara la aplicación para producción

---

## Verificación del Deployment

Una vez deployada la aplicación, verifica que:

1. **La aplicación carga correctamente**: Visita la URL de tu servicio
2. **La base de datos está conectada**: Intenta hacer login o registrarte
3. **Los assets se cargan**: Verifica que imágenes y estilos funcionan
4. **El bot de Discord funciona** (si está configurado)

---

## Troubleshooting

### Error: "DATABASE_URL is not defined"
**Solución**: Configura la variable de entorno `DATABASE_URL` en tu servicio de hosting.

### Error: "Cannot find module 'xxx'"
**Solución**: Ejecuta `npm install` para instalar todas las dependencias.

### Error: "Database connection failed"
**Solución**: 
- Verifica que el formato de `DATABASE_URL` sea correcto
- Asegúrate de que la base de datos PostgreSQL esté activa
- Verifica las credenciales de acceso

### La aplicación se cierra inesperadamente
**Solución**: 
- Revisa los logs del servicio
- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de que el puerto esté configurado correctamente

---

## Mantenimiento

### Actualizar la aplicación:
```bash
git pull origin main
./build.sh
npm start
```

### Backup de la base de datos:
```bash
pg_dump $DATABASE_URL > backup.sql
```

### Restaurar backup:
```bash
psql $DATABASE_URL < backup.sql
```

---

## Soporte

Si encuentras problemas durante el deployment:

1. Revisa esta documentación completa
2. Ejecuta el script de diagnóstico: `node repair-system.js`
3. Revisa los logs del servidor para identificar errores específicos

---

¡Feliz deployment! 🚀
