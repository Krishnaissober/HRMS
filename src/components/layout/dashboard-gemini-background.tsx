"use client";

import { useScroll, useTransform } from "motion/react";
import { GoogleGeminiEffect } from "@/components/ui/google-gemini-effect";

export function DashboardGeminiBackground() {
  const { scrollYProgress } = useScroll();
  const pathLengthFirst = useTransform(scrollYProgress, [0, 0.8], [0.2, 0.8]);
  const pathLengthSecond = useTransform(scrollYProgress, [0, 0.8], [0.17, 0.8]);
  const pathLengthThird = useTransform(scrollYProgress, [0, 0.8], [0.14, 0.8]);
  const pathLengthFourth = useTransform(scrollYProgress, [0, 0.8], [0.11, 0.8]);
  const pathLengthFifth = useTransform(scrollYProgress, [0, 0.8], [0.08, 0.8]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70">
      <div className="absolute inset-0 bg-primary" />
      <GoogleGeminiEffect
        pathLengths={[
          pathLengthFirst,
          pathLengthSecond,
          pathLengthThird,
          pathLengthFourth,
          pathLengthFifth,
        ]}
      />
    </div>
  );
}
