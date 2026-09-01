import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { membershipHasPermission } from "@/lib/rbac";
import { LoginEntry } from "@/components/login-entry";

export default async function HomePage() {
  let session: Awaited<ReturnType<typeof auth.api.getSession>>;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    return <LoginEntry databaseUnavailable />;
  }
  if (!session) return <LoginEntry />;
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
  if (!membership) return <LoginEntry signedInWithoutAccess userName={session.user.name} />;
  if (membershipHasPermission(membership, "dashboard.hr.read"))
    redirect("/hr/dashboard");
  if (membershipHasPermission(membership, "dashboard.recruitment.read"))
    redirect("/hr/recruitment/dashboard");
  if (membershipHasPermission(membership, "candidates.read"))
    redirect("/hr/candidates");
  if (membershipHasPermission(membership, "leave.read"))
    redirect("/hr/leave");
  return <LoginEntry signedInWithoutAccess userName={session.user.name} />;
}
