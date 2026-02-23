import { useLayoutEffect } from "react";

export function useThemeEffect(theme: string) {
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}
