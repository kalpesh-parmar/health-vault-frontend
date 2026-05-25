export interface ThemeColors {
  primary: string;
  background: string;
  surface: string;
  surfaceLight: string;
  surfaceTransparent: string;
  card: string;
  textPrimary: string;
  bottomSheet: string;
  bottomSheetBorder: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  border: string;
  divider: string;
  iconBox: string;
  iconBoxSuccess: string;
  success: string;
  warning: string;
  error: string;
  overlay: string;
  white: string;
  transparent: string;
}

export interface AppTheme {
  colors: ThemeColors;
}

export const LIGHT_THEME: AppTheme = {
  colors: {
    primary: "#2563eb",
    background: "#f8fafc",
    surface: "#ffffff",
    surfaceLight: "#f8fafc",
    surfaceTransparent: "rgba(255, 255, 255, 0.9)",
    card: "#ffffff",
    textPrimary: "#0f172a",
    bottomSheet: "#f1f5f9",
    bottomSheetBorder: "#e2e8f0",
    textSecondary: "#334155",
    textMuted: "#64748b",
    accent: "#3b82f6",
    border: "#e2e8f0",
    divider: "#f1f5f9",
    iconBox: "#eff6ff",
    iconBoxSuccess: "#f0fdf4",
    success: "#22c55e",
    warning: "#F59E0B",
    error: "#ef4444",
    overlay: "rgba(0, 0, 0, 0.6)",
    white: "#ffffff",
    transparent: "transparent",
  },
};

export const DARK_THEME: AppTheme = {
  colors: {
    primary: "#3b82f6", // Slightly lighter blue
    background: "#0f172a", // Deep Slate
    surface: "#1e293b",
    surfaceLight: "#0f172a", // Match background if no distinction is needed
    surfaceTransparent: "rgba(30, 41, 59, 0.9)",
    card: "#1e293b",
    textPrimary: "#f8fafc",
    bottomSheet: "#0f172a",
    bottomSheetBorder: "#1e293b",
    textSecondary: "#cbd5e1",
    textMuted: "#94a3b8",
    accent: "#60a5fa",
    border: "#334155",
    divider: "#1e293b",
    iconBox: "#334155",
    iconBoxSuccess: "#14532d", // Dark green
    success: "#22c55e",
    warning: "#F59E0B",
    error: "#ef4444",
    overlay: "rgba(0, 0, 0, 0.8)",
    white: "#ffffff",
    transparent: "transparent",
  },
};

export const SHADOWS = {
  soft: "elevation: 2; shadow-color: #000; shadow-opacity: 0.05; shadow-radius: 10px;",
  medium: "elevation: 5; shadow-color: #000; shadow-opacity: 0.1; shadow-radius: 15px;",
};
