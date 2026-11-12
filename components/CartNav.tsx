"use client";

import { useCartStore } from "@/lib/store/useCartStore";

export default function CartNav() {
  const items = useCartStore((state) => state.items);
  const count = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <nav aria-label="Navegación principal">
      <a className="header-cart" href="#carrito" aria-label={`Carrito: ${count} ${count === 1 ? "producto" : "productos"}`}>
        Carrito <span className="cart-badge" aria-hidden="true">{count}</span>
      </a>
    </nav>
  );
}
