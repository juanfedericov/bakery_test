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
    "*NUEVO PEDIDO - FÁBRICA DE TORTAS*",
    `*Cliente:* ${order.customerName}`,
    `*Teléfono:* ${order.phone}`,
    `*Entrega:* ${order.delivery}`,
    `*Fecha:* ${order.date} - ${order.time} hs`,
    "",
    "*Detalle del Pedido:*",
    ...order.items.map(({ product, quantity }) => `• ${quantity}x ${product.name} (${price(product.price)})`),
    "",
  ];

  if (order.dedication?.trim()) {
    lines.push(`*Dedicatoria:* "${order.dedication}"`);
  }
  lines.push(`*TOTAL:* ${price(total)}`);

  return lines.join("\n");
}
