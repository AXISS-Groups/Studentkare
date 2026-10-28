import React, { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';
import { CartAction, CartState, cartReducer, emptyCart } from '../datasets/marketplaceCart';

const CartContext = createContext<CartState | null>(null);
const CartDispatchContext = createContext<Dispatch<CartAction> | null>(null);

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, emptyCart);
  return <CartContext.Provider value={state}>
    <CartDispatchContext.Provider value={dispatch}>{children}</CartDispatchContext.Provider>
  </CartContext.Provider>;
}

export function useMarketplace() {
  const cart = useContext(CartContext);
  const dispatch = useContext(CartDispatchContext);
  if (!cart || !dispatch) throw new Error('useMarketplace must be used within MarketplaceProvider');
  return { cart, dispatch };
}
