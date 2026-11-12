import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type OrderInput = {
  customerName: string;
  phone: string;
  deliveryMethod: "pickup" | "delivery";
  address?: string;
  deliveryDateTime: string;
  dedication?: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
};

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isLocalDateTime(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 16) === value;
}

function isOrderInput(value: unknown): value is OrderInput {
  if (!value || typeof value !== "object") return false;
  const order = value as Record<string, unknown>;
  if (!isText(order.customerName, 200) || !isText(order.phone, 50)
    || (order.deliveryMethod !== "pickup" && order.deliveryMethod !== "delivery")
    || (order.deliveryMethod === "delivery" && !isText(order.address, 500))
    || (order.address !== undefined && (typeof order.address !== "string" || order.address.length > 500))
    || !isText(order.deliveryDateTime, 16)
    || !isLocalDateTime(order.deliveryDateTime)
    || (order.dedication !== undefined && (typeof order.dedication !== "string" || order.dedication.length > 500))
    || !Array.isArray(order.items) || order.items.length === 0 || order.items.length > 100) return false;

  const ids = new Set<string>();
  return order.items.every((item: unknown) => {
    if (!item || typeof item !== "object") return false;
    const line = item as Record<string, unknown>;
    if (!isText(line.productId, 200) || ids.has(line.productId)
      || typeof line.quantity !== "number" || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 1000
      || typeof line.unitPrice !== "number" || !Number.isFinite(line.unitPrice)
      || line.unitPrice < 0 || line.unitPrice > 99999999.99) return false;
    ids.add(line.productId);
    return true;
  });
}

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "El pedido no contiene JSON válido." }, { status: 400 });
  }
  if (!isOrderInput(input)) {
    return Response.json({ error: "Los datos del pedido no son válidos." }, { status: 400 });
  }

  try {
    const products = await prisma.product.findMany({
      where: { id: { in: input.items.map((item) => item.productId) } },
      select: { id: true, name: true, price: true },
    });
    const productsById = new Map(products.map((product) => [product.id, product]));
    const items = input.items.map((item) => ({ ...item, product: productsById.get(item.productId) }));
    if (items.some((item) => !item.product || !item.product.price.equals(item.unitPrice))) {
      return Response.json({ error: "Los productos o sus precios cambiaron. Quitalos del carrito y agregalos nuevamente antes de continuar." }, { status: 409 });
    }

    const orderItems = items.map((item) => {
      const product = productsById.get(item.productId)!;
      return { product, quantity: item.quantity };
    });
    const total = orderItems.reduce(
      (sum, item) => sum.plus(item.product.price.mul(item.quantity)),
      new Prisma.Decimal(0),
    );
    if (total.greaterThan("9999999999.99")) {
      return Response.json({ error: "El total del pedido supera el máximo permitido." }, { status: 400 });
    }
    const order = await prisma.order.create({
      data: {
        customerName: input.customerName.trim(),
        phone: input.phone.trim(),
        deliveryMethod: input.deliveryMethod,
        address: input.deliveryMethod === "delivery" ? input.address!.trim() : null,
        deliveryDateTime: input.deliveryDateTime,
        dedication: input.dedication?.trim() || null,
        total,
        status: "Pendiente",
        items: {
          create: orderItems.map(({ product, quantity }) => ({
            productId: product.id,
            quantity,
            unitPrice: product.price,
          })),
        },
      },
      select: { id: true },
    });
    return Response.json({
      id: order.id,
      items: orderItems.map(({ product, quantity }) => ({
        product: { name: product.name, price: product.price.toNumber() },
        quantity,
      })),
    }, { status: 201 });
  } catch (error) {
    console.error("No se pudo guardar el pedido:", error);
    return Response.json({ error: "No se pudo guardar el pedido. Intentá nuevamente." }, { status: 500 });
  }
}
