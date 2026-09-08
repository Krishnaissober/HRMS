"use client";

import { WavyBackground } from "@/components/ui/wavy-background";

export default function WavyBackgroundDemo() {
  return (
    <WavyBackground className="mx-auto max-w-4xl px-6 pb-16 text-center">
      <p className="text-3xl font-black tracking-tight text-white md:text-5xl">
        Hero waves are cool
      </p>
      <p className="mt-4 text-base text-white/80 md:text-lg">
        Leverage the power of canvas to create a beautiful hero section.
      </p>
    </WavyBackground>
  );
}
