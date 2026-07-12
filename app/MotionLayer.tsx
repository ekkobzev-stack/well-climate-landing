"use client";

import { useEffect } from "react";

const revealGroups = [
  ".sectionTitle",
  ".solution",
  ".process li",
  ".trustPortrait",
  ".trustCopy",
  ".typicalGrid article",
  ".brandLogo",
  ".faqGrid details",
  ".contactGrid > *",
];

export default function MotionLayer() {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reducedMotion.matches || !("IntersectionObserver" in window)) return;

    const elements = revealGroups.flatMap((selector) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector)).map((element, index) => {
        element.classList.add("motionReveal");
        element.style.setProperty("--motion-delay", `${(index % 6) * 45}ms`);
        return element;
      }),
    );

    root.classList.add("motionReady");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("motionVisible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.12 },
    );

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      root.classList.remove("motionReady");
      elements.forEach((element) => {
        element.classList.remove("motionReveal", "motionVisible");
        element.style.removeProperty("--motion-delay");
      });
    };
  }, []);

  return null;
}
