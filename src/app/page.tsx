import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, googleOAuthEnabled } from "@/lib/auth";
import { db } from "@/lib/db";
import { membershipHasPermission } from "@/lib/rbac";
import { membershipHasAdminAccess } from "@/lib/admin-access";
import { LoginEntry } from "@/components/login-entry";
import { isValidTabId } from "@/lib/tab-session";

export default async function HomePage() {
  const localActivationEnabled = process.env.NODE_ENV !== "production";
  const requestHeaders = await headers();
  const tabId = requestHeaders.get("x-hrms-tab-id");
  if (!isValidTabId(tabId)) {
    return (
      <LoginEntry
        googleOAuthEnabled={googleOAuthEnabled}
        localActivationEnabled={localActivationEnabled}
      />
    );
  }
  let session: Awaited<ReturnType<typeof auth.api.getSession>>;
  try {
    session = await auth.api.getSession({ headers: requestHeaders });
  } catch {
    return (
      <LoginEntry
        databaseUnavailable
        googleOAuthEnabled={googleOAuthEnabled}
        localActivationEnabled={localActivationEnabled}
      />
    );
  }
  if (!session)
    return (
      <LoginEntry
        googleOAuthEnabled={googleOAuthEnabled}
        localActivationEnabled={localActivationEnabled}
      />
    );
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    include: {
      roles: {
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
        },
      },
    },
  });
  if (!membership)
    return (
      <LoginEntry
        signedInWithoutAccess
        localActivationEnabled={localActivationEnabled}
        userName={session.user.name}
      />
    );
  const scoped = (path: string) => `/t/${tabId}${path}`;
  if (membershipHasAdminAccess(membership, session.user.email)) redirect(scoped("/admin"));
  if (membershipHasPermission(membership, "dashboard.hr.read")) redirect(scoped("/hr/dashboard"));
  if (membershipHasPermission(membership, "dashboard.recruitment.read"))
    redirect(scoped("/hr/recruitment/dashboard"));
  if (membershipHasPermission(membership, "candidates.read")) redirect(scoped("/hr/candidates"));
  if (membershipHasPermission(membership, "leave.read")) redirect(scoped("/hr/leave"));
  return (
    <LoginEntry
      signedInWithoutAccess
      localActivationEnabled={localActivationEnabled}
      userName={session.user.name}
    />
  );
}
