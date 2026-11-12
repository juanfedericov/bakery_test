import assert from "node:assert/strict";
import test from "node:test";
import { buildWhatsAppUrl } from "../lib/buildWhatsAppUrl";

test("codifica el pedido con el formato esperado para WhatsApp", () => {
  const encoded = buildWhatsAppUrl({
    customerName: "María",
    phone: "+549...",
    delivery: "Retiro en local",
    date: "15/11/2026",
    time: "16:00",
    items: [
      { product: { name: "Torta Marquise", price: 10000 }, quantity: 1 },
      { product: { name: "Lemon Pie", price: 8000 }, quantity: 1 },
    ],
    dedication: "Feliz día",
  });

  assert.equal(decodeURIComponent(encoded), [
    "🎂 *NUEVO PEDIDO - FÁBRICA DE TORTAS*",
    "👤 *Cliente:* María",
    "📞 *Teléfono:* +549...",
    "📍 *Entrega:* Retiro en local",
    "📅 *Fecha:* 15/11/2026 - 16:00 hs",
    "",
    "📝 *Detalle del Pedido:*",
    "• 1x Torta Marquise ($10.000)",
    "• 1x Lemon Pie ($8.000)",
    "",
    "✍️ *Dedicatoria:* \"Feliz día\"",
    "💰 *TOTAL:* $18.000",
  ].join("\n"));
  const url = new URL(`https://wa.me/5491112345678?text=${encoded}`);
  assert.equal(url.searchParams.get("text"), decodeURIComponent(encoded));
});

test("calcula cantidades y centavos, omite la dedicatoria vacía y codifica caracteres reservados", () => {
  const encoded = buildWhatsAppUrl({
    customerName: "Ana & José",
    phone: "+54 11",
    delivery: "Envío #1",
    date: "01/12/2026",
    time: "09:30",
    items: [
      { product: { name: "Tarta + crema", price: 100.25 }, quantity: 3 },
      { product: { name: "Alfajor", price: 0.1 }, quantity: 2 },
    ],
    dedication: " ",
  });

  const url = new URL(`https://wa.me/5491112345678?text=${encoded}`);
  const message = url.searchParams.get("text")!;
  assert.match(message, /Cliente:\* Ana & José/);
  assert.match(message, /Entrega:\* Envío #1/);
  assert.match(message, /• 3x Tarta \+ crema \(\$100,25\)/);
  assert.match(message, /• 2x Alfajor \(\$0,10\)/);
  assert.match(message, /💰 \*TOTAL:\* \$300,95$/);
  assert.doesNotMatch(message, /Dedicatoria/);
});
