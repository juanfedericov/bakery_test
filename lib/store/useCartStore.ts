import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CatalogProduct } from "@/components/ProductCard";

type CartItem = {
  product: CatalogProduct;
  quantity: number;
};

type CartStore = {
  items: CartItem[];
  addProduct: (product: CatalogProduct) => void;
  removeProduct: (productId: string) => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addProduct: (product) => set((state) => {
        const existing = state.items.find((item) => item.product.id === product.id);
        return {
          items: existing
            ? state.items.map((item) => item.product.id === product.id
              ? { product, quantity: item.quantity + 1 }
              : item)
            : [...state.items, { product, quantity: 1 }],
        };
      }),
      removeProduct: (productId) => set((state) => ({
        items: state.items.filter((item) => item.product.id !== productId),
      })),
    }),
    {
      name: "bakery-cart",
      storage: createJSONStorage(() => ({
        getItem: (key) => window.localStorage.getItem(key),
        setItem: (key, value) => window.localStorage.setItem(key, value),
        removeItem: (key) => window.localStorage.removeItem(key),
      })),
      partialize: (state) => ({ items: state.items }),
      skipHydration: true,
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.error("No se pudo recuperar el carrito guardado.", error);
      },
    },
  ),
);
