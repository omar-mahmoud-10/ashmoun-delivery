import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
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
  // When the pick was confirmed; the choice hub pops itself back to the
  // caller only for picks made after it opened (ignores stale picks).
  at?: number;
};

type State = {
  picked: PickedLocation | null;
  setPicked: (loc: PickedLocation | null) => void;
  consume: () => PickedLocation | null;
};

export const useLocationPicker = create<State>()(
  persist(
    (set, get) => ({
      picked: null,
      setPicked: (loc) => set({ picked: loc }),
      consume: () => {
        const loc = get().picked;
        if (loc) set({ picked: null });
        return loc;
      },
    }),
    { name: "location-picker", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
