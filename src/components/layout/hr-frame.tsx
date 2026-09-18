"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { NavigationProgress } from "@/components/layout/navigation-progress";

export function HrFrame({
  children,
  isAdmin,
  organizationId,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
  organizationId?: string;
  userName?: string;
  userEmail?: string;
}) {
  const themeKey = userEmail
    ? `triple-minds-theme:${organizationId || "default"}:${userEmail.trim().toLowerCase()}`
    : null;
  const themeBootstrap = themeKey
    ? `try{var k=${JSON.stringify(themeKey)};var d=document.documentElement;var t=localStorage.getItem(k);d.classList.toggle('dark',t==='dark');}catch(e){}`
    : "";

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
      {themeBootstrap && (
        <script
          id="account-theme-bootstrap"
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
      )}
      <NavigationProgress />
      <AppShell
        organizationId={organizationId}
        organizationName="Triple Minds"
        isAdmin={isAdmin}
        userName={userName}
        userEmail={userEmail}
        onSignOut={() => void signOut()}
      >
        {children}
      </AppShell>
    </>
  );
}
