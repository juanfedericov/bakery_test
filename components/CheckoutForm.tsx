"use client";

import { useEffect, useState } from "react";
import { buildWhatsAppUrl } from "@/lib/buildWhatsAppUrl";
import { useCartStore } from "@/lib/store/useCartStore";

const FACTORY_WHATSAPP_NUMBER = "5491112345678";

export default function CheckoutForm({ whatsappNumber }: { whatsappNumber: string }) {
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [cartReady, setCartReady] = useState(false);
  const [message, setMessage] = useState("");
  const items = useCartStore((state) => state.items);

  useEffect(() => {
    let active = true;
    async function recoverCart() {
      try {
        if (!useCartStore.persist.hasHydrated()) await useCartStore.persist.rehydrate();
        if (!active) return;
        if (useCartStore.persist.hasHydrated()) setCartReady(true);
        else setMessage("No se pudo recuperar el carrito. Recargá la página para volver a intentar.");
      } catch (error) {
        console.error("No se pudo recuperar el carrito guardado.", error);
        if (active) setMessage("No se pudo recuperar el carrito. Recargá la página para volver a intentar.");
      }
    }
    void recoverCart();
    return () => { active = false; };
  }, []);

  return (
    <form
      className="checkout-form"
      onSubmit={(event) => {
        event.preventDefault();
        const cart = useCartStore.getState();
        if (!cartReady || cart.items.length === 0) {
          setMessage("Agregá productos al carrito antes de enviar el pedido.");
          return;
        }

        const data = new FormData(event.currentTarget);
        const [date, time] = String(data.get("deliveryDateTime")).split("T");
        const [year, month, day] = date.split("-");
        const delivery = deliveryMethod === "delivery"
          ? `Envío: ${String(data.get("address")).trim()}`
          : "Retiro en local";
        const text = buildWhatsAppUrl({
          customerName: String(data.get("name")).trim(),
          phone: String(data.get("phone")).trim(),
          delivery,
          date: `${day}/${month}/${year}`,
          time,
          items: cart.items,
          dedication: cart.cakeDedication,
        });

        const opened = window.open(`https://wa.me/${FACTORY_WHATSAPP_NUMBER}?text=${text}`, "_blank");
        if (!opened) {
          setMessage("No se pudo abrir WhatsApp. Permití las ventanas emergentes y volvé a intentar.");
          return;
        }
        opened.opener = null;
        cart.clearCart();
        setMessage("WhatsApp se abrió en otra pestaña. Revisá y enviá el mensaje para confirmar tu pedido.");
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
      <button type="submit" className="checkout-submit" disabled={!cartReady || items.length === 0}>Confirmar y Enviar Pedido por WhatsApp</button>
      <p className="checkout-note" role="status">
        {message || (cartReady && items.length === 0 ? "Tu carrito está vacío. Agregá productos antes de enviar el pedido." : "")}
      </p>
    </form>
  );
}
