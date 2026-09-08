"use client";

import { motion, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";

const paths = [
  "M0 250 C180 120 280 360 480 230 S800 120 1040 250 S1260 360 1440 210",
  "M0 290 C200 180 330 390 540 260 S850 130 1090 270 S1280 350 1440 240",
  "M0 330 C220 240 360 410 600 290 S900 180 1130 300 S1320 390 1440 280",
  "M0 370 C190 300 390 440 620 330 S930 220 1160 340 S1320 420 1440 320",
  "M0 410 C230 350 410 470 660 370 S950 270 1190 380 S1340 450 1440 360",
];

const colors = ["#ffb7c5", "#ffddb7", "#b1c5ff", "#4fabff", "#6e8cff"];

export function GoogleGeminiEffect({
  pathLengths,
  className,
}: {
  pathLengths: MotionValue<number>[];
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 1440 520"
      preserveAspectRatio="none"
      className={cn("absolute inset-0 h-full w-full", className)}
      aria-hidden="true"
    >
      {paths.map((path, index) => (
        <motion.path
          key={path}
          d={path}
          fill="none"
          stroke={colors[index]}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ opacity: 0.6 }}
          style={{ pathLength: pathLengths[index] }}
        />
      ))}
    </svg>
  );
}
