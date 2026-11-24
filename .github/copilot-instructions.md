# Instrucciones para Copilot

## Arquitectura y ubicacion

- Este proyecto usa Next.js 16 con App Router, React 19, TypeScript estricto y Tailwind CSS.
- Usa el alias `@/*` definido por `tsconfig.json` para importaciones desde la raiz del repositorio.
- `app/`: paginas, layouts y rutas del App Router. Conserva cada route handler o pagina cerca de su ruta.
- `app/api/`: endpoints HTTP. Un endpoint pertenece junto a su ruta bajo `app/api/.../route.ts`.
- `components/`: componentes de UI reutilizables o compartidos por varias rutas. Manten los componentes visuales fuera de `app/` cuando puedan reutilizarse.
- `lib/`: utilidades, clientes compartidos y estado compartido. Usa `@/lib/...` en el codigo de la aplicacion.
- `src/lib/`: implementaciones compartidas existentes cuando ya contienen la logica del modulo. `lib/` puede mantener reexports de compatibilidad.
- `prisma/schema.prisma`: modelos y relaciones. `prisma/migrations/`: cambios versionados del esquema. `prisma/seed.ts`: datos iniciales.
- `tests/`: pruebas automatizadas agrupadas por comportamiento o funcionalidad.
- `public/`: recursos estaticos que deben servirse directamente.

### Colocalizacion y alcance

- Aplica el principio de colocalizacion: primero coloca codigo, tipos y pruebas cerca de la feature o ruta que los usa.
- Toma el camino mas corto: modifica el archivo mas cercano al comportamiento solicitado y evita introducir carpetas o capas nuevas sin una necesidad real.
- Consulta `docs/feature-map.md` antes de buscar o modificar una funcionalidad principal. Usa la ruta de reproduccion y las pruebas indicadas para definir el alcance.
- Extrae a `components/` o `lib/` solo cuando el codigo se reutilice en dos o mas lugares o tenga una responsabilidad claramente compartida.
- Las rutas nuevas deben seguir la estructura de `app/`, sin crear un router paralelo.
- Mantene los cambios centrados en el alcance solicitado. No refactorices archivos ajenos ni cambies contratos existentes por conveniencia.
- Revisa la documentacion local de Next.js en `node_modules/next/dist/docs/` antes de usar una API que pueda haber cambiado.

## Comandos reales

Instala dependencias con `npm ci`.

### Desarrollo

```bash
npm run dev
```

La aplicacion queda disponible en `http://localhost:3000`. Requiere configurar `DATABASE_URL` en `.env` para datos reales de PostgreSQL.

### Base de datos

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

Para un esquema o migracion ya existente, usa primero los comandos apropiados de Prisma. No uses datos ni credenciales reales en archivos versionados.

### Verificacion

Ejecuta el conjunto relevante segun el cambio:

```bash
npm run lint
npm test
npx tsc --noEmit
npm run build
```

- `npm test` ejecuta `tests/*.test.tsx` con Node test runner y `tsx`.
- `npm run lint` verifica el proyecto con ESLint.
- `npm run build` genera la build de produccion y verifica el compilado de Next.js.
- Antes de finalizar, usa como minimo los comandos que cubran los archivos modificados. Para cambios de base de datos, genera el cliente y verifica las migraciones.

## Convenciones de codigo

- Escribe TypeScript con tipos correctos y strict mode habilitado. Evita `any`, casts innecesarios y suposiciones sin validacion.
- Conserva los patrones, nombres, imports y formato existentes.
- Usa nombres descriptivos en espanol o ingles segun el archivo y el lenguaje ya utilizado.
- Mantene componentes y funciones pequenas, y extrae logica compartida solo cuando aporte claridad.
- Valida entrada externa, especialmente JSON de routes y datos provenientes del usuario.
- Reutiliza helpers y servicios existentes antes de crear uno nuevo.
- No agregues comentarios obvios, logica muerta ni comentarios solo para describir lo que hace el codigo.
- Prefiere errores explicitos y manejo coherente con el resto del proyecto.

## Restricciones

- No inventes paquetes, scripts, variables de entorno, APIs o archivos que no existan o no hayan sido solicitados.
- No agregues una dependencia nueva sin necesidad demostrada y sin actualizar el manifest con el gestor existente.
- No hagas cambios fuera del alcance solicitado ni refactorices modulos ajenos.
- No modifiques `package-lock.json`, archivos generados o `.next/` salvo que sea parte directa y verificable del trabajo.
- No incluyas secretos, tokens, contrasenas ni URLs privadas en el codigo o la documentacion.
- No reutilices ni dupliques tipos, helpers o componentes existentes sin una razon.
- No dejes comentarios irrelevantes, codigo temporario, console logs de depuracion ni archivos sin uso.
- No asumas que las migraciones o el seed fueron ejecutados; verifica la configuracion de la base antes de usarla.
