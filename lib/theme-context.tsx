import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useData } from './data';
import { palette, type Palette } from './theme';

// Light, dark, or match the device (Customize > Theme), with the accent colour from Customize.
type ThemeValue = { c: Palette; dark: boolean };
const ThemeContext = createContext<ThemeValue>({ c: palette('#3b5bdb', false), dark: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const device = useColorScheme();
  const theme = useData((d) => d.settings.theme);
  const accent = useData((d) => d.settings.accent);
  const value = useMemo<ThemeValue>(() => {
    const dark = theme === 'dark' || (theme === 'auto' && device === 'dark');
    return { c: palette(accent, dark), dark };
  }, [theme, accent, device]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
