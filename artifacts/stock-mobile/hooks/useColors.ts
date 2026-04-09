import { useTheme } from "@/context/ThemeContext";
import colors from "@/constants/colors";

/**
 * Returns the design tokens for the current color scheme.
 * Respects user's manual preference (dark / light / system) stored in ThemeContext.
 */
export function useColors() {
  const { effectiveScheme } = useTheme();
  const palette =
    effectiveScheme === "dark" && "dark" in colors
      ? (colors as Record<string, typeof colors.light>).dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}
