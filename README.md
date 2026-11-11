# Bakery

Proyecto inicializado con Next.js App Router, TypeScript y Tailwind CSS.

## Requisitos

- Node.js 20.9 o superior (se recomienda Node.js 24 LTS).
- npm.

Si utilizas nvm, ejecuta `nvm use` para seleccionar la versión indicada en
`.nvmrc`.

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
