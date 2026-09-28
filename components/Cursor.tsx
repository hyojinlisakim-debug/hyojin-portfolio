"use client";

import { useEffect, useRef } from "react";

/**
 * Decorative cursor-follow glow. Does NOT hide the system cursor.
 * Skipped entirely on touch devices / coarse pointers and when the
 * user prefers reduced motion.
 */
export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduced.matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let dotX = 0,
      dotY = 0,
      ringX = 0,
      ringY = 0;
    let targetX = 0,
      targetY = 0;
    let raf = 0;
    let active = false;

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!active) {
        active = true;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
    };

    const onDown = () => ring.classList.add("cursor-ring--active");
    const onUp = () => ring.classList.remove("cursor-ring--active");
    const onLeave = () => {
      active = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const tick = () => {
      dotX += (targetX - dotX) * 0.9;
      dotY += (targetY - dotY) * 0.9;
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(tick);

    // Grow the ring on hoverable elements
    const hoverables = "a, button, [data-cursor-hover]";
    const onOver = (e: Event) => {
      const t = e.target as Element;
      if (t.closest && t.closest(hoverables)) ring.classList.add("cursor-ring--hover");
    };
    const onOut = (e: Event) => {
      const t = e.target as Element;
      if (t.closest && t.closest(hoverables)) ring.classList.remove("cursor-ring--hover");
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
