"use client";

import { useState } from "react";
import ProductDetailModal, { type ProductDetail } from "./ProductDetailModal";

export default function ProductCatalog({ products }: { products: ProductDetail[] }) {
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <>
      <ul className="product-list">
        {products.map((product) => (
          <li key={product.id} className="product-card">
            <button type="button" className="product-card-button" onClick={() => setSelectedProduct(product)}>
              <h3>{product.name}</h3>
              {product.description && <p>{product.description}</p>}
              <span className="product-card-link">Ver detalle <span aria-hidden="true">↗</span></span>
            </button>
          </li>
        ))}
      </ul>
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          notes={notes[selectedProduct.id] ?? ""}
          onNotesChange={(value) => setNotes((current) => ({ ...current, [selectedProduct.id]: value }))}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}
