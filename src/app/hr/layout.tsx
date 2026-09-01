import type { ReactNode } from "react";
import { HrFrame } from "@/components/layout/hr-frame";

export default function HrLayout({ children }: { children: ReactNode }) {
  return <HrFrame>{children}</HrFrame>;
}
