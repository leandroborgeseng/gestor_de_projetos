import type { CompanyInfo } from "./company.js";

interface CompanyThemePalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surfaceMuted: string;
  surfaceElevated: string;
  primaryContrast: string;
  secondaryContrast: string;
}

interface CompanyThemeDefinition {
  dark: CompanyThemePalette;
  light: CompanyThemePalette;
  logos: {
    dark: string | null;
    light: string | null;
  };
}

const DEFAULT_DARK_THEME: CompanyThemePalette = {
  primary: "#4F46E5",
  secondary: "#312E81",
  accent: "#F97316",
  background: "#0F172A",
  surfaceMuted: "#111827",
  surfaceElevated: "#1F2937",
  primaryContrast: "#F8FAFC",
  secondaryContrast: "#E5E7EB",
};

const DEFAULT_LIGHT_THEME: CompanyThemePalette = {
  primary: "#4338CA",
  secondary: "#6366F1",
  accent: "#F97316",
  background: "#F8FAFC",
  surfaceMuted: "#EEF2FF",
  surfaceElevated: "#FFFFFF",
  primaryContrast: "#111827",
  secondaryContrast: "#1F2937",
};

const DEFAULT_THEME: CompanyThemeDefinition = {
  dark: DEFAULT_DARK_THEME,
  light: DEFAULT_LIGHT_THEME,
  logos: {
    dark: null,
    light: null,
  },
};

function ensureColor(value: string | undefined | null, fallback: string) {
  if (!value) return fallback;
  return value.trim() || fallback;
}

function getContrastColor(hexColor: string) {
  const hex = hexColor.replace("#", "");
  const parsed = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const bigint = parseInt(parsed, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.54 ? "#0F172A" : "#F8FAFC";
}

function lightenColor(hex: string, factor: number) {
  const hexValue = hex.replace("#", "");
  const parsed = hexValue.length === 3 ? hexValue.split("").map((c) => c + c).join("") : hexValue;
  const bigint = parseInt(parsed, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  const adjust = (channel: number) => Math.min(255, Math.round(channel + (255 - channel) * factor));
  const newR = adjust(r);
  const newG = adjust(g);
  const newB = adjust(b);

  return `#${[newR, newG, newB].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function darkenColor(hex: string, factor: number) {
  const hexValue = hex.replace("#", "");
  const parsed = hexValue.length === 3 ? hexValue.split("").map((c) => c + c).join("") : hexValue;
  const bigint = parseInt(parsed, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  const adjust = (channel: number) => Math.max(0, Math.round(channel * (1 - factor)));
  const newR = adjust(r);
  const newG = adjust(g);
  const newB = adjust(b);

  return `#${[newR, newG, newB].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function buildPalette(base: CompanyThemePalette): CompanyThemePalette {
  return {
    primary: base.primary,
    secondary: base.secondary,
    accent: base.accent,
    background: base.background,
    surfaceMuted: base.surfaceMuted,
    surfaceElevated: base.surfaceElevated,
    primaryContrast: getContrastColor(base.primary),
    secondaryContrast: getContrastColor(base.secondary),
  };
}

export function buildThemeFromCompany(company?: CompanyInfo | null): CompanyThemeDefinition {
  const darkPrimary = ensureColor(company?.primaryColor, DEFAULT_DARK_THEME.primary);
  const darkSecondary = ensureColor(company?.secondaryColor, DEFAULT_DARK_THEME.secondary);
  const darkAccent = ensureColor(company?.accentColor, DEFAULT_DARK_THEME.accent);
  const darkBackground = ensureColor(company?.backgroundColor, DEFAULT_DARK_THEME.background);

  const lightPrimary = ensureColor(
    company?.lightPrimaryColor ?? company?.primaryColor,
    DEFAULT_LIGHT_THEME.primary
  );
  const lightSecondary = ensureColor(
    company?.lightSecondaryColor ?? company?.secondaryColor,
    DEFAULT_LIGHT_THEME.secondary
  );
  const lightAccent = ensureColor(
    company?.lightAccentColor ?? company?.accentColor,
    DEFAULT_LIGHT_THEME.accent
  );
  const lightBackground = ensureColor(
    company?.lightBackgroundColor ?? "#F8FAFC",
    DEFAULT_LIGHT_THEME.background
  );

  const theme: CompanyThemeDefinition = {
    dark: buildPalette({
      primary: darkPrimary,
      secondary: darkSecondary,
      accent: darkAccent,
      background: darkBackground,
      surfaceMuted: darkenColor(darkBackground, 0.12),
      surfaceElevated: darkenColor(darkBackground, 0.2),
      primaryContrast: "",
      secondaryContrast: "",
    }),
    light: buildPalette({
      primary: lightPrimary,
      secondary: lightSecondary,
      accent: lightAccent,
      background: lightBackground,
      surfaceMuted: lightenColor(lightBackground, 0.08),
      surfaceElevated: lightenColor(lightBackground, 0.16),
      primaryContrast: "",
      secondaryContrast: "",
    }),
    logos: {
      dark: company?.logoUrl ?? null,
      light: company?.lightLogoUrl ?? company?.logoUrl ?? null,
    },
  };

  return theme;
}

export function applyCompanyTheme(company?: CompanyInfo | null) {
  const theme = buildThemeFromCompany(company);
  const root = document.documentElement;

  const setPalette = (variant: "dark" | "light", palette: CompanyThemePalette) => {
    root.style.setProperty(`--brand-primary-${variant}`, palette.primary);
    root.style.setProperty(`--brand-secondary-${variant}`, palette.secondary);
    root.style.setProperty(`--brand-accent-${variant}`, palette.accent);
    root.style.setProperty(`--brand-background-${variant}`, palette.background);
    root.style.setProperty(`--brand-primary-contrast-${variant}`, palette.primaryContrast);
    root.style.setProperty(`--brand-secondary-contrast-${variant}`, palette.secondaryContrast);
    root.style.setProperty(`--color-surface-${variant}`, palette.background);
    root.style.setProperty(`--color-surface-muted-${variant}`, palette.surfaceMuted);
    root.style.setProperty(`--color-surface-elevated-${variant}`, palette.surfaceElevated);
  };

  setPalette("dark", theme.dark);
  setPalette("light", theme.light);

  if (theme.logos.dark) {
    root.style.setProperty("--brand-logo-dark", theme.logos.dark);
  } else {
    root.style.removeProperty("--brand-logo-dark");
  }

  if (theme.logos.light) {
    root.style.setProperty("--brand-logo-light", theme.logos.light);
  } else {
    root.style.removeProperty("--brand-logo-light");
  }
}
