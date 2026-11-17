import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "convex/react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isOpenAt } from "@/convex/lib/hours";
import { MAX_QUANTITY } from "@/convex/lib/pricing";

export type CartSelection = { groupKey: string; optionKeys: string[] };

export type CartLine = {
  key: string;
  productId: Id<"products">;
  shopId: Id<"shops">;
  shopName: string;
  name: string;
  emoji: string;
  optionsLabel: string;
  selections: CartSelection[];
  unitPrice: number;
  quantity: number;
};

type CartShop = { id: Id<"shops">; name: string };

type CartState = {
  lines: CartLine[];
  add: (shop: CartShop, line: Omit<CartLine, "key" | "shopId" | "shopName">) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  clearShop: (shopId: Id<"shops">) => void;
};

function lineKey(productId: string, selections: CartSelection[]) {
  const normalized = selections
    .map((s) => `${s.groupKey}:${[...s.optionKeys].sort().join(",")}`)
    .sort()
    .join("|");
  return `${productId}#${normalized}`;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (shop, line) =>
        set((state) => {
          const key = lineKey(line.productId, line.selections);
          const existing = state.lines.find((l) => l.key === key);
          return {
            lines: existing
              ? state.lines.map((l) =>
                  l.key === key ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + line.quantity) } : l,
                )
              : [...state.lines, { ...line, shopId: shop.id, shopName: shop.name, key }],
          };
        }),
      setQuantity: (key, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QUANTITY, quantity) } : l)),
        })),
      clear: () => set({ lines: [] }),
      clearShop: (shopId) => set((state) => ({ lines: state.lines.filter((l) => l.shopId !== shopId) })),
    }),
    { name: "cart", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
}

export function cartShops(lines: CartLine[]) {
  const seen = new Map<string, CartShop>();
  for (const line of lines) {
    if (!seen.has(line.shopId)) seen.set(line.shopId, { id: line.shopId, name: line.shopName });
  }
  return [...seen.values()];
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

