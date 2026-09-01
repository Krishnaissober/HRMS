"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";

export function HrFrame({ children }: { children: React.ReactNode }) {
  async function signOut() {
    const response = await fetch("/api/auth/sign-out", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    if (response.ok) window.location.replace("/");
  }

  return <AppShell organizationName="Triple Minds" onSignOut={() => void signOut()}>{children}</AppShell>;
}
