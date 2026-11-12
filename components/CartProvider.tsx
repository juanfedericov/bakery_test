"use client";

import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";

type CartState = {
  toast: { id: number; message: string } | null;
  nextToastId: number;
};

type CartAction =
  | { type: "notify"; message: string }
  | { type: "dismiss"; id: number };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "notify":
      return {
        toast: { id: state.nextToastId, message: action.message },
        nextToastId: state.nextToastId + 1,
      };
    case "dismiss":
      return state.toast?.id === action.id ? { ...state, toast: null } : state;
  }
}

const CartContext = createContext<{ notify: (message: string) => void } | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { toast: null, nextToastId: 0 });

  useEffect(() => {
    if (!state.toast) return;
    const id = state.toast.id;
    const timeout = setTimeout(() => dispatch({ type: "dismiss", id }), 4000);
    return () => clearTimeout(timeout);
  }, [state.toast]);

  return (
    <CartContext.Provider value={{ notify: (message) => dispatch({ type: "notify", message }) }}>
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
