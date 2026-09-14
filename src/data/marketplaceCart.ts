import { itemById } from './marketplaceCatalog';

export type DemoCity = 'Hyderabad' | 'Bengaluru' | 'New Delhi';
export interface CartState {
  items: { id: string; quantity: number }[];
  coupon: '' | 'CARE10';
  city: DemoCity;
  deliveryMode: 'delivery' | 'pickup';
  samplePrescription: boolean;
}

export const emptyCart: CartState = {
  items: [], coupon: '', city: 'Hyderabad', deliveryMode: 'delivery', samplePrescription: false,
};

export type CartAction =
  | { type: 'add'; id: string }
  | { type: 'quantity'; id: string; quantity: number }
  | { type: 'remove'; id: string }
  | { type: 'coupon'; code: string }
  | { type: 'city'; city: DemoCity }
  | { type: 'delivery'; mode: CartState['deliveryMode'] }
  | { type: 'sample-prescription' }
  | { type: 'clear' };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const item = itemById(action.id);
      if (!item || (item.requiresPrescription && !state.samplePrescription)) return state;
      const existing = state.items.find(line => line.id === item.id);
      const limit = item.kind === 'product' ? 10 : 1;
      if (existing && existing.quantity >= limit) return state;
      return {
        ...state,
        items: existing
          ? state.items.map(line => line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line)
          : [...state.items, { id: item.id, quantity: 1 }],
      };
    }
    case 'quantity': {
      if (!Number.isInteger(action.quantity) || action.quantity < 0) return state;
      const item = itemById(action.id);
      if (!item) return state;
      return {
        ...state,
        items: state.items.map(line => line.id === action.id
          ? { ...line, quantity: Math.min(action.quantity, item.kind === 'product' ? 10 : 1) } : line)
          .filter(line => line.quantity > 0),
      };
    }
    case 'remove': return { ...state, items: state.items.filter(line => line.id !== action.id) };
    case 'coupon': {
      const code = action.code.trim().toUpperCase();
      return code === 'CARE10' || code === '' ? { ...state, coupon: code } : state;
    }
    case 'city': return { ...state, city: action.city };
    case 'delivery': return { ...state, deliveryMode: action.mode };
    case 'sample-prescription': return { ...state, samplePrescription: true };
    case 'clear': return { ...emptyCart, city: state.city, deliveryMode: state.deliveryMode };
  }
}

export function calculateCart(state: CartState) {
  const lines = state.items.flatMap(line => {
    const item = itemById(line.id);
    return item ? [{ ...line, item }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const mrp = lines.reduce((sum, line) => sum + line.item.mrp * line.quantity, 0);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const physicalSubtotal = lines.filter(line => line.item.kind === 'product')
    .reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const delivery = state.deliveryMode === 'delivery' && physicalSubtotal > 0 && physicalSubtotal < 399 ? 40 : 0;
  const discountPaise = state.coupon === 'CARE10' ? Math.min(Math.round(subtotal * 100 * 0.1), 15000) : 0;
  const discount = discountPaise / 100;
  const total = (Math.round((subtotal + delivery) * 100) - discountPaise) / 100;
  const savings = (Math.round((mrp - subtotal) * 100) + discountPaise) / 100;
  return { lines, count, subtotal, mrp, delivery, discount, savings, total };
}
