import { formatPrice } from "../../lib/formatPrice";

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
};

export function buildWhatsAppMessage(order: WhatsAppOrder): string {
  const price = (amount: number) => formatPrice(amount).replace(/\s/g, "");
  const total = order.items.reduce(
    (sum, item) => sum + Math.round(item.product.price * 100) * item.quantity,
    0,
  ) / 100;

  return [
    "\uD83C\uDF82 *NUEVO PEDIDO - FÁBRICA DE TORTAS*",
    `\uD83D\uDC64 *Cliente:* ${order.customerName}`,
    `\uD83D\uDCDE *Teléfono:* ${order.phone}`,
    `\uD83D\uDE9A *Entrega:* ${order.delivery}`,
    `\uD83D\uDCC5 *Fecha:* ${order.date} - ${order.time} hs`,
    "",
    "\uD83D\uDCCB *Detalle del Pedido:*",
    ...order.items.map(({ product, quantity }) => `• ${quantity}x ${product.name} (${price(product.price)})`),
    "",
    `\uD83D\uDCB0 *TOTAL:* ${price(total)}`,
  ].join("\n");
}
