import Image from "next/image";
import { cn } from "@/lib/utils";

/** Preserve the supplied artwork's proportions; trim only its empty red margins. */
export function BrandLogo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("brand-logo", compact && "brand-logo--compact", className)}>
      <Image
        src="/brand/triple-minds-logo.png"
        width={512}
        height={512}
        alt="Triple Minds — Consulting | Development | Marketing"
        priority
      />
    </span>
  );
}
