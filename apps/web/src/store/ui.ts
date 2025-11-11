import { create } from "zustand";

export type ThemePreference = "light" | "dark" | "system";
export type DensityPreference = "compact" | "normal" | "comfortable";

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  density: DensityPreference;
  setDensity: (density: DensityPreference) => void;
}

const THEME_STORAGE_KEY = "ui-theme";
const DENSITY_STORAGE_KEY = "ui-density";

const resolveTheme = (preference: ThemePreference): "light" | "dark" => {
  if (preference === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return preference === "dark" ? "dark" : "light";
};

const applyTheme = (preference: ThemePreference) => {
  if (typeof window === "undefined") return;

  const resolved = resolveTheme(preference);
  const root = document.documentElement;

  root.dataset.theme = resolved;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  window.dispatchEvent(new CustomEvent("theme-change", { detail: { preference, resolved } }));
};

const getInitialTheme = (): ThemePreference => {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null;
  return stored ?? "system";
};

const getInitialDensity = (): DensityPreference => {
  if (typeof window === "undefined") return "normal";
  const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY) as DensityPreference | null;
  return stored ?? "normal";
};

const applyDensity = (density: DensityPreference) => {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  root.dataset.density = density;
  window.dispatchEvent(new CustomEvent("density-change", { detail: { density } }));
};

let mediaListenerAttached = false;

const attachSystemThemeListener = () => {
  if (mediaListenerAttached || typeof window === "undefined") return;
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", () => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null;
    const preference = stored ?? "system";
    if (preference === "system") {
      applyTheme("system");
    }
  });
  mediaListenerAttached = true;
};

const initialTheme = getInitialTheme();
const initialDensity = getInitialDensity();
let initialized = false;

export const initializeTheme = () => {
  if (initialized || typeof window === "undefined") return;
  applyTheme(initialTheme);
  applyDensity(initialDensity);
  attachSystemThemeListener();
  initialized = true;
};

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  theme: initialTheme,
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      applyTheme(theme);
    }
    set({ theme });
  },
  density: initialDensity,
  setDensity: (density) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
      applyDensity(density);
    }
    set({ density });
  },
}));

export const resolveThemePreference = (preference: ThemePreference): "light" | "dark" =>
  resolveTheme(preference);
