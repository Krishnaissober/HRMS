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
          tone: "bg-info",
        },
        {
          label: "Onboarding",
          description: "Track onboarding progress",
          href: "/hr/onboarding",
          icon: UserPlus,
          tone: "bg-success",
        },
        {
          label: "Documents",
          description: "Review employee documents",
          href: "/hr/documents",
          icon: FileText,
          tone: "bg-primary",
        },
        {
          label: "Attendance",
          description: "Review daily attendance",
          href: "/hr/attendance",
          icon: Clock3,
          tone: "bg-warning",
        },
        {
          label: "Leave",
          description: "Manage leave requests",
          href: "/hr/leave",
          icon: CalendarDays,
          tone: "bg-info",
        },
        {
          label: "Payroll",
          description: "Run and review payroll",
          href: "/hr/payroll",
          icon: Banknote,
          tone: "bg-success",
        },
      ]}
    />
  );
}
