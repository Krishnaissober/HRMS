import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMasterAdminContext } from "@/lib/admin-access";
import { HrFrame } from "@/components/layout/hr-frame";

export const dynamic = "force-dynamic";

/**
 * Route-level guard for the complete Master Admin workspace.
 *
 * Individual pages keep their existing getAdminContext checks as defense in
 * depth. This layout makes the boundary apply consistently to every current
 * and future route below /admin, including direct URL navigation.
 */
export default async function MasterAdminLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  let context;
  try {
    context = await getMasterAdminContext();
  } catch {
    redirect("/hr/dashboard");
  }

  return (
    <HrFrame
      isAdmin
      organizationId={context.organizationId}
      userName={session.user.name}
      userEmail={session.user.email}
    >
      {children}
    </HrFrame>
  );
}
