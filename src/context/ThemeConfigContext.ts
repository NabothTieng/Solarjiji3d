import { createContext, useContext } from "react";
import type { ThemeConfig } from "../theme";

/**
 * Context for accessing theme configuration values.
 * This allows components to access the raw theme config for custom styling
 * that may need direct access to color values.
 */
export const ThemeConfigContext = createContext<ThemeConfig>({});

/**
 * Hook to access the current theme configuration
 */
export function useThemeConfig(): ThemeConfig {
  return useContext(ThemeConfigContext);
}
