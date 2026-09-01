import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../app/globals.css";
export const metadata: Metadata = {
  title: "Triple Minds HR",
  description: "Triple Minds HR management and employee lifecycle portal",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
