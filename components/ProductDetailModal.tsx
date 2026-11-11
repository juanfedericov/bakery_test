"use client";

import { useEffect, useRef } from "react";

export type ProductDetail = {
  id: string;
  name: string;
  description: string | null;
  ingredients: string | null;
  servings: string | null;
};

type Props = {
  product: ProductDetail;
  notes: string;
  onNotesChange: (notes: string) => void;
  onClose: () => void;
};

export default function ProductDetailModal({ product, notes, onNotesChange, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="product-modal"
      aria-labelledby="product-modal-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className="product-modal-content">
        <button type="button" className="product-modal-close" onClick={() => dialogRef.current?.close()} aria-label="Cerrar detalle">
          <span aria-hidden="true">×</span>
        </button>
        <p className="eyebrow">Un detalle para compartir</p>
        <h2 id="product-modal-title">{product.name}</h2>
        <p className="product-modal-description">{product.description || "Descripción no disponible."}</p>
        <div className="product-modal-section">
          <h3>Ingredientes</h3>
          <p>{product.ingredients || "Ingredientes no disponibles."}</p>
        </div>
        <div className="product-modal-section">
          <h3>Porciones sugeridas</h3>
          <p>{product.servings || "Porciones no disponibles."}</p>
        </div>
        <div className="product-modal-section">
          <label htmlFor="product-notes">Notas para tu producto <span>(opcional)</span></label>
          <textarea
            id="product-notes"
            rows={3}
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Ej. una dedicatoria especial"
            aria-describedby="product-notes-help"
          />
          <p id="product-notes-help" className="product-notes-help">
            Las notas se conservan mientras navegás esta página; todavía no se envían a un pedido.
          </p>
        </div>
      </div>
    </dialog>
  );
}
