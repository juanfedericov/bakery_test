# Feature map

Usa este mapa para localizar el codigo de una funcionalidad y reproducir el flujo antes de modificarlo.

## Portada y catalogo

- Ruta: `/`
- Archivos clave:
  - `app/page.tsx`: carga categorias y productos desde Prisma.
  - `components/HeroSection.tsx`: encabezado, portada y enlace al catalogo.
  - `components/AboutSection.tsx`: seccion "Sobre nosotros".
  - `components/Catalog.tsx`: filtros por categoria.
  - `components/ProductGrid.tsx`: listado, detalle y agregado al carrito.
  - `components/ProductCard.tsx`: tarjeta y precio.
  - `components/ProductDetailModal.tsx`: detalle e ingredientes.
- Prueba:
  1. Configura `DATABASE_URL`, aplica las migraciones y ejecuta `npx prisma db seed`.
  2. Inicia con `npm run dev` y abre `http://localhost:3000`.
  3. Usa los filtros, abre una tarjeta desde su imagen o nombre y agrega un producto.
- Pruebas relacionadas: `tests/catalog.test.tsx`, `tests/product-grid.test.tsx`.

## Detalle de producto

- Archivos clave:
  - `components/ProductCard.tsx`: dispara la apertura del detalle.
  - `components/ProductDetailModal.tsx`: muestra descripcion, ingredientes, porciones y notas.
  - `components/ProductGrid.tsx`: mantiene el producto seleccionado y las notas temporales.
- Prueba:
  1. En `/`, abre el detalle de una tarjeta.
  2. Cambia las notas y cierralas/reabrelas mientras permaneces en la pagina.
  3. Confirma que las notas no persisten al recargar.
- Archivos de datos: `prisma/schema.prisma` aporta `description`, `ingredients` y `servings`.

## Carrito

- Archivos clave:
  - `lib/store/useCartStore.ts`: estado y persistencia Zustand en `localStorage`.
  - `components/CartProvider.tsx`: contexto de mensajes y notificaciones temporales.
  - `components/CartNav.tsx`: contador y apertura del modal.
  - `components/CartDrawer.tsx`: items, cantidades, subtotal y enlace al checkout.
  - `components/ProductGrid.tsx`: agrega productos y muestra la confirmacion.
  - `lib/formatPrice.ts`: formato de precios en pesos argentinos.
- Prueba:
  1. Agrega uno o mas productos.
  2. Abre "Carrito" y verifica cantidad y subtotal.
  3. Quita un producto y recarga para comprobar la persistencia.
- Persistencia: clave `bakery-cart` en `localStorage`.
- Pruebas relacionadas: `tests/cart-store.test.tsx`, `tests/cart-modal.test.tsx`, `tests/product-grid.test.tsx`.

## Checkout y pedido por WhatsApp

- Ruta: `/checkout`
- Archivos clave:
  - `app/checkout/page.tsx`: ruta y configuracion de `WHATSAPP_NUMBER`.
  - `components/CheckoutForm.tsx`: recuperacion del carrito, validacion y apertura de WhatsApp.
  - `src/lib/buildWhatsAppMessage.ts`: construccion del mensaje.
  - `lib/buildWhatsAppMessage.ts`: reexport existente usado por el formulario.
- Prueba:
  1. Configura `WHATSAPP_NUMBER` con solo digitos y codigo de pais en `.env`.
  2. Agrega productos en `/`, abre el carrito y entra a `/checkout`.
  3. Completa nombre, telefono, entrega, direccion si corresponde y fecha/hora.
  4. Confirma y permite ventanas emergentes.
  5. Verifica el contenido en WhatsApp y que el carrito local quede vacio.
- Limitaciones actuales: las notas del detalle no se incluyen en el pedido y el checkout abre WhatsApp; el envio efectivo depende de que el cliente envie el mensaje.
- Pruebas relacionadas: `tests/checkout-form.test.tsx`, `tests/build-whatsapp-message.test.tsx`.

## API y persistencia de pedidos

- Endpoint: `POST /api/orders`
- Archivos clave:
  - `app/api/orders/route.ts`: valida entrada, consulta precios en la base y crea el pedido.
  - `lib/prisma.ts`: instancia compartida de Prisma.
  - `prisma/schema.prisma`: modelos `Category`, `Product`, `Order` y `OrderItem`.
  - `prisma/migrations/`: migraciones versionadas.
  - `prisma/seed.ts`: carga inicial.
- Prueba:
  1. Aplica migraciones y genera el cliente con `npx prisma generate`.
  2. Ejecuta `npm test` para cubrir validaciones y errores simulados.
  3. Para una prueba manual, envia JSON valido a `POST /api/orders` con IDs reales y precios actuales.
- Comportamientos esperados:
  - Rechaza JSON invalido, datos incompletos y precios desactualizados.
  - Usa los precios obtenidos de la base al guardar.
  - Guarda el estado inicial como `Pendiente`.
- Pruebas relacionadas: `tests/orders-api.test.tsx`.

## Imagenes y datos

- Archivos clave:
  - `lib/product-image.ts`: origen admitido de imagenes de productos.
  - `prisma/seed.ts`: URLs de ejemplo y datos iniciales.
  - `public/`: recursos locales.
- Prueba:
  - Revisa que las URLs externas sean HTTPS admitidas por Next.js.
  - Verifica el fallback "Imagen no disponible" ante una URL invalida o error de carga.

## Verificacion rapida por cambio

```bash
npm run lint
npm test
npx tsc --noEmit
npm run build
```
