# Sistema de facturación móvil

Implementación solicitada en la "Solicitud de Desarrollo de un Software de Facturación". Incluye API REST con Node.js/Express, base de datos PostgreSQL centralizada y una aplicación web progresiva que funciona en smartphones de personal de ventas y servicio.

## Arquitectura general

- **API REST**: Node.js + Express + PostgreSQL (pg). Seguridad básica con Helmet, CORS abierto controlado, logs HTTP (morgan) y validación de entrada (express-validator).
- **Base de datos**: PostgreSQL administrado (DigitalOcean). Tablas `productos`, `clientes`, `facturas`, `detalle_factura` + índices y secuencia para folios de factura.
- **PWA**: Frontend ligero (HTML/CSS/JS) capaz de operar en modo standalone, cachea activos para resiliencia offline y consume el API para inventario, clientes y creación de facturas.

```
smartphone -> PWA -> API Express -> PostgreSQL (DigitalOcean)
```

## Backend (carpeta `backend/`)

1. Crear archivo `.env` (ejemplo incluido). Para la instancia de DO provista:

```
PORT=4000
DB_HOST=movil-1-do-user-28304087-0.d.db.ondigitalocean.com
DB_PORT=25060
DB_DATABASE=defaultdb
DB_USER=doadmin
DB_PASSWORD=<CONTRASEÑA_SUMINISTRADA_POR_TI>
DB_SSL=true
TAX_RATE=0.12
```

2. Instalación y ejecución:

```bash
cd backend
npm install
npm run dev            # recarga automática
npm start              # producción
```

3. Validar salud: `GET /health`.

4. Endpoints requeridos:
   - `GET /productos`: catálogo completo.
   - `GET /productos/:id`: detalle individual.
   - `POST /productos`: alta de nuevos ítems con validaciones.
   - `GET /inventario`: estado de stock e indicador de reposición.
   - `GET /clientes`: consulta de clientes.
   - `POST /clientes`: registro de nuevos clientes.
   - `POST /facturas`: genera factura, descuenta inventario, registra venta.
   - `GET /facturas`: historial resumido con detalles agregados.
   - `GET /facturas/:id`: consulta factura y detalle.

5. Seguridad y buenas prácticas:
   - Middleware Helmet + CORS + tamaño del body limitado.
   - Manejo centralizado de errores.
   - Validación de payloads con `express-validator`.
   - Transacciones con `SERIALIZABLE` implícito via `SELECT ... FOR UPDATE` para inventario.
   - Cierre ordenado del pool y manejo de señales SIGINT/SIGTERM.

## Base de datos (carpeta `sql/`)

Archivo `sql/schema.sql` contiene:

- Creación de tablas `clientes`, `productos`, `facturas`, `detalle_factura`.
- Secuencia `factura_numero_seq` y autonumeración `FAC-YYYYMMDD-00001`.
- Índices para consultas por cliente y factura.
- Datos de ejemplo para clientes y productos.

**Aplicación del script**

```bash
psql "postgres://doadmin:<CONTRASEÑA>@movil-1-do-user-28304087-0.d.db.ondigitalocean.com:25060/defaultdb?sslmode=require" -f sql/schema.sql
```

(Si no se desea usar credenciales reales, ajustar el DSN anterior.)

## PWA (carpeta `frontend/`)

Características:

- Consumo dinámico de `GET /inventario`, `GET /clientes`, `GET /productos`.
- Formularios dedicados para registrar productos y clientes (consumen `POST /productos` y `POST /clientes`).
- Formulario para `POST /facturas` con múltiples líneas de producto, captura de notas y render del resultado, incluyendo resumen de subtotal/IVA/total.
- La URL base del API se define en `frontend/app.js` (`DEFAULT_API_BASE`) para apuntar al backend desplegado.
- Módulo de "Facturas generadas" que carga el historial (vía `GET /facturas`) al pulsar el botón correspondiente y muestra los detalles con formato legible.
- Service Worker (`sw.js`) y `manifest.json` listos para instalación en Android/iOS (via Chrome/Safari) como app standalone.
- Íconos (192/512 px) incluidos.

**Despliegue local rápido**

```bash
cd frontend
python3 -m http.server 5173
# o npm install -g serve && serve .
```

Luego, acceder desde el smartphone apuntando al host donde corre el backend (usar HTTPS público para modo producción). Para instalar en Android: "Añadir a pantalla de inicio"; en iOS Safari: botón compartir → Añadir.

## Guía de despliegue

1. **Base de datos**
   - Crear base PostgreSQL administrada (ya provista en DO).
   - Ejecutar `sql/schema.sql` con un usuario con privilegios (`doadmin`).
   - Configurar backups automáticos y rotación de credenciales según políticas TI.

2. **Backend**
   - Provisionar servidor Node.js 18+ (Droplet, App Platform, Fly.io, etc.).
   - Configurar variables de entorno según `.env.example`.
   - Desplegar el servicio (PM2, Docker o systemd). Ejemplo Dockerfile mínimo:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --production
COPY backend/src ./src
CMD ["node", "src/server.js"]
```

   - Abrir puerto 4000 (o el configurado) y, si aplica, colocar detrás de un proxy HTTPS (NGINX/Caddy).

3. **PWA**
   - Servir contenido estático (Netlify/Vercel/S3/NGINX). Ajustar `DEFAULT_API_BASE` en `frontend/app.js` para apuntar al backend público antes de desplegar.
   - Registrar dominio HTTPS para cumplir políticas de instalación PWA.

4. **Operación móvil**
   - Capacitar a usuarios para instalar la PWA.
   - Proveer credenciales de acceso a la red corporativa / VPN si el backend queda en red privada.
   - Documentar procedimientos de contingencia (p.ej. modo offline, sincronizar al volver a línea).

## Pruebas manuales sugeridas

```bash
# Productos
curl $API/productos
# Inventario
curl $API/inventario
# Crear factura
curl -X POST $API/facturas \
  -H 'Content-Type: application/json' \
  -d '{"clienteId":1,"lineas":[{"productoId":1,"cantidad":2}]}'
```

## Consideraciones adicionales

- Ajustar `TAX_RATE` si cambia el IVA.
- Integrar autenticación/JWT si se requiere control de acceso por usuario móvil.
- Añadir pruebas automatizadas y pipeline CI/CD según la estrategia DevOps de la organización.
