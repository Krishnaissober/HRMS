import { Banknote, CalendarDays, Clock3, FileText, UserCheck, UserPlus } from "lucide-react";
import { PhaseDashboard } from "@/components/layout/phase-dashboard";

export default function EmployeeOperationsDashboardPage() {
  return (
    <PhaseDashboard
      eyebrow="Phase 2 · Employee operations"
      title="Employee Operations Dashboard"
      description="Manage the employee lifecycle from onboarding and documents through attendance, leave, and payroll."
      cards={[
        {
          label: "Employees",
          description: "Open employee directory",
          href: "/hr/employees",
          icon: UserCheck,
          tone: "bg-blue-600",
        },
        {
          label: "Onboarding",
          description: "Track onboarding progress",
          href: "/hr/onboarding",
          icon: UserPlus,
          tone: "bg-emerald-600",
        },
        {
          label: "Documents",
          description: "Review employee documents",
          href: "/hr/documents",
          icon: FileText,
          tone: "bg-indigo-600",
        },
        {
          label: "Attendance",
          description: "Review daily attendance",
          href: "/hr/attendance",
          icon: Clock3,
          tone: "bg-amber-600",
        },
        {
          label: "Leave",
          description: "Manage leave requests",
          href: "/hr/leave",
          icon: CalendarDays,
          tone: "bg-purple-600",
        },
        {
          label: "Payroll",
          description: "Run and review payroll",
          href: "/hr/payroll",
          icon: Banknote,
          tone: "bg-teal-600",
        },
      ]}
    />
  );
}
