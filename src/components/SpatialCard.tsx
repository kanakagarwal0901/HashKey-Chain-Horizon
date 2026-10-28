"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";

interface SpatialCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // max tilt degrees (default 4)
  glare?: boolean; // whether to show specular light reflection
}

export default function SpatialCard({
  children,
  className = "",
  maxTilt = 4,
  glare = true,
  ...props
}: SpatialCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [glarePos, setGlarePos] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setIsReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isReducedMotion || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const xPct = mouseX / rect.width;
      const yPct = mouseY / rect.height;

      // Calculate tilt: moving mouse up tilts card forward (-rotateX)
      const rotateX = (0.5 - yPct) * maxTilt * 2;
      const rotateY = (xPct - 0.5) * maxTilt * 2;

      setTilt({ x: rotateX, y: rotateY });
      if (glare) {
        setGlarePos({
          x: xPct * 100,
          y: yPct * 100,
          opacity: 0.12,
        });
      }
    },
    [maxTilt, glare, isReducedMotion]
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  const cardStyle: React.CSSProperties = isReducedMotion
    ? {}
    : {
        transform: `perspective(1000px) rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg)`,
        transition: tilt.x === 0 && tilt.y === 0 ? "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)" : "transform 0.1s ease-out",
        transformStyle: "preserve-3d",
      };

  const classes = className.split(/\s+/).filter(Boolean);
  const innerLayoutClasses = classes
    .filter((c) => /^(space-[xy]-|flex|grid|gap-|items-|justify-)/.test(c))
    .join(" ");
  const outerClasses = classes
    .filter((c) => !/^(space-[xy]-)/.test(c))
    .join(" ");

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={cardStyle}
      className={`relative rounded-3xl overflow-hidden liquid-glass ${outerClasses}`}
      {...props}
    >
      {/* Luminous Specular Top Rim Reflection */}
      <div data-ui="specular-rim" className="specular-rim-highlight pointer-events-none" />

      {/* Specular lighting sheen */}
      {glare && !isReducedMotion && (
        <div
          data-ui="specular-glare"
          className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-10"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, ${glarePos.opacity}), transparent 60%)`, // taste-skill-ignore
          }}
        />
      )}
      <div className={`relative z-20 h-full w-full ${innerLayoutClasses}`}>{children}</div>
    </div>
  );
}
