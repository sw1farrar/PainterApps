"use client";

import * as React from "react";

import {
  applyThemeClass,
  DEFAULT_THEME,
  persistTheme,
  readStoredTheme,
  type Theme,
} from "@/lib/theme/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(DEFAULT_THEME);

  React.useEffect(() => {
    const stored = readStoredTheme();
    const resolved = stored ?? DEFAULT_THEME;
    setThemeState(resolved);
    applyThemeClass(resolved);
  }, []);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    persistTheme(next);
    applyThemeClass(next);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [setTheme, theme]);

  const value = React.useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}