import type { ReactNode } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { membershipHasAdminAccess } from "@/lib/admin-access";
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
  const isAdmin = Boolean(session && membershipHasAdminAccess(membership, session.user.email));
  return <HrFrame isAdmin={isAdmin}>{children}</HrFrame>;
}
