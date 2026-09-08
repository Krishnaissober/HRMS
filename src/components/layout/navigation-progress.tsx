"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const prefetchedRef = useRef(new Set<string>());

  useEffect(() => {
    const finish = () => {
      setActive(false);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const element = event.target instanceof Element ? event.target : null;
      const button = element?.closest("button");
      if (button instanceof HTMLButtonElement && !button.disabled) {
        button.classList.remove("is-action-clicked");
        // Force a new animation when the same action is clicked repeatedly.
        void button.offsetWidth;
        button.classList.add("is-action-clicked");
        window.setTimeout(() => button.classList.remove("is-action-clicked"), 900);
        return;
      }
      const target = element?.closest("a[href]");
      if (!(target instanceof HTMLAnchorElement)) return;
      if (
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        target.href.startsWith("mailto:") ||
        target.href.startsWith("tel:") ||
        target.origin !== window.location.origin
      ) {
        return;
      }

      const nextUrl = new URL(target.href);
      if (
        nextUrl.pathname === window.location.pathname &&
        nextUrl.search === window.location.search
      ) {
        return;
      }

      setActive(true);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(finish, 8000);
    };

    const handlePointerOver = (event: PointerEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const target = element?.closest("a[href]");
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank") return;
      if (target.origin !== window.location.origin || target.hasAttribute("download")) return;
      const nextUrl = new URL(target.href);
      const prefetchKey = `${nextUrl.pathname}${nextUrl.search}`;
      if (nextUrl.pathname === window.location.pathname || prefetchedRef.current.has(prefetchKey)) {
        return;
      }
      prefetchedRef.current.add(prefetchKey);
      router.prefetch(prefetchKey);
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("pointerover", handlePointerOver, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("pointerover", handlePointerOver, true);
      finish();
    };
  }, [router]);

  useEffect(() => {
    setActive(false);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, [pathname]);

  return (
    <div
      className={`navigation-progress ${active ? "is-active" : ""}`}
      role="status"
      aria-label={active ? "Loading page" : undefined}
      aria-hidden={!active}
    />
  );
}
