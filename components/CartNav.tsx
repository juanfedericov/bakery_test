"use client";

import { useCart } from "./CartProvider";

export default function CartNav() {
  const { count } = useCart();

  return (
    <nav aria-label="Navegación principal">
      <a className="header-cart" href="#carrito" aria-label={`Carrito: ${count} ${count === 1 ? "producto" : "productos"}`}>
        Carrito <span className="cart-badge" aria-hidden="true">{count}</span>
      </a>
    </nav>
  );
}
