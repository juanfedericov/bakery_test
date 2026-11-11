"use client";

import { useState } from "react";
import ProductGrid from "./ProductGrid";
import type { CatalogProduct } from "./ProductCard";

type Category = { id: string; name: string };

export default function Catalog({
  categories,
  products,
}: {
  categories: Category[];
  products: CatalogProduct[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
      <ProductGrid products={products} selectedCategory={selectedCategory} />
    </>
  );
}
