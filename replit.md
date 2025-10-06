# ATHENIUM Trading Platform

## Descripción del Proyecto
Plataforma de trading completa con dashboard, sistema de autenticación, gestión de perfiles, y más.

## Estructura del Proyecto

### Backend
- **server.js**: Servidor principal Express
- **server/auth.js**: Sistema de autenticación con Passport
- **server/storage.js**: Interfaz de almacenamiento de datos
- **server/db.js**: Configuración de base de datos con Drizzle ORM
- **server/initDB.js**: Script de inicialización de base de datos
- **shared/schema.js**: Esquemas de base de datos compartidos

### Frontend
- **dashboard.html**: Dashboard principal de trading
- **auth.html**: Página de autenticación (login/registro)
- **profile.html**: Página de perfil de usuario
- **admin.html**: Panel de administración
- **mentorship.html**: Catálogo de mentorías
- **index.html**: Página principal/landing

### Scripts Importantes
- **build.sh**: Script de deployment para Render (instala deps, inicializa DB, etc.)
- **repair-system.js**: Diagnóstico y reparación automática de problemas
- **update-passwords.js**: Actualiza contraseñas a versiones hasheadas
- **discord-bot.js**: Bot de Discord para integración

## Configuración

### Variables de Entorno Requeridas
- `DATABASE_URL`: URL de conexión a PostgreSQL
- `SESSION_SECRET`: Secreto para sesiones (ya configurado en Replit)

### Variables de Entorno Opcionales
- `DISCORD_BOT_TOKEN`: Token para el bot de Discord
- `PORT`: Puerto del servidor (default: 5000)
- `NODE_ENV`: Entorno (development/production)

## Scripts NPM

```bash
npm run dev    # Inicia el servidor en modo desarrollo
npm start      # Inicia el servidor en modo producción
npm run build  # Construye la aplicación
npm run db:push # Ejecuta migraciones de base de datos
```

## Deployment en Render

Para deployar en Render, sigue las instrucciones en `DEPLOYMENT.md`.

El proyecto incluye:
- **build.sh**: Script automático de deployment
- **render.yaml**: Configuración automática para Render
- **DEPLOYMENT.md**: Guía completa de deployment

## Características Principales

### Autenticación
- Login/registro con email y contraseña
- Sesiones persistentes con express-session
- Hash de contraseñas con SHA-256

### Dashboard
- Vista personalizada por usuario
- Estadísticas de trading
- Gestión de perfil
- Integración con Discord

### Perfil de Usuario
- Foto de perfil personalizable
- ID único para cada usuario
- Estadísticas personales
- Historial de trades

### Admin Panel
- Gestión de usuarios
- Gestión de archivos globales
- Gestión de links y recursos
- Gestión de mentorías

### Base de Datos
Tablas principales:
- `users`: Información de usuarios
- `discord_accounts`: Cuentas de Discord vinculadas
- `trade_journal_entries`: Journal de trades
- `global_files`: Archivos compartidos
- `global_links`: Links útiles
- `global_mentorships`: Videos/recursos de mentoría
- `bias_entries`: Entradas de bias de mercado

## Desarrollo Local

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno en `.env` (en Replit ya están configuradas)

3. Iniciar el servidor:
```bash
npm run dev
```

4. Acceder a:
- Dashboard: http://localhost:5000/dashboard
- Auth: http://localhost:5000/auth
- Admin: http://localhost:5000/admin

## Cambios Recientes

### 2025-10-06
- ✅ Arreglado problema de alineación de botones "View Profile" y "View Trades" en móvil
  - Ahora están centrados horizontalmente en dispositivos móviles
  - Cambios en `dashboard.html` líneas 1087-1095
- ✅ Creado script completo de deployment para Render (`build.sh`)
- ✅ Creado archivo de configuración `render.yaml` para deployment automático
- ✅ Agregada documentación completa de deployment en `DEPLOYMENT.md`
- ✅ Proyecto movido de carpeta `HolaCentral-89` a la raíz del workspace
- ✅ Verificado que el servidor inicia correctamente con todas las dependencias

## Solución de Problemas

Si el servidor no inicia:
1. Ejecuta `node repair-system.js` para diagnóstico automático
2. Verifica que las variables de entorno estén configuradas
3. Asegúrate de que la base de datos esté accesible
4. Revisa los logs del workflow "Start application"

## Tecnologías Utilizadas

- **Backend**: Node.js, Express
- **Base de Datos**: PostgreSQL con Drizzle ORM
- **Autenticación**: Passport.js
- **Frontend**: HTML, CSS, JavaScript vanilla
- **Integración**: Discord.js
- **Deploy**: Render

## Notas

- El proyecto usa módulos ES6 (`"type": "module"` en package.json)
- La base de datos se inicializa automáticamente al arrancar el servidor
- Los assets están en la carpeta `attached_assets/`
- Los archivos subidos se guardan en `uploads/`
