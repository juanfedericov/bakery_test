# Bakery

Proyecto inicializado con Next.js App Router, TypeScript y Tailwind CSS.

## Requisitos

- Node.js 20.9 o superior (se recomienda Node.js 24 LTS).
- npm.
- PostgreSQL y una base de datos para el proyecto.

Si utilizas nvm, ejecuta `nvm use` para seleccionar la versión indicada en
`.nvmrc`.

## Base de datos

Copia `.env.example` a `.env` y ajusta `DATABASE_URL` con las credenciales y
la dirección de PostgreSQL. No incluyas credenciales reales en el repositorio.
El usuario de PostgreSQL debe poder crear una base de datos temporal para que
Prisma pueda utilizar su shadow database durante las migraciones de desarrollo.

Después de instalar las dependencias, crea las tablas y genera el cliente:

```bash
npx prisma migrate dev
```

El esquema contiene categorías, productos y pedidos. Cada producto pertenece a
una categoría; cada línea de pedido registra el producto, la cantidad y el
precio unitario de ese pedido. Los importes se almacenan como decimales para
evitar errores de precisión de punto flotante.

## Desarrollo

Después de clonar el repositorio, instala las dependencias e inicia el servidor:

```bash
npm ci
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) para ver la página inicial.

## Estructura

- `app/`: rutas y estilos globales del App Router.
- `components/`: componentes reutilizables.
- `lib/`: funciones y utilidades compartidas.

Tailwind CSS se importa en `app/globals.css` y se integra con Turbopack mediante
`next.config.ts`.

## Verificación

```bash
npm run lint
npm run build
```
