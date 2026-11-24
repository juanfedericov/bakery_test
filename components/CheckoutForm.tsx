"use client";

import { useEffect, useState } from "react";
import { buildWhatsAppMessage } from "@/lib/buildWhatsAppMessage";
import { useCartStore } from "@/lib/store/useCartStore";

type AvailabilityStatus = "idle" | "loading" | "loaded" | "error";

interface AvailabilityResponse {
  date: string;
  deliveryMethod: string;
  slots: string[];
}

function isAvailabilityResponse(
  value: unknown,
  date: string,
  deliveryMethod: string,
): value is AvailabilityResponse {
  if (typeof value !== "object" || value === null) return false;
  const response = value as Record<string, unknown>;
  return response.date === date
    && response.deliveryMethod === deliveryMethod
    && Array.isArray(response.slots)
    && response.slots.every((slot) => typeof slot === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(slot));
}

function getTodayDate(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default function CheckoutForm({ whatsappNumber }: { whatsappNumber: string }) {
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("idle");
  const [cartReady, setCartReady] = useState(false);
  const [message, setMessage] = useState("");
  const items = useCartStore((state) => state.items);
  const targetWhatsAppNumber = whatsappNumber.trim();
  const isWhatsAppNumberConfigured = /^\d+$/.test(targetWhatsAppNumber);
  const todayDate = getTodayDate();

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    if (!deliveryDate || !deliveryMethod) return;
    async function loadAvailability() {
      const params = new URLSearchParams({ date: deliveryDate, deliveryMethod });
      try {
        const response = await fetch(`/api/availability?${params.toString()}`, {
          signal: controller.signal,
        });
        const body: unknown = await response.json();
        if (!response.ok) {
          const errorMessage = typeof body === "object" && body !== null
            && "error" in body && typeof body.error === "string"
            ? body.error
            : "No se pudieron consultar los turnos disponibles. Intentá nuevamente.";
          throw new Error(errorMessage);
        }
        if (!isAvailabilityResponse(body, deliveryDate, deliveryMethod)) {
          throw new Error("La respuesta de turnos no es válida. Intentá nuevamente.");
        }
        if (!active) return;
        setAvailableSlots(body.slots);
        setAvailabilityStatus("loaded");
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        console.error("No se pudieron consultar los turnos disponibles.", error);
        setAvailabilityStatus("error");
        setMessage(error instanceof Error
          ? error.message
          : "No se pudieron consultar los turnos disponibles. Intentá nuevamente.");
      }
    }

    void loadAvailability();
    return () => {
      active = false;
      controller.abort();
    };
  }, [deliveryDate, deliveryMethod]);

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
        if (!isWhatsAppNumberConfigured) {
          setMessage("El número de WhatsApp no está configurado correctamente.");
          return;
        }
        const cart = useCartStore.getState();
        if (!cartReady || cart.items.length === 0) {
          setMessage("Agregá productos al carrito antes de enviar el pedido.");
          return;
        }
        if (!deliveryDate || deliveryDate < todayDate || !deliveryMethod) {
          setMessage("Elegí una fecha y un método de entrega.");
          return;
        }
        if (
          availabilityStatus !== "loaded"
          || !selectedSlot
          || !availableSlots.includes(selectedSlot)
        ) {
          setMessage("Elegí un turno disponible antes de enviar el pedido.");
          return;
        }

        const data = new FormData(event.currentTarget);
        const [year, month, day] = deliveryDate.split("-");
        const delivery = deliveryMethod === "delivery"
          ? `Envío: ${String(data.get("address")).trim()}`
          : "Retiro en local";
        const text = buildWhatsAppMessage({
          customerName: String(data.get("name")).trim(),
          phone: String(data.get("phone")).trim(),
          delivery,
          date: `${day}/${month}/${year}`,
          time: selectedSlot,
          items: cart.items,
        });

        const whatsappUrl = new URL(`https://wa.me/${targetWhatsAppNumber}`);
        whatsappUrl.searchParams.set("text", text);
        const opened = window.open(whatsappUrl.toString(), "_blank");
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
        <select id="checkout-delivery" name="deliveryMethod" required value={deliveryMethod} onChange={(event) => {
          const nextMethod = event.target.value;
          setDeliveryMethod(nextMethod);
          setSelectedSlot("");
          setAvailableSlots([]);
          setAvailabilityStatus(deliveryDate && nextMethod ? "loading" : "idle");
          setMessage("");
        }}>
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
        <label htmlFor="checkout-date">Fecha de entrega</label>
        <input id="checkout-date" name="deliveryDate" type="date" min={todayDate} required value={deliveryDate} onChange={(event) => {
          const nextDate = event.target.value;
          setDeliveryDate(nextDate);
          setSelectedSlot("");
          setAvailableSlots([]);
          setAvailabilityStatus(nextDate && deliveryMethod ? "loading" : "idle");
          setMessage("");
        }} />
      </div>
      <div className="checkout-field">
        <label htmlFor="checkout-slot">Turno disponible</label>
        <select
          id="checkout-slot"
          name="deliverySlot"
          required
          value={selectedSlot}
          disabled={availabilityStatus !== "loaded" || availableSlots.length === 0}
          onChange={(event) => setSelectedSlot(event.target.value)}
        >
          <option value="">
            {availabilityStatus === "loading"
              ? "Consultando turnos..."
              : availabilityStatus === "error"
                ? "No se pudieron cargar los turnos"
                : availableSlots.length === 0 && availabilityStatus === "loaded"
                  ? "No hay turnos disponibles"
                  : "Seleccioná un turno"}
          </option>
          {availableSlots.map((slot) => <option key={slot} value={slot}>{slot} hs</option>)}
        </select>
      </div>
      <p className="checkout-required">El turno elegido es una solicitud y no queda reservado hasta que te lo confirmemos.</p>
      {availabilityStatus === "loaded" && availableSlots.length === 0 && deliveryDate && deliveryMethod && (
        <p className="checkout-note" role="status">No hay turnos disponibles para esa fecha y método de entrega.</p>
      )}
      <button
        type="submit"
        className="checkout-submit"
        disabled={
          !isWhatsAppNumberConfigured
          || !cartReady
          || items.length === 0
          || !deliveryDate
          || deliveryDate < todayDate
          || !deliveryMethod
          || availabilityStatus !== "loaded"
          || !selectedSlot
          || !availableSlots.includes(selectedSlot)
        }
      >
        Confirmar y Enviar Pedido por WhatsApp
      </button>
      <p className="checkout-note" role="status">
        {message || (!isWhatsAppNumberConfigured ? "El número de WhatsApp no está configurado." : cartReady && items.length === 0 ? "Tu carrito está vacío. Agregá productos antes de enviar el pedido." : "")}
      </p>
    </form>
  );
}
