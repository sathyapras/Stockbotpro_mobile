import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext, useContext, useEffect, useState,
} from "react";
import { useColorScheme } from "react-native";

export type ThemePreference = "system" | "dark" | "light";

interface ThemeContextValue {
  preference: ThemePreference;
  effectiveScheme: "dark" | "light";
  setPreference: (p: ThemePreference) => void;
}

const STORAGE_KEY = "app_theme_preference";

const ThemeContext = createContext<ThemeContextValue>({
  preference: "system",
  effectiveScheme: "dark",
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme  = useColorScheme() ?? "dark";
  const [preference, setPref] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === "dark" || v === "light" || v === "system") {
        setPref(v);
      }
    });
  }, []);

  function setPreference(p: ThemePreference) {
    setPref(p);
    AsyncStorage.setItem(STORAGE_KEY, p);
  }

  const effectiveScheme: "dark" | "light" =
    preference === "system" ? systemScheme : preference;

  return (
    <ThemeContext.Provider value={{ preference, effectiveScheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
