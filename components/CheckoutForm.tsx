"use client";

import { useState } from "react";

export default function CheckoutForm() {
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [validated, setValidated] = useState(false);

  return (
    <form
      className="checkout-form"
      onChange={() => setValidated(false)}
      onSubmit={(event) => {
        event.preventDefault();
        setValidated(true);
      }}
    >
      <p className="checkout-required">Todos los campos son obligatorios.</p>
      <div className="checkout-field">
        <label htmlFor="checkout-name">Nombre</label>
        <input id="checkout-name" name="name" autoComplete="name" required pattern=".*\S.*" title="Ingresá tu nombre." />
      </div>
      <div className="checkout-field">
        <label htmlFor="checkout-phone">Teléfono</label>
        <input id="checkout-phone" name="phone" type="tel" autoComplete="tel" required pattern=".*\S.*" title="Ingresá tu teléfono." />
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
          <input id="checkout-address" name="address" autoComplete="street-address" required pattern=".*\S.*" title="Ingresá la dirección de entrega." />
        </div>
      )}
      <div className="checkout-field">
        <label htmlFor="checkout-datetime">Fecha y hora estimada de entrega</label>
        <input id="checkout-datetime" name="deliveryDateTime" type="datetime-local" required />
      </div>
      <button type="submit" className="checkout-submit">Validar datos</button>
      <p className="checkout-note" role="status">
        {validated
          ? "Los datos están completos, pero todavía no se guardan ni se envía el pedido."
          : "Completar este formulario todavía no envía ni guarda el pedido."}
      </p>
    </form>
  );
}
