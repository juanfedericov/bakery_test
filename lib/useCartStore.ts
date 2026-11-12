import { useState } from "react";
import type { CatalogProduct } from "@/components/ProductCard";

export function useCartStore(products: CatalogProduct[]) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const items = products
    .filter((product) => quantities[product.id] > 0)
    .map((product) => ({
      product,
      quantity: quantities[product.id],
      subtotalInCents: Math.round(product.price * 100) * quantities[product.id],
    }));
  const count = items.reduce((total, item) => total + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.subtotalInCents, 0) / 100;

  function addProduct(product: CatalogProduct) {
    setQuantities((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }));
  }

  function removeProduct(product: CatalogProduct) {
    setQuantities((current) => {
      const next = { ...current };
      delete next[product.id];
      return next;
    });
  }

  return { items, quantities, count, total, addProduct, removeProduct };
}
