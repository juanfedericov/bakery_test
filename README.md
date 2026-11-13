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

Carga el catálogo de prueba después de aplicar las migraciones:

```bash
npx prisma db seed
```

El comando genera primero el cliente de Prisma a partir del esquema actual.
Esto evita errores como `Unknown argument ingredients` cuando el cliente quedó
desactualizado. Generar el cliente no actualiza la base de datos: después de
un cambio de esquema, aplica también las migraciones antes de cargar el seed.

El seed crea tres categorías y once productos con sabor, precio e imagen de
ejemplo. Puede ejecutarse varias veces: reutiliza las categorías existentes y
restablece los datos de sus productos de prueba sin duplicarlos. Las imágenes
son enlaces externos y requieren conexión a Internet.

Las tarjetas del catálogo abren el detalle de cada producto. La Torta Rogel
incluye ingredientes y porciones de ejemplo; los productos sin esos datos
indican que no están disponibles. Las notas opcionales se conservan mientras
la página permanezca abierta, pero todavía no se envían ni guardan en un pedido.

El esquema contiene categorías, productos y pedidos. Cada producto pertenece a
una categoría; cada línea de pedido registra el producto, la cantidad y el
precio unitario de ese pedido. Los importes se almacenan como decimales para
evitar errores de precisión de punto flotante. Los pedidos nuevos también guardan
los datos del cliente y entrega, dedicatoria, total y estado «Pendiente»; los
pedidos anteriores a esta migración pueden no tener esos datos.

Configura `WHATSAPP_NUMBER` en `.env` con el número del comercio en formato
internacional, solo dígitos y sin `+` (por ejemplo, `5491112345678`). Sin un
número válido no se habilita el envío del checkout.

## Desarrollo

Después de clonar el repositorio, instala las dependencias e inicia el servidor:

```bash
npm ci
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) para ver la página inicial.
La portada enlaza al catálogo de productos de la base de datos. Para visualizar
productos, configura `DATABASE_URL`, aplica las migraciones y carga el seed como
se describe arriba. Las imágenes de portada requieren conexión a Internet.
La sección «Sobre nosotros» presenta la propuesta artesanal, los envíos y el
retiro en fábrica. La ubicación y los horarios de retiro están pendientes de
confirmación y deben actualizarse en `components/AboutSection.tsx`.

Los metadatos SEO y de redes sociales están configurados en `app/layout.tsx`.
La vista previa utiliza provisionalmente una foto de torta de Unsplash; cuando
esté disponible, reemplaza su URL y texto alternativo por la foto corporativa
de la fábrica. Usa una imagen pública HTTPS de 1200 × 630 píxeles y actualiza
sus dimensiones si son diferentes. El sitio también debe estar publicado en
una URL accesible públicamente para que WhatsApp pueda generar la vista previa.

El catálogo muestra los precios en pesos argentinos y permite agregar o quitar
productos del carrito. Los filtros por categoría no vacían el
carrito ni las notas de los productos. Para abrir el detalle, selecciona la
imagen o información de una tarjeta; el botón «Agregar al Carrito» no abre el
modal. El carrito y las cantidades se guardan en el almacenamiento local del
navegador y se recuperan al recargar la página. Desde el carrito se puede
acceder a `/checkout` para completar nombre, teléfono, método de entrega y
fecha y hora estimada; para envíos también se requiere una dirección.
Al confirmar se abre WhatsApp en otra pestaña con el pedido redactado y se
vacía el carrito local; el cliente debe enviar el mensaje en WhatsApp.
El número configurado en `components/CheckoutForm.tsx` es un número de prueba
(`5491112345678`): reemplázalo por el número real con código de país y solo
dígitos antes de usarlo con clientes. Las notas no se guardan al recargar. Las compras actualizan el
contador del encabezado y muestran una confirmación temporal; el enlace del
encabezado lleva al resumen del carrito. Las
imágenes de productos pueden ser rutas locales de `public/` o enlaces HTTPS a
`images.unsplash.com/photo-*`; las demás se muestran sin foto hasta configurar
su origen en Next.js y actualizar la validación del catálogo.

### Después de un pull

Si el pull trae cambios en las dependencias, actualiza `node_modules` antes de
iniciar el servidor. Por ejemplo, si aparece `Can't resolve '@prisma/client'`:

```bash
npm ci
npx prisma generate
npm run dev
```

`npm ci` reinstala las dependencias según `package-lock.json`; el comando
`prisma generate` también actualiza el cliente si cambió el esquema de Prisma.
Si hay migraciones nuevas, configura `DATABASE_URL` y aplica las migraciones
con `npx prisma migrate deploy` antes de cargar el seed o consultar el catálogo.

La página principal está en `/`; `/bakery` no es una ruta de esta aplicación.

## Estructura

- `app/`: rutas y estilos globales del App Router.
- `components/`: componentes reutilizables.
- `lib/`: funciones y utilidades compartidas.

`src/lib/buildWhatsAppMessage.ts` exporta `buildWhatsAppMessage`, que recibe los
datos del cliente, teléfono, entrega, fecha (`DD/MM/AAAA`), hora (`HH:mm`) y
productos. Los productos usan la misma estructura
`{ product: { name, price }, quantity }` que el carrito; el precio es unitario
y el total se calcula a partir de las cantidades. Retorna el texto sin codificar
sin emojis, con negritas y viñetas simples; no incluye dedicatorias. El formulario de
checkout codifica el texto al construir el enlace y lo abre en una pestaña nueva.

Tailwind CSS se importa en `app/globals.css` y se integra con Turbopack mediante
`next.config.ts`.

## Verificación

```bash
npm run lint
npm test
npm run build
```
