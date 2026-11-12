"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { formatPrice, type CatalogProduct } from "./ProductCard";

export type CartItem = { product: CatalogProduct; quantity: number };

function CartItemImage({ product }: { product: CatalogProduct }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="cart-item-image">
      {product.imageUrl && !imageFailed ? (
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="80px"
          className="product-image-photo"
          onError={() => {
            console.error(`No se pudo cargar la imagen del producto ${product.id}.`);
            setImageFailed(true);
          }}
        />
      ) : <span>Imagen no disponible</span>}
    </div>
  );
}

export default function CartDrawer({
  items, onClose, onIncrease, onDecrease, onRemove,
}: {
  items: CartItem[];
  onClose: () => void;
  onIncrease: (product: CatalogProduct) => void;
  onDecrease: (product: CatalogProduct) => void;
  onRemove: (product: CatalogProduct) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const subtotal = items.reduce((total, item) => total + Math.round(item.product.price * 100) * item.quantity, 0) / 100;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="cart-drawer"
      aria-labelledby="cart-drawer-title"
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.close();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className="cart-drawer-content">
        <header className="cart-drawer-header">
          <div>
            <p className="eyebrow">Un momento dulce</p>
            <h2 id="cart-drawer-title">Tu carrito</h2>
          </div>
          <button type="button" className="cart-drawer-close" onClick={() => dialogRef.current?.close()} aria-label="Cerrar carrito">
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="cart-drawer-items">
          {items.length === 0 ? (
            <p className="cart-empty">Tu carrito está vacío. Agregá algo rico para compartir.</p>
          ) : (
            <ul>
              {items.map(({ product, quantity }) => (
                <li className="cart-item" key={product.id}>
                  <CartItemImage product={product} />
                  <div className="cart-item-details">
                    <h3>{product.name}</h3>
                    <p>{formatPrice(product.price)} por unidad</p>
                    <div className="cart-item-actions">
                      <div className="cart-quantity" aria-label={`Cantidad de ${product.name}`}>
                        <button type="button" onClick={() => onDecrease(product)} aria-label={`Disminuir cantidad de ${product.name}`}>−</button>
                        <span>{quantity}</span>
                        <button type="button" onClick={() => onIncrease(product)} aria-label={`Aumentar cantidad de ${product.name}`}>+</button>
                      </div>
                      <button type="button" className="cart-remove" onClick={() => onRemove(product)}>Quitar <span className="sr-only">{product.name}</span></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="cart-drawer-footer">
          <div className="cart-subtotal"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
          <button type="button" className="cart-checkout" disabled>Ir a pagar</button>
          <p>El checkout todavía no está disponible.</p>
        </footer>
      </div>
    </dialog>
  );
}
