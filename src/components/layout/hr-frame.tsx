"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { NavigationProgress } from "@/components/layout/navigation-progress";

export function HrFrame({ children, isAdmin }: { children: React.ReactNode; isAdmin: boolean }) {
  async function signOut() {
    const response = await fetch("/api/auth/sign-out", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    if (response.ok) window.location.replace("/");
  }

  return (
    <>
      <NavigationProgress />
      <AppShell organizationName="Triple Minds" isAdmin={isAdmin} onSignOut={() => void signOut()}>
        {children}
      </AppShell>
    </>
  );
}
