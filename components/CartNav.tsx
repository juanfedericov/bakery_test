"use client";

import { useEffect, useState } from "react";
import CartDrawer from "./CartDrawer";
import { useCart } from "./CartProvider";
import { useCartStore } from "@/lib/store/useCartStore";

export default function CartNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { notify } = useCart();
  const items = useCartStore((state) => state.items);
  const removeProduct = useCartStore((state) => state.removeProduct);
  const count = items.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    if (!useCartStore.persist.hasHydrated()) void useCartStore.persist.rehydrate();
  }, []);

  return (
    <nav aria-label="Navegación principal">
      <button type="button" className="header-cart" onClick={() => setIsOpen(true)} aria-haspopup="dialog" aria-label={`Carrito: ${count} ${count === 1 ? "producto" : "productos"}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 4h2l2 11h10l3-8H6" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="17" cy="19" r="1" />
        </svg>
        Carrito <span className="cart-badge" aria-hidden="true">{count}</span>
      </button>
      {isOpen && (
        <CartDrawer
          items={items}
          onClose={() => setIsOpen(false)}
          onRemove={(product) => {
            removeProduct(product.id);
            notify(`${product.name} eliminado del carrito.`);
          }}
        />
      )}
    </nav>
  );
}
