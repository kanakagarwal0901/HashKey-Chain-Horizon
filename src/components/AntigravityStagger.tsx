"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";

interface AntigravityStaggerProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  duration?: number;
  delay?: number;
  selector?: string; // target specific children or direct children
}

export default function AntigravityStagger({
  children,
  className = "",
  stagger = 0.08,
  duration = 0.45,
  delay = 0.05,
  selector,
}: AntigravityStaggerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      // Reduced motion: immediate static display
      return;
    }

    const container = containerRef.current;
    const targets = selector
      ? container.querySelectorAll(selector)
      : Array.from(container.children);

    if (!targets || targets.length === 0) return;

    // Apply will-change temporarily
    targets.forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.willChange = "transform, opacity";
      }
    });

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        {
          opacity: 0,
          y: 18,
        },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          stagger,
          ease: "power2.out",
          onComplete: () => {
            // Remove will-change after measured animation completes for optimal memory
            targets.forEach((el) => {
              if (el instanceof HTMLElement) {
                el.style.willChange = "auto";
              }
            });
          },
        }
      );
    }, container);

    return () => ctx.revert();
  }, [stagger, duration, delay, selector]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
