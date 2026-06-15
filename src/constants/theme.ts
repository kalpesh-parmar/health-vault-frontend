export interface ThemeColors {
  primary: string;
  secondary: string;
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
  danger: string;
  overlay: string;
  white: string;
  transparent: string;
}

export interface ThemeTypography {
  title: { fontSize: number; fontWeight: "700" | "800" | "bold" | "normal" | "100" | "200" | "300" | "400" | "500" | "600" | "900" };
  heading: { fontSize: number; fontWeight: "600" | "700" | "bold" | "normal" | "100" | "200" | "300" | "400" | "500" | "800" | "900" };
  body: { fontSize: number; fontWeight: "400" | "normal" | "100" | "200" | "300" | "500" | "600" | "700" | "800" | "900" };
  caption: { fontSize: number; fontWeight: "500" | "600" | "normal" | "100" | "200" | "300" | "400" | "700" | "800" | "900" };
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface AppTheme {
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
}

export const themeSpacing: ThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const themeTypography: ThemeTypography = {
  title: { fontSize: 28, fontWeight: "700" },
  heading: { fontSize: 22, fontWeight: "600" },
  body: { fontSize: 16, fontWeight: "400" },
  caption: { fontSize: 13, fontWeight: "500" },
};

export const LIGHT_THEME: AppTheme = {
  colors: {
    primary: "#5B4BFF",
    secondary: "#7C6CFF",
    background: "#F7F8FC",
    surface: "#FFFFFF",
    surfaceLight: "#F3F4F6",
    surfaceTransparent: "rgba(255, 255, 255, 0.9)",
    card: "#FFFFFF",
    textPrimary: "#1F2937",
    bottomSheet: "#f1f5f9",
    bottomSheetBorder: "#e2e8f0",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    accent: "#5B4BFF",
    border: "#E5E7EB",
    divider: "#E5E7EB",
    iconBox: "#F0EEFF",
    iconBoxSuccess: "#e8fdf0",
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    danger: "#EF4444",
    overlay: "rgba(0, 0, 0, 0.6)",
    white: "#ffffff",
    transparent: "transparent",
  },
  typography: themeTypography,
  spacing: themeSpacing,
};

export const DARK_THEME: AppTheme = {
  colors: {
    primary: "#7C6CFF",
    secondary: "#9B8FFF",
    background: "#0C0E17",
    surface: "#181A26",
    surfaceLight: "#272A3D",
    surfaceTransparent: "rgba(24, 26, 38, 0.9)",
    card: "#181A26",
    textPrimary: "#F9FAFB",
    bottomSheet: "#0C0E17",
    bottomSheetBorder: "#272A3D",
    textSecondary: "#9CA3AF",
    textMuted: "#6B7280",
    accent: "#7C6CFF",
    border: "#272A3D",
    divider: "#1F2235",
    iconBox: "#272A3D",
    iconBoxSuccess: "#14532d",
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    danger: "#EF4444",
    overlay: "rgba(0, 0, 0, 0.8)",
    white: "#ffffff",
    transparent: "transparent",
  },
  typography: themeTypography,
  spacing: themeSpacing,
};

export const SHADOWS = {
  soft: "elevation: 2; shadow-color: #000; shadow-opacity: 0.05; shadow-radius: 10px;",
  medium: "elevation: 5; shadow-color: #000; shadow-opacity: 0.1; shadow-radius: 15px;",
  softObj: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mediumObj: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
};

