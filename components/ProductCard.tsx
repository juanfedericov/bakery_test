import Image from "next/image";
import { useState } from "react";
import type { ProductDetail } from "./ProductDetailModal";

export type CatalogProduct = ProductDetail & {
  categoryId: string;
  imageUrl: string | null;
  price: number;
};

const integerPriceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const decimalPriceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(price: number) {
  return (Number.isInteger(price) ? integerPriceFormatter : decimalPriceFormatter).format(price);
}

export default function ProductCard({
  product,
  onAdd,
  onSelect,
}: {
  product: CatalogProduct;
  onAdd: () => void;
  onSelect: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <article className="product-card">
      <button type="button" className="product-card-button" onClick={onSelect} aria-label={`Ver detalle de ${product.name}`}>
        <div className="product-image">
          {product.imageUrl && !imageFailed ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 700px) 88vw, 390px"
              className="product-image-photo"
              onError={() => {
                console.error(`No se pudo cargar la imagen del producto ${product.id}.`);
                setImageFailed(true);
              }}
            />
          ) : (
            <span>Imagen no disponible</span>
          )}
        </div>
        <div className="product-details">
          <h3>{product.name}</h3>
          {product.description && <p className="product-description">{product.description}</p>}
          <p className="product-price">{formatPrice(product.price)}</p>
          <span className="product-card-link">Ver detalle <span aria-hidden="true">↗</span></span>
        </div>
      </button>
      <div className="product-actions">
        <button
          type="button"
          className="product-add"
          aria-label={`Agregar ${product.name} al carrito`}
          onClick={onAdd}
        >
          Agregar al Carrito
        </button>
      </div>
    </article>
  );
}
