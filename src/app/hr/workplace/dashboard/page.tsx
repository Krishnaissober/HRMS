import { CalendarDays, LogOut, Users, UserPlus, Clock3 } from "lucide-react";
import { PhaseDashboard } from "@/components/layout/phase-dashboard";

export default function WorkplaceDashboardPage() {
  return (
    <PhaseDashboard
      eyebrow="Phase 3 · Workplace & exit"
      title="Workplace & Exit Dashboard"
      description="Keep workplace operations organized with shifts, holidays, visitors, and employee offboarding."
      cards={[
        {
          label: "Shifts",
          description: "Create and assign shifts",
          href: "/hr/shifts",
          icon: Clock3,
          tone: "bg-indigo-600",
        },
        {
          label: "Holidays",
          description: "Manage company holidays",
          href: "/hr/holidays",
          icon: CalendarDays,
          tone: "bg-amber-600",
        },
        {
          label: "Visitors",
          description: "Track workplace visitors",
          href: "/hr/visitors",
          icon: UserPlus,
          tone: "bg-blue-600",
        },
        {
          label: "Offboarding",
          description: "Manage employee exits",
          href: "/hr/offboarding",
          icon: LogOut,
          tone: "bg-rose-600",
        },
        {
          label: "Employee attendance",
          description: "Review team attendance",
          href: "/hr/employee-attendance",
          icon: Users,
          tone: "bg-emerald-600",
        },
      ]}
    />
  );
}
