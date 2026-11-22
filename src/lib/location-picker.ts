import { create } from "zustand";
import type { Id } from "@/convex/_generated/dataModel";

export type PickedLocation = {
  lat?: number;
  lng?: number;
  address?: string;
  zoneId?: Id<"zones">;
  zoneName?: string;
  deliveryFee?: number;
  subtotal?: number;
  total?: number;
  at?: number;
};

type State = {
  picked: PickedLocation | null;
  setPicked: (loc: PickedLocation | null) => void;
  consume: () => PickedLocation | null;
};

export const useLocationPicker = create<State>((set, get) => ({
  picked: null,
  setPicked: (loc) => set({ picked: loc }),
  consume: () => {
    const loc = get().picked;
    if (loc) set({ picked: null });
    return loc;
  },
}));
