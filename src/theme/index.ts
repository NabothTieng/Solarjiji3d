import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: number;
}

const DEFAULT_PRIMARY = "#ffa500";
const DEFAULT_SECONDARY = "#313244";
const DEFAULT_FONT_FAMILY = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
const DEFAULT_FONT_SIZE = 13;


export function createSolarPlannerSystem(config: ThemeConfig = {}) {
  const {
    primaryColor = DEFAULT_PRIMARY,
    secondaryColor = DEFAULT_SECONDARY,
    fontFamily = DEFAULT_FONT_FAMILY,
    fontSize = DEFAULT_FONT_SIZE,
  } = config;

  const secondaryLight = lightenColor(secondaryColor, 20);
  const secondaryDark = darkenColor(secondaryColor, 10);
  const secondaryMuted = lightenColor(secondaryColor, 40);

  const customConfig = defineConfig({
    theme: {
      tokens: {
        fonts: {
          body: { value: fontFamily },
          heading: { value: fontFamily },
        },
        fontSizes: {
          xs: { value: `${fontSize - 3}px` },
          sm: { value: `${fontSize - 1}px` },
          md: { value: `${fontSize}px` },
          lg: { value: `${fontSize + 2}px` },
          xl: { value: `${fontSize + 4}px` },
        },
        colors: {
          // Primary color palette (orange)
          primary: {
            50: { value: lightenColor(primaryColor, 50) },
            100: { value: lightenColor(primaryColor, 40) },
            200: { value: lightenColor(primaryColor, 30) },
            300: { value: lightenColor(primaryColor, 20) },
            400: { value: lightenColor(primaryColor, 10) },
            500: { value: primaryColor },
            600: { value: darkenColor(primaryColor, 10) },
            700: { value: darkenColor(primaryColor, 20) },
            800: { value: darkenColor(primaryColor, 30) },
            900: { value: darkenColor(primaryColor, 40) },
          },
          // Secondary color palette (gray)
          secondary: {
            50: { value: lightenColor(secondaryColor, 50) },
            100: { value: lightenColor(secondaryColor, 40) },
            200: { value: lightenColor(secondaryColor, 30) },
            300: { value: lightenColor(secondaryColor, 20) },
            400: { value: lightenColor(secondaryColor, 10) },
            500: { value: secondaryColor },
            600: { value: darkenColor(secondaryColor, 10) },
            700: { value: darkenColor(secondaryColor, 20) },
            800: { value: darkenColor(secondaryColor, 30) },
            900: { value: darkenColor(secondaryColor, 40) },
          },
        },
      },
      semanticTokens: {
        colors: {
          "sp.primary": { value: "{colors.primary.500}" },
          "sp.primaryHover": { value: "{colors.primary.400}" },
          "sp.primaryActive": { value: "{colors.primary.600}" },
          "sp.primaryMuted": { value: "{colors.primary.200}" },
          
          "sp.secondary": { value: "{colors.secondary.500}" },
          "sp.secondaryLight": { value: secondaryLight },
          "sp.secondaryDark": { value: secondaryDark },
          "sp.secondaryMuted": { value: secondaryMuted },
          
          "sp.bg": { value: "#1e1e2e" },
          "sp.bgCard": { value: "{colors.secondary.500}" },
          "sp.bgHover": { value: "{colors.secondary.400}" },
          "sp.bgActive": { value: "{colors.secondary.300}" },
          
          "sp.border": { value: "{colors.secondary.500}" },
          "sp.borderLight": { value: "{colors.secondary.400}" },
          "sp.borderActive": { value: "{colors.primary.500}" },
          
          "sp.text": { value: "#cdd6f4" },
          "sp.textMuted": { value: "#a6adc8" },
          "sp.textActive": { value: "{colors.primary.500}" },
          
          "sp.accent": { value: "#89b4fa" },
        },
      },
    },
  });

  return createSystem(defaultConfig, customConfig);
}

export const defaultSolarPlannerSystem = createSolarPlannerSystem();


function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse hex
  let r: number, g: number, b: number;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16) / 255;
    g = parseInt(hex[1] + hex[1], 16) / 255;
    b = parseInt(hex[2] + hex[2], 16) / 255;
  } else {
    r = parseInt(hex.slice(0, 2), 16) / 255;
    g = parseInt(hex.slice(2, 4), 16) / 255;
    b = parseInt(hex.slice(4, 6), 16) / 255;
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lightenColor(hex: string, percent: number): string {
  const hsl = hexToHSL(hex);
  hsl.l = Math.min(100, hsl.l + percent);
  return hslToHex(hsl.h, hsl.s, hsl.l);
}

function darkenColor(hex: string, percent: number): string {
  const hsl = hexToHSL(hex);
  hsl.l = Math.max(0, hsl.l - percent);
  return hslToHex(hsl.h, hsl.s, hsl.l);
}
