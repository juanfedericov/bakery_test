import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { POST } from "../app/api/orders/route";
import { prisma } from "../lib/prisma";

const validOrder = {
  customerName: " Ana ", phone: "12345", deliveryMethod: "delivery",
  address: " Calle 123 ", deliveryDateTime: "2026-12-20T14:30", dedication: "Feliz día",
  items: [{ productId: "rogel", quantity: 2, unitPrice: 100.25 }],
};

function request(body: unknown) {
  return new Request("http://localhost/api/orders", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

test("guarda los datos y precios del catálogo y devuelve los ítems para WhatsApp", async (t) => {
  const findMany = prisma.product.findMany;
  const create = prisma.order.create;
  t.after(() => {
    Object.defineProperty(prisma.product, "findMany", { value: findMany, configurable: true, writable: true });
    Object.defineProperty(prisma.order, "create", { value: create, configurable: true, writable: true });
  });
  Object.defineProperty(prisma.product, "findMany", { configurable: true, writable: true, value: async () => [
    { id: "rogel", name: "Rogel", price: new Prisma.Decimal("100.25") },
  ] });
  let saved: Prisma.OrderCreateArgs | undefined;
  Object.defineProperty(prisma.order, "create", { configurable: true, writable: true, value: async (args: Prisma.OrderCreateArgs) => {
    saved = args;
    return { id: "order-1" };
  } });
  const response = await POST(request(validOrder));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    id: "order-1", items: [{ product: { name: "Rogel", price: 100.25 }, quantity: 2 }],
  });
  assert.ok(saved);
  const data = saved.data;
  assert.equal(data.customerName, "Ana");
  assert.equal(data.address, "Calle 123");
  assert.equal(data.status, "Pendiente");
  assert.equal(data.total?.toString(), "200.5");
  assert.deepEqual(data.items, {
    create: [{ productId: "rogel", quantity: 2, unitPrice: new Prisma.Decimal("100.25") }],
  });
});

test("rechaza datos inválidos y precios o productos desactualizados sin guardar", async (t) => {
  const findMany = prisma.product.findMany;
  const create = prisma.order.create;
  t.after(() => {
    Object.defineProperty(prisma.product, "findMany", { value: findMany, configurable: true, writable: true });
    Object.defineProperty(prisma.order, "create", { value: create, configurable: true, writable: true });
  });
  Object.defineProperty(prisma.product, "findMany", { configurable: true, writable: true, value: async () => [
    { id: "rogel", name: "Rogel", price: new Prisma.Decimal("101") },
  ] });
  let createCount = 0;
  Object.defineProperty(prisma.order, "create", { configurable: true, writable: true, value: async () => {
    createCount++;
    return { id: "order-1" };
  } });
  for (const body of [
    { ...validOrder, items: [] },
    { ...validOrder, address: " " },
    { ...validOrder, deliveryDateTime: "2026-02-30T14:30" },
    { ...validOrder, items: [{ ...validOrder.items[0], quantity: -1 }] },
    { ...validOrder, items: [validOrder.items[0], validOrder.items[0]] },
  ]) {
    assert.equal((await POST(request(body))).status, 400);
  }
  assert.equal((await POST(request(validOrder))).status, 409);
  assert.equal((await POST(request({ ...validOrder, items: [{ ...validOrder.items[0], productId: "missing" }] }))).status, 409);
  assert.equal(createCount, 0);
});

test("informa los errores de base de datos sin confirmar el pedido", async (t) => {
  const findMany = prisma.product.findMany;
  const create = prisma.order.create;
  t.after(() => {
    Object.defineProperty(prisma.product, "findMany", { value: findMany, configurable: true, writable: true });
    Object.defineProperty(prisma.order, "create", { value: create, configurable: true, writable: true });
  });
  Object.defineProperty(prisma.product, "findMany", { configurable: true, writable: true, value: async () => [
    { id: "rogel", name: "Rogel", price: new Prisma.Decimal("100.25") },
  ] });
  Object.defineProperty(prisma.order, "create", { configurable: true, writable: true, value: async () => { throw new Error("database unavailable"); } });
  const log = t.mock.method(console, "error", () => {});
  const response = await POST(request(validOrder));
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /No se pudo guardar/);
  assert.equal(log.mock.callCount(), 1);
});
