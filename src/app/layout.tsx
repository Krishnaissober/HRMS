import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { TabSessionBootstrap } from "@/components/auth/tab-session-bootstrap";
import "../app/globals.css";
import "./enterprise-theme.css";
export const metadata: Metadata = {
  title: "Triple Minds HR",
  description: "Triple Minds HR management and employee lifecycle portal",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="triple-minds-root-theme"
          disableTransitionOnChange
        >
          <TabSessionBootstrap />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
