"use client";

import dynamic from "next/dynamic";

const WavyBackground = dynamic(
  () => import("@/components/ui/wavy-background").then((module) => module.WavyBackground),
  { ssr: false },
);

export function DashboardWavyBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-45"
      aria-hidden="true"
    >
      <WavyBackground
        containerClassName="h-full min-h-0 w-full"
        className="h-full w-full"
        colors={["#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#22d3ee"]}
        waveWidth={34}
        backgroundFill="transparent"
        blur={6}
        speed="slow"
        waveOpacity={0.18}
      />
    </div>
  );
}
