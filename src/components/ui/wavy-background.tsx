"use client";

import { createNoise3D } from "simplex-noise";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type WavyBackgroundProps = React.HTMLAttributes<HTMLDivElement> & {
  colors?: string[];
  waveWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: "slow" | "fast";
  waveOpacity?: number;
  containerClassName?: string;
};

export function WavyBackground({
  children,
  className,
  containerClassName,
  colors = ["#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#22d3ee"],
  waveWidth = 50,
  backgroundFill = "#020617",
  blur = 10,
  speed = "fast",
  waveOpacity = 0.5,
  ...props
}: WavyBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const noise = createNoise3D();
    let animationId = 0;
    let time = 0;
    let width = 0;
    let height = 0;
    let visible = true;
    let lastFrame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const increment = speed === "slow" ? 0.001 : 0.002;

    const resize = () => {
      // A background effect does not need retina-resolution rendering. Keeping
      // this close to 1x prevents the canvas from competing with page scrolling.
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.filter = `blur(${blur}px)`;
    };

    const draw = (timestamp = 0) => {
      if (!visible || document.hidden) {
        animationId = 0;
        return;
      }
      // Keep the decorative effect smooth while avoiding expensive noise work
      // on every display refresh during wheel/touch scrolling.
      if (!reducedMotion && timestamp - lastFrame < 32) {
        animationId = requestAnimationFrame(draw);
        return;
      }
      lastFrame = timestamp;
      context.fillStyle = backgroundFill;
      context.globalAlpha = 1;
      context.fillRect(0, 0, width, height);
      context.globalAlpha = waveOpacity;

      for (let wave = 0; wave < 5; wave += 1) {
        context.beginPath();
        context.lineWidth = waveWidth;
        context.strokeStyle = colors[wave % colors.length];
        for (let x = 0; x <= width; x += 5) {
          const y = noise(x / 800, 0.3 * wave, time) * 100;
          context.lineTo(x, y + height * 0.5);
        }
        context.stroke();
      }

      time += increment;
      if (!reducedMotion) animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reducedMotion && !animationId) animationId = requestAnimationFrame(draw);
    });
    observer.observe(canvas);
    const handleVisibility = () => {
      if (!document.hidden && visible && !reducedMotion && !animationId)
        animationId = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    draw();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      observer.disconnect();
    };
  }, [backgroundFill, blur, colors, speed, waveOpacity, waveWidth]);

  return (
    <div
      className={cn(
        "relative flex min-h-[360px] items-center justify-center overflow-hidden",
        containerClassName,
      )}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full" />
      <div className={cn("relative z-10", className)} {...props}>
        {children}
      </div>
    </div>
  );
}
