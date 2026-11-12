import assert from "node:assert/strict";
import test from "node:test";
import { buildWhatsAppMessage } from "../lib/buildWhatsAppMessage";

test("renderiza el ejemplo de pedido con saltos LF", () => {
  const message = buildWhatsAppMessage({
    customerName: "pepe",
    phone: "3300",
    delivery: "Envío: arturo",
    date: "19/11/2026",
    time: "07:10",
    items: [{ product: { name: "Mousse de chocolate", price: 5000 }, quantity: 1 }],
  });

  assert.equal(message, [
    "🎂 *NUEVO PEDIDO - FÁBRICA DE TORTAS*",
    "👤 *Cliente:* pepe",
    "📞 *Teléfono:* 3300",
    "🚚 *Entrega:* Envío: arturo",
    "📅 *Fecha:* 19/11/2026 - 07:10 hs",
    "",
    "📋 *Detalle del Pedido:*",
    "• 1x Mousse de chocolate ($5.000)",
    "",
    "💰 *TOTAL:* $5.000",
  ].join("\n"));
  assert.doesNotMatch(message, /\r/);
});

test("genera el mensaje del pedido con el formato y saltos esperados para WhatsApp", () => {
  const message = buildWhatsAppMessage({
    customerName: "María",
    phone: "+549...",
    delivery: "Retiro en local",
    date: "15/11/2026",
    time: "16:00",
    items: [
      { product: { name: "Torta Marquise", price: 10000 }, quantity: 1 },
      { product: { name: "Lemon Pie", price: 8000 }, quantity: 1 },
    ],
  });

  assert.equal(message, [
    "🎂 *NUEVO PEDIDO - FÁBRICA DE TORTAS*",
    "👤 *Cliente:* María",
    "📞 *Teléfono:* +549...",
    "🚚 *Entrega:* Retiro en local",
    "📅 *Fecha:* 15/11/2026 - 16:00 hs",
    "",
    "📋 *Detalle del Pedido:*",
    "• 1x Torta Marquise ($10.000)",
    "• 1x Lemon Pie ($8.000)",
    "",
    "💰 *TOTAL:* $18.000",
  ].join("\n"));
  assert.doesNotMatch(message, /\r/);
});

test("calcula cantidades y centavos y preserva caracteres UTF-8", () => {
  const message = buildWhatsAppMessage({
    customerName: "Ana & José",
    phone: "+54 11",
    delivery: "Envío #1",
    date: "01/12/2026",
    time: "09:30",
    items: [
      { product: { name: "Tarta + crema", price: 100.25 }, quantity: 3 },
      { product: { name: "Alfajor", price: 0.1 }, quantity: 2 },
    ],
  });

  assert.match(message, /Cliente:\* Ana & José/);
  assert.match(message, /Entrega:\* Envío #1/);
  assert.match(message, /• 3x Tarta \+ crema \(\$100,25\)/);
  assert.match(message, /• 2x Alfajor \(\$0,10\)/);
  assert.match(message, /\*TOTAL:\* \$300,95$/);
  assert.doesNotMatch(message, /Dedicatoria/);
  assert.doesNotMatch(message, /[\u0000-\u0009\u000B-\u001F\u007F\uFFFD]/);
  assert.equal(decodeURIComponent(encodeURIComponent(message)), message);
  assert.match(new URLSearchParams({ text: message }).toString(), /%C3%A9/);
});
