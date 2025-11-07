// lib/store.ts
import { create } from "zustand";

export type Palette = {
  season: string;
  swatches: string[];
  rgb?: [number, number, number];
  skinSeason?: string;
  confidence?: number;
};

type State = {
  palette: Palette | null;
  setPalette: (p: Palette) => void;
};

export const useAppStore = create<State>((set) => ({
  palette: null,
  setPalette: (palette) => set({ palette }),
}));
