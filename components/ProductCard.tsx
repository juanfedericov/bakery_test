import Image from "next/image";
import { useState } from "react";

export type CatalogProduct = {
  id: string;
  name: string;
  description: string | null;
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
}: {
  product: CatalogProduct;
  onAdd: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <article className="product-card">
      <div className="product-image">
        {product.imageUrl && !imageFailed ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 700px) 88vw, (max-width: 1100px) 42vw, 390px"
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
