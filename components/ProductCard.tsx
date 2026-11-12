import Image from "next/image";
import { useState } from "react";
import { formatPrice } from "@/lib/formatPrice";
import type { ProductDetail } from "./ProductDetailModal";

export { formatPrice } from "@/lib/formatPrice";

export type CatalogProduct = ProductDetail & {
  categoryId: string;
  imageUrl: string | null;
  price: number;
};

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
