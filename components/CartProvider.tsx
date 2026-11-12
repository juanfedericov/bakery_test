"use client";

import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";

type CartState = {
  quantities: Record<string, number>;
  toast: { id: number; message: string } | null;
  nextToastId: number;
};

type CartAction =
  | { type: "add"; id: string; name: string }
  | { type: "remove"; id: string }
  | { type: "dismiss"; id: number };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const quantity = (state.quantities[action.id] ?? 0) + 1;
      return {
        quantities: { ...state.quantities, [action.id]: quantity },
        toast: { id: state.nextToastId, message: `${action.name} agregado al carrito. Cantidad: ${quantity}.` },
        nextToastId: state.nextToastId + 1,
      };
    }
    case "remove": {
      const quantities = { ...state.quantities };
      delete quantities[action.id];
      return { ...state, quantities };
    }
    case "dismiss":
      return state.toast?.id === action.id ? { ...state, toast: null } : state;
  }
}

const CartContext = createContext<{
  quantities: Record<string, number>;
  count: number;
  addProduct: (id: string, name: string) => void;
  removeProduct: (id: string) => void;
} | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { quantities: {}, toast: null, nextToastId: 0 });

  useEffect(() => {
    if (!state.toast) return;
    const id = state.toast.id;
    const timeout = setTimeout(() => dispatch({ type: "dismiss", id }), 4000);
    return () => clearTimeout(timeout);
  }, [state.toast]);

  return (
    <CartContext.Provider value={{
      quantities: state.quantities,
      count: Object.values(state.quantities).reduce((total, quantity) => total + quantity, 0),
      addProduct: (id, name) => dispatch({ type: "add", id, name }),
      removeProduct: (id) => dispatch({ type: "remove", id }),
    }}>
      {children}
      <div className="cart-toast-region" role="status" aria-live="polite" aria-atomic="true">
        {state.toast && <p className="cart-toast">{state.toast.message}</p>}
      </div>
    </CartContext.Provider>
  );
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart debe usarse dentro de CartProvider.");
  return cart;
}
