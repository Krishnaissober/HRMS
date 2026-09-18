"use client";

import type { ReactNode } from "react";

type ThemeProviderProps = {
  children: ReactNode;
  [key: string]: unknown;
};

// Theme state is intentionally controlled by the account-scoped HR header.
// A global next-themes provider would reapply its own default during navigation
// and could overwrite another account's selected theme.
export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>;
}
