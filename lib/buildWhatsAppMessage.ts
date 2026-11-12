import { formatPrice } from "./formatPrice";

export type WhatsAppOrder = {
  customerName: string;
  phone: string;
  delivery: string;
  date: string;
  time: string;
  items: {
    product: { name: string; price: number };
    quantity: number;
  }[];
  dedication?: string;
};

export function buildWhatsAppMessage(order: WhatsAppOrder): string {
  const price = (amount: number) => formatPrice(amount).replace(/\s/g, "");
  const total = order.items.reduce(
    (sum, item) => sum + Math.round(item.product.price * 100) * item.quantity,
    0,
  ) / 100;

  const lines = [
    "\u{1F382} *NUEVO PEDIDO - F\u{C1}BRICA DE TORTAS*",
    `\u{1F464} *Cliente:* ${order.customerName}`,
    `\u{1F4DE} *Tel\u{E9}fono:* ${order.phone}`,
    `\u{1F69A} *Entrega:* ${order.delivery}`,
    `\u{1F4C5} *Fecha:* ${order.date} - ${order.time} hs`,
    "",
    "\u{1F4CB} *Detalle del Pedido:*",
    ...order.items.map(({ product, quantity }) => `\u{2022} ${quantity}x ${product.name} (${price(product.price)})`),
    "",
  ];

  if (order.dedication?.trim()) {
    lines.push(`\u{270D}\u{FE0F} *Dedicatoria:* "${order.dedication}"`);
  }
  lines.push(`\u{1F4B0} *TOTAL:* ${price(total)}`);

  return lines.join("\n");
}
