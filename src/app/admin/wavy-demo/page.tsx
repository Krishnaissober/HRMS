import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import WavyBackgroundDemo from "@/components/ui/wavy-background-demo";
import { auth } from "@/lib/auth";
import { getAdminContext } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminWavyDemoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  try {
    await getAdminContext();
  } catch {
    redirect("/hr/dashboard");
  }

  return (
    <main className="page-shell space-y-6 pb-12">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:underline"
      >
        <ArrowLeft className="size-4" /> Admin Command Center
      </Link>
      <section className="overflow-hidden rounded-3xl border border-indigo-500/20 shadow-2xl">
        <WavyBackgroundDemo />
      </section>
    </main>
  );
}
