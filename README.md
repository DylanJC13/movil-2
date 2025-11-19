# PWA · Computación Móvil

Backend ligero construido con Express que expone una API REST para consultar cursos y avisos académicos. Incluye una Progressive Web App (PWA) que consume los datos, se instala en Android y funciona offline con un Service Worker sencillo.

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
npm install
cp .env.example .env # ajusta puertos/orígenes si es necesario
```

## Scripts disponibles

- `npm run dev`: inicia el servidor con recarga automática (nodemon).
- `npm start`: levanta el backend en modo producción.

La API queda disponible en `http://localhost:4000/api` y la PWA se sirve desde la misma URL.

## Endpoints principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/health` | Diagnóstico rápido del servicio. |
| GET | `/api/courses` | Lista cursos. Permite filtrar por `modality`, `campus`, `tag` o `search`. |
| GET | `/api/courses/:courseId` | Devuelve un curso puntual. |
| POST | `/api/courses` | Crea un curso y lo persiste en la base de datos. |
| GET | `/api/announcements` | Avisos recientes. Acepta `level` y `limit`. |

## Base de datos

- Define en `.env` las variables `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y `DB_SSLMODE` para habilitar la persistencia en PostgreSQL.
- La API crea automáticamente la tabla `courses`, pero si deseas hacerlo de forma manual:

```sql
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  instructor TEXT NOT NULL,
  credits INT NOT NULL,
  modality TEXT NOT NULL,
  schedule TEXT NOT NULL,
  campus TEXT NOT NULL,
  start_date DATE NOT NULL,
  tags TEXT[] NOT NULL,
  summary TEXT NOT NULL
);

```

- Cuando las variables no están definidas, el catálogo de `/api/courses` se sirve desde los datos locales en memoria.

## PWA

- Manifest básico en `public/manifest.json`.
- Service Worker (`public/service-worker.js`) cachea el shell y entrega respuesta offline controlada para las rutas del API.
- El archivo `public/app.js` maneja filtros, consumo de la API, registro de cursos y el flujo de instalación.

## Probar en un celular en la misma red

- Abre el servidor con `npm run dev`.
- Obtén la IP local de tu computador (`ipconfig getifaddr en0` en macOS, `ipconfig` en Windows).
- Desde el navegador del celular visita `http://IP_LOCAL:4000/`. Añade esa IP a `ALLOWED_ORIGINS` si la PWA necesita CORS.
- Si la red tiene aislamiento de clientes o un firewall bloquea el puerto 4000, no se podrá acceder; desactiva VPNs y permite conexiones entrantes cuando macOS lo solicite.

## Siguientes pasos sugeridos

1. Añadir autenticación/autorización antes de permitir la creación de cursos en producción.
2. Desplegar el servicio en Render, Railway u otro proveedor y actualizar `ALLOWED_ORIGINS`.
3. Añadir pruebas automatizadas para las rutas críticas (`node --test` o Jest/Supertest).
