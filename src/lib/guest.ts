import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type State = {
  name: string;
  phone: string;
  setName: (name: string) => void;
  setPhone: (phone: string) => void;
  clear: () => void;
};

export const useGuest = create<State>()(
  persist(
    (set) => ({
      name: "",
      phone: "",
      setName: (name) => set({ name }),
      setPhone: (phone) => set({ phone }),
      clear: () => set({ name: "", phone: "" }),
    }),
    { name: "guest", storage: createJSONStorage(() => AsyncStorage) },
  ),
);