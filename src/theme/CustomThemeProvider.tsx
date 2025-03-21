import { Colors } from "@/constants/Colors";
import { getStoredValues, saveSecurely } from "@/store/storage";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useQuickActionRouting } from "expo-quick-actions/router";
import { StatusBar } from "expo-status-bar";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
});

const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary,
    background: Colors.black,
    card: Colors.darkGray[400],
    text: Colors.white,
    border: Colors.darkGray[200],
    notification: Colors.secondary,
    gray: {
      500: "#B0B0B0",
      400: "#8A8A8A",
      300: "#545454",
      200: "#333333",
      100: "#1B1B1B",
      50: "#1b1a1a",
    },
  },
};

const customLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.white,
    card: Colors.darkGray[400],
    text: Colors.black,
    border: Colors.darkGray[200],
    notification: Colors.secondary,
    gray: {
      500: "#9E9E9E",
      400: "#BDBDBD",
      300: "#E0E0E0",
      200: "#EEEEEE",
      100: "#F5F5F5",
      50: "#fafafa",
    },
  },
};

const CustomThemeProvider = ({ children }: PropsWithChildren) => {
  const [theme, setTheme] = useState<Theme>(
    getStoredValues(["theme"]).theme || "dark"
  );
  const colorScheme = useColorScheme();

  const selectedTheme: any = useMemo(() => {
    const useSystemTheme = theme === "system";
    const appliedTheme: any = useSystemTheme ? colorScheme : theme;

    saveSecurely([{ key: "theme", value: appliedTheme }]);

    return appliedTheme;
  }, [theme, colorScheme]);

  const currentNavigationTheme = useMemo(
    () => (selectedTheme === "dark" ? customDarkTheme : customLightTheme),
    [selectedTheme]
  );

  useQuickActionRouting();

  return (
    <ThemeProvider value={currentNavigationTheme}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        {children}
      </ThemeContext.Provider>
      <StatusBar style={selectedTheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
};

export default CustomThemeProvider;
