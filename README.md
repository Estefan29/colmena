# DistriVariedades

Aplicación web sencilla para que las empleadas de DistriVariedades registren **cambios de producto**, **consumo interno** y **fiados**, y la dueña pueda revisarlos desde cualquier lugar para pasarlos a Siigo. No maneja stock/inventario: es solo una bitácora de movimientos.

## Funcionalidades

- **Catálogo de productos**: código interno, nombre y precio. Se puede importar por Excel (para cargar los +3000 productos existentes de una sola vez), agregar uno por uno, editar, eliminar, exportar y descargar una plantilla.
- **Registrar** (empleadas): tres formularios simples —
  - **Cambio**: producto que sale, producto que entra y motivo obligatorio.
  - **Consumo interno**: producto que se usó en el local (ej. un shampoo) y motivo obligatorio.
  - **Fiado**: cliente, uno o varios productos y una nota opcional.
- **Panel** (dueña): ve todos los movimientos con filtros por tipo, fecha, texto y estado; marca cada uno como "Pasado a Siigo" para llevar el control; exporta todo a Excel.
- Sin manejo de stock: es una bitácora de movimientos, no un sistema de inventario.

## Cómo correr el proyecto localmente

Requiere Node.js 20+.

```bash
npm install
cp .env.example .env.local   # y cambia las contraseñas y el AUTH_SECRET
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Vas a poder entrar como **empleada** (con cualquier nombre) o como **dueña**, según la contraseña.

## Variables de entorno

| Variable | Para qué sirve | Valor por defecto |
|---|---|---|
| `EMPLOYEE_PASSWORD` | Contraseña compartida para las empleadas | `empleada123` |
| `OWNER_PASSWORD` | Contraseña de la dueña | `duena123` |
| `AUTH_SECRET` | Frase secreta para firmar la sesión (usa algo largo y aleatorio) | valor de desarrollo, cámbialo |
| `DATA_DIR` | Carpeta donde se guarda la base de datos (`colmena.db`) | `./data` |

**Cambia las contraseñas y el `AUTH_SECRET` antes de usarlo en producción.**

## Datos: dónde se guardan

La app usa una base de datos **SQLite** en un archivo (`data/colmena.db`), no necesita un servidor de base de datos aparte. Eso significa dos cosas importantes:

1. Es muy fácil de correr (no hay que configurar Postgres/MySQL).
2. Necesita un servidor que mantenga el disco entre reinicios (no sirve para plataformas "serverless" sin disco persistente, como el plan gratuito de Vercel).

### Opciones para tenerla disponible desde cualquier lugar

- **Railway / Render**: crea un servicio con un volumen persistente, apunta `DATA_DIR` a ese volumen, `npm run build` y `npm start`.
- **Una VPS pequeña** (DigitalOcean, un droplet, etc.) o incluso un computador del local que quede encendido: corre `npm run build && npm start` y usa un servicio como PM2 para mantenerlo vivo, y Cloudflare Tunnel o similar para acceder desde afuera sin abrir puertos.
- Si en el futuro se prefiere no depender de un disco (por ejemplo, para desplegar en Vercel), habría que migrar la base de datos a un servicio como Postgres (Neon, Supabase); no es necesario para el uso actual.

### Respaldo

Haz copia del archivo `data/colmena.db` de vez en cuando (o de toda la carpeta `data/`) para tener un respaldo. Ahí vive toda la información: productos y movimientos.

## Cómo cargar los productos existentes

1. Entra como dueña → **Productos** → **Descargar plantilla**.
2. Llena las columnas `codigo`, `nombre` y `precio` con tu Excel actual de los +3000 productos (o simplemente asegúrate de que tu Excel tenga esas tres columnas con esos nombres, en cualquier orden).
3. **Importar Excel** y sube el archivo. Los productos nuevos se crean y los que ya existan (mismo código) se actualizan.

## Stack técnico

Next.js (App Router) + TypeScript + Tailwind CSS + SQLite (`better-sqlite3`) + `exceljs` para leer/escribir Excel. Sesión simple por cookie firmada (HMAC), sin base de datos de usuarios: dos contraseñas (empleada/dueña) definidas por variables de entorno.
