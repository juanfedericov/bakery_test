"use client";

import { useEffect, useRef, useState } from "react";
import { buildWhatsAppUrl } from "@/lib/buildWhatsAppUrl";
import { useCartStore } from "@/lib/store/useCartStore";

export default function CheckoutForm({ whatsappNumber }: { whatsappNumber: string }) {
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);
  const items = useCartStore((state) => state.items);
  const dedication = useCartStore((state) => state.cakeDedication);
  const whatsappConfigured = /^[1-9]\d{7,14}$/.test(whatsappNumber);

  useEffect(() => {
    let active = true;
    Promise.resolve(useCartStore.persist.rehydrate()).then(() => {
      if (active) setHydrated(true);
    }).catch((rehydrationError: unknown) => {
      console.error("No se pudo recuperar el carrito guardado.", rehydrationError);
      if (active) setError("No se pudo recuperar el carrito guardado.");
    });
    return () => { active = false; };
  }, []);

  return (
    <form
      className="checkout-form"
      onChange={() => setError("")}
      onSubmit={async (event) => {
        event.preventDefault();
        if (submittingRef.current || !hydrated || items.length === 0 || !whatsappConfigured) return;
        submittingRef.current = true;
        setSubmitting(true);
        setError("");
        const formData = new FormData(event.currentTarget);
        const customerName = String(formData.get("name")).trim();
        const phone = String(formData.get("phone")).trim();
        const address = String(formData.get("address") ?? "").trim();
        const deliveryDateTime = String(formData.get("deliveryDateTime"));
        let redirecting = false;
        try {
          const response = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerName,
              phone,
              deliveryMethod,
              address,
              deliveryDateTime,
              dedication,
              items: items.map(({ product, quantity }) => ({
                productId: product.id,
                quantity,
                unitPrice: product.price,
              })),
            }),
          });
          const result = await response.json();
          if (!response.ok) {
            setError(typeof result.error === "string" ? result.error : "No se pudo guardar el pedido. Intentá nuevamente.");
            return;
          }
          const [date, time] = deliveryDateTime.split("T");
          const formattedDate = date.split("-").reverse().join("/");
          const delivery = deliveryMethod === "delivery" ? `Envío: ${address}` : "Retiro en local";
          const message = buildWhatsAppUrl({
            customerName, phone, delivery, date: formattedDate, time,
            items: result.items, dedication,
          });
          window.location.assign(`https://wa.me/${whatsappNumber}?text=${message}`);
          redirecting = true;
        } catch (submitError) {
          console.error("No se pudo enviar el pedido:", submitError);
          setError("No se pudo confirmar el envío. Contactanos antes de intentar nuevamente para evitar pedidos duplicados.");
        } finally {
          if (!redirecting) {
            submittingRef.current = false;
            setSubmitting(false);
          }
        }
      }}
    >
      <p className="checkout-required">Todos los campos son obligatorios.</p>
      <div className="checkout-field">
        <label htmlFor="checkout-name">Nombre</label>
        <input id="checkout-name" name="name" autoComplete="name" maxLength={200} required pattern=".*\S.*" title="Ingresá tu nombre." />
      </div>
      <div className="checkout-field">
        <label htmlFor="checkout-phone">Teléfono</label>
        <input id="checkout-phone" name="phone" type="tel" autoComplete="tel" maxLength={50} required pattern=".*\S.*" title="Ingresá tu teléfono." />
      </div>
      <div className="checkout-field">
        <label htmlFor="checkout-delivery">Método de entrega</label>
        <select id="checkout-delivery" name="deliveryMethod" required value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)}>
          <option value="">Seleccioná una opción</option>
          <option value="pickup">Retiro en local</option>
          <option value="delivery">Envío</option>
        </select>
      </div>
      {deliveryMethod === "delivery" && (
        <div className="checkout-field">
          <label htmlFor="checkout-address">Dirección de entrega</label>
          <input id="checkout-address" name="address" autoComplete="street-address" maxLength={500} required pattern=".*\S.*" title="Ingresá la dirección de entrega." />
        </div>
      )}
      <div className="checkout-field">
        <label htmlFor="checkout-datetime">Fecha y hora estimada de entrega</label>
        <input id="checkout-datetime" name="deliveryDateTime" type="datetime-local" required />
      </div>
      <button type="submit" className="checkout-submit" disabled={!hydrated || !items.length || !whatsappConfigured || submitting}>
        {submitting ? "Guardando pedido..." : "Enviar pedido por WhatsApp"}
      </button>
      {!whatsappConfigured && <p className="checkout-note" role="alert">El envío de pedidos no está configurado. Contactanos para hacer tu pedido.</p>}
      {hydrated && items.length === 0 && <p className="checkout-note" role="status">Tu carrito está vacío. Agregá productos antes de enviar el pedido.</p>}
      {error && <p className="checkout-note" role="alert">{error}</p>}
    </form>
  );
}
