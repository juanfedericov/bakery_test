"use client";

import { useState } from "react";

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
};

export default function Catalog({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const visibleProducts = selectedCategory === null
    ? products
    : products.filter((product) => product.categoryId === selectedCategory);

  return (
    <>
      {categories.length > 0 && (
        <div className="catalog-filters" role="group" aria-label="Filtrar por categoría">
          <button
            type="button"
            className="catalog-filter"
            aria-pressed={selectedCategory === null}
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className="catalog-filter"
              aria-pressed={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}
      <div aria-live="polite" aria-atomic="true">
        {visibleProducts.length === 0 ? (
          <p className="catalog-message">
            {selectedCategory === null
              ? "Todavía no hay productos en el catálogo."
              : "No hay productos en esta categoría."}
          </p>
        ) : (
          <ul className="product-list">
            {visibleProducts.map((product) => (
              <li key={product.id} className="product-card">
                <h3>{product.name}</h3>
                {product.description && <p>{product.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
