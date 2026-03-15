import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "default" | "islamic" | "dark";

interface ThemeContextValue {
  theme: Theme;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "islamic",
  cycleTheme: () => {},
});

const THEMES: Theme[] = ["default", "islamic", "dark"];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("sifn-theme") as Theme | null;
    return saved && THEMES.includes(saved) ? saved : "islamic";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem("sifn-theme", theme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme((current) => {
      const idx = THEMES.indexOf(current);
      return THEMES[(idx + 1) % THEMES.length];
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
