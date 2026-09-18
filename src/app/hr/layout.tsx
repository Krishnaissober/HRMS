import type { ReactNode } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { membershipHasMasterAdminAccess } from "@/lib/admin-access";
import { HrFrame } from "@/components/layout/hr-frame";

export default async function HrLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const membership = session
    ? await db.membership.findFirst({
        where: { userId: session.user.id, status: "ACTIVE" },
        include: { roles: { include: { role: { select: { slug: true } } } } },
        orderBy: { createdAt: "asc" },
      })
    : null;
  const isAdmin = Boolean(
    session && membershipHasMasterAdminAccess(membership, session.user.email),
  );
  return (
    <HrFrame
      isAdmin={isAdmin}
      organizationId={membership?.organizationId}
      userName={session?.user.name}
      userEmail={session?.user.email}
    >
      {children}
    </HrFrame>
  );
}
