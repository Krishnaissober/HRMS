"use client";

import { useEffect, useMemo, useState } from "react";

export function StandbyClock() {
  const [now, setNow] = useState<Date | null>(null);
  const fallbackDate = useMemo(() => new Date(2000, 0, 1, 12, 0, 0), []);
  const displayNow = now ?? fallbackDate;
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const hour12 = displayNow.getHours() % 12 || 12;
  const hours = String(hour12).padStart(2, "0");
  const minutes = String(displayNow.getMinutes()).padStart(2, "0");
  return (
    <div
      className="standby-clock standby-digital-clock"
      style={{
        width: "min(28rem, 100%)",
        height: "11rem",
        minHeight: "0",
        aspectRatio: "2.45 / 1",
      }}
      aria-label={`Current time ${displayNow.toLocaleTimeString("en-IN")}`}
    >
      <div className="standby-digital-time" aria-hidden="true">
        <span>{hours}</span>
        <b>:</b>
        <span>{minutes}</span>
      </div>
    </div>
  );
}
