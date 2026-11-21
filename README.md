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

## Publicar la app en Vercel (gratis)

Esta es la forma recomendada para que todas las empleadas y la dueña puedan usarla desde cualquier lugar, sin pagar nada.

### 1. Crear cuenta en Vercel

Entra a [vercel.com](https://vercel.com) → **Sign Up** → elige "Continue with GitHub" (usa la misma cuenta de GitHub donde está este repositorio).

### 2. Importar el proyecto

1. En el panel de Vercel, click **Add New… → Project**.
2. Busca el repositorio `colmena` y dale **Import**.
3. Framework: Vercel detecta automáticamente que es Next.js, no hay que tocar nada ahí.
4. Todavía **no le des a Deploy** — antes hay que crear la base de datos (siguiente paso). Si ya le diste, no pasa nada, luego se agrega igual.

### 3. Crear la base de datos (Postgres)

1. Dentro del proyecto en Vercel, ve a la pestaña **Storage**.
2. **Create Database** → elige **Postgres** (Neon).
3. Sigue los pasos por defecto y conéctala al proyecto (esto crea automáticamente la variable `DATABASE_URL`, no hay que copiarla a mano).

### 4. Agregar las contraseñas

En el proyecto → **Settings → Environment Variables**, agrega estas tres:

| Variable | Valor sugerido |
|---|---|
| `EMPLOYEE_PASSWORD` | la contraseña que van a usar tus compañeras |
| `OWNER_PASSWORD` | tu contraseña como dueña |
| `AUTH_SECRET` | cualquier frase larga y aleatoria (ej. una fila de letras y números al azar) |

### 5. Deploy

Ve a la pestaña **Deployments** y dale **Redeploy** (o **Deploy** si es la primera vez). En un par de minutos Vercel te da una URL como `https://colmena-tuempresa.vercel.app` — esa es la dirección que van a usar tú y tus compañeras desde cualquier celular o computador.

Cada vez que se suban cambios nuevos al repositorio, Vercel vuelve a publicar la app sola.

## Cómo correr el proyecto en tu computador (para probar)

Requiere Node.js 20+ y una base de datos Postgres (local o gratis en [Neon](https://neon.tech)/[Supabase](https://supabase.com)).

```bash
npm install
cp .env.example .env.local   # completa DATABASE_URL y cambia las contraseñas
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Vas a poder entrar como **empleada** (con cualquier nombre) o como **dueña**, según la contraseña.

## Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Conexión a la base de datos Postgres. En Vercel se crea sola al agregar el Storage; en local, la de tu Postgres. |
| `EMPLOYEE_PASSWORD` | Contraseña compartida para las empleadas |
| `OWNER_PASSWORD` | Contraseña de la dueña |
| `AUTH_SECRET` | Frase secreta para firmar la sesión (usa algo largo y aleatorio) |

**Cambia las contraseñas y el `AUTH_SECRET` antes de que la use el equipo de verdad.**

## Cómo cargar los productos existentes

1. Entra como dueña → **Productos** → **Descargar plantilla**.
2. Llena las columnas `codigo`, `nombre` y `precio` con tu Excel actual de los +3000 productos (o simplemente asegúrate de que tu Excel tenga esas tres columnas con esos nombres, en cualquier orden).
3. **Importar Excel** y sube el archivo. Los productos nuevos se crean y los que ya existan (mismo código) se actualizan.

## Respaldo

Los datos viven en la base de datos Postgres (Vercel/Neon los respalda automáticamente). Si quieres un respaldo propio de vez en cuando, exporta el catálogo y los movimientos a Excel desde la app (botones "Exportar").

## Stack técnico

Next.js (App Router) + TypeScript + Tailwind CSS + Postgres (`pg`) + `exceljs` para leer/escribir Excel. Sesión simple por cookie firmada (HMAC), sin base de datos de usuarios: dos contraseñas (empleada/dueña) definidas por variables de entorno.
