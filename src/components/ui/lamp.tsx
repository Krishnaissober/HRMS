"use client";

import React, { useEffect } from "react";
import { motion, useAnimationControls } from "motion/react";

import { cn } from "@/lib/utils";

export function LampContainer({
  children,
  className,
  compact = false,
}: {
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const lineControls = useAnimationControls();

  useEffect(() => {
    if (!compact) return;

    let previousScrollY = window.scrollY;
    let lastDirection: "up" | "down" | null = null;

    void lineControls.start({
      width: "82%",
      opacity: 0.98,
      transition: { delay: 0.3, duration: 0.8, ease: "easeInOut" },
    });

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const direction = currentScrollY < previousScrollY ? "up" : "down";

      if (currentScrollY !== previousScrollY && direction !== lastDirection) {
        lastDirection = direction;
        void lineControls.start({
          width: direction === "up" ? "82%" : "0%",
          opacity: direction === "up" ? 0.98 : 0,
          transition: { duration: 0.55, ease: "easeInOut" },
        });
      }

      previousScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [compact, lineControls]);

  if (compact) {
    return (
      <div
        className={cn(
          "relative z-0 flex min-h-0 h-full w-full flex-col items-center justify-center overflow-hidden rounded-md bg-slate-950",
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, #062238 0%, #031322 100%)",
            }}
          />
          <motion.div
            initial={{ width: "0%", opacity: 0 }}
            animate={lineControls}
            className="absolute left-1/2 top-5 h-[72%] -translate-x-1/2"
          >
            <div className="absolute inset-x-0 top-0 h-1 rounded-full bg-cyan-300 shadow-[0_0_24px_5px_rgba(103,232,249,0.78)]" />
            <div
              className="absolute left-1/2 top-0 h-[180%] w-[130%] -translate-x-1/2 blur-3xl"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 0%, rgba(103,232,249,0.82) 0%, rgba(34,211,238,0.46) 32%, rgba(14,116,144,0.18) 58%, transparent 82%)",
              }}
            />
          </motion.div>
        </div>
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative z-0 flex min-h-screen w-full flex-col items-center justify-center overflow-hidden rounded-md bg-slate-950",
        className,
      )}
    >
      <div className="isolate relative flex w-full flex-1 scale-y-125 items-center justify-center">
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          style={{
            backgroundImage: "conic-gradient(var(--conic-position), var(--tw-gradient-stops))",
          }}
          className="absolute inset-auto right-1/2 h-56 w-[30rem] overflow-visible bg-gradient-conic from-blue-500 via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
        >
          <div className="absolute bottom-0 left-0 z-20 h-40 w-full bg-slate-950 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute bottom-0 left-0 z-20 h-full w-40 bg-slate-950 [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          style={{
            backgroundImage: "conic-gradient(var(--conic-position), var(--tw-gradient-stops))",
          }}
          className="absolute inset-auto left-1/2 h-56 w-[30rem] bg-gradient-conic from-transparent via-transparent to-blue-500 text-white [--conic-position:from_290deg_at_center_top]"
        >
          <div className="absolute bottom-0 right-0 z-20 h-full w-40 bg-slate-950 [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute bottom-0 right-0 z-20 h-40 w-full bg-slate-950 [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>

        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-slate-950 blur-2xl" />
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />
        <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full bg-blue-500 opacity-50 blur-3xl" />

        <motion.div
          initial={{ width: "8rem" }}
          whileInView={{ width: "16rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-auto z-30 h-36 w-64 -translate-y-[6rem] rounded-full bg-blue-400 blur-2xl"
        />
        <motion.div
          initial={{ width: "15rem" }}
          whileInView={{ width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-auto z-50 h-0.5 w-[30rem] -translate-y-[7rem] bg-blue-400"
        />

        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-slate-950" />
      </div>

      <div className="relative z-50 flex -translate-y-80 flex-col items-center px-5">
        {children}
      </div>
    </div>
  );
}
