"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal for `.fade-in` elements on this page, matching the pattern
 * used on the other pages (about/projects/contact) but as a shared
 * component instead of inline duplicated logic. Adds a safety timeout so
 * elements still reveal even if one is never scrolled into view.
 */
export default function FadeIn() {
  useEffect(() => {
    const fadeEls = document.querySelectorAll<HTMLElement>(".fade-in");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    fadeEls.forEach((el) => observer.observe(el));

    const safetyTimer = setTimeout(() => {
      fadeEls.forEach((el) => el.classList.add("visible"));
    }, 2500);

    return () => {
      observer.disconnect();
      clearTimeout(safetyTimer);
    };
  }, []);

  return null;
}
