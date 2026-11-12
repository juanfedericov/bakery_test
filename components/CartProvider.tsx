"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import CartDrawer, { type CartItem } from "./CartDrawer";
import type { CatalogProduct } from "./ProductCard";

type CartContextValue = {
  items: CartItem[];
  addProduct: (product: CatalogProduct) => void;
  openCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart debe utilizarse dentro de CartProvider.");
  return cart;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  function addProduct(product: CatalogProduct) {
    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      return existing
        ? current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { product, quantity: 1 }];
    });
    setAnnouncement(`${product.name} agregado al carrito.`);
  }

  function changeQuantity(product: CatalogProduct, change: number) {
    setItems((current) => current
      .map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + change } : item)
      .filter((item) => item.quantity > 0));
    setAnnouncement(change > 0 ? `Cantidad de ${product.name} aumentada.` : `Cantidad de ${product.name} reducida.`);
  }

  function removeProduct(product: CatalogProduct) {
    setItems((current) => current.filter((item) => item.product.id !== product.id));
    setAnnouncement(`${product.name} eliminado del carrito.`);
  }

  return (
    <CartContext.Provider value={{ items, addProduct, openCart: () => setIsOpen(true) }}>
      {children}
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      {isOpen && (
        <CartDrawer
          items={items}
          onClose={() => setIsOpen(false)}
          onIncrease={(product) => changeQuantity(product, 1)}
          onDecrease={(product) => changeQuantity(product, -1)}
          onRemove={removeProduct}
        />
      )}
    </CartContext.Provider>
  );
}

export function CartButton() {
  const { items, openCart } = useCart();
  const count = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <button type="button" className="cart-button" onClick={openCart} aria-label={`Abrir carrito: ${count} ${count === 1 ? "producto" : "productos"}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4h2l2.2 10h10.9l2-7H6" />
        <circle cx="9" cy="19" r="1" /><circle cx="17" cy="19" r="1" />
      </svg>
      <span>{count}</span>
    </button>
  );
}
