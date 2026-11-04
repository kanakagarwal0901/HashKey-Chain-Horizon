"use client";

import React, { useEffect, useRef } from "react";
import { playHoverSound, playPulseSound } from "@/utils/griflanAudio";

interface GriflanWireframeGlobeProps {
  size?: number;
  className?: string;
}

export default function GriflanWireframeGlobe({
  size = 460,
  className = "",
}: GriflanWireframeGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const width = (canvas.width = size * 2);
    const height = (canvas.height = size * 2);

    // 3D parameters
    const radius = size * 0.72;
    const fov = 600;
    let rotX = 0.25;
    let rotY = 0;
    let targetRotX = 0.25;
    let targetRotY = 0;

    // Mouse tracking for reactive inertia
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left - rect.width / 2;
      const clientY = e.clientY - rect.top - rect.height / 2;
      targetRotY = (clientX / (rect.width / 2)) * 0.8;
      targetRotX = -(clientY / (rect.height / 2)) * 0.6 + 0.25;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Generate latitude rings
    const latRings = 18;
    const pointsPerRing = 72;
    const latData: { y: number; r: number }[] = [];
    for (let i = 1; i < latRings; i++) {
      const phi = (i / latRings) * Math.PI - Math.PI / 2;
      latData.push({
        y: Math.sin(phi) * radius,
        r: Math.cos(phi) * radius,
      });
    }

    // Generate longitude meridians
    const lonRings = 18;

    // Core pulsing reactor nodes
    const dataNodes = [
      { lat: 0.2, lon: 0.5, label: "Claude-3.7-TEE", color: "#10b981" },
      { lat: -0.4, lon: 1.8, label: "HashKey-HSP-133", color: "#06b6d4" },
      { lat: 0.6, lon: 3.2, label: "DeepSeek-R1-Zero", color: "#8b5cf6" },
      { lat: -0.1, lon: 4.5, label: "WorldID-Verified", color: "#f43f5e" },
    ];

    let t = 0;

    const render = () => {
      t += 0.008;
      // Smooth damp rotation
      rotX += (targetRotX - rotX) * 0.05;
      rotY += (targetRotY + t * 0.4 - rotY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains("dark");
      const cx = width / 2;
      const cy = height / 2;

      // Color mapping function based on normalized Y height (-1 to +1)
      const getColor = (normY: number, alpha: number) => {
        const effectiveAlpha = isDark ? alpha : Math.min(1, alpha * 1.5 + 0.15);
        if (normY < -0.3) {
          // Top pole: Ruby
          return isDark
            ? `rgba(244, 63, 94, ${effectiveAlpha})`
            : `rgba(225, 29, 72, ${effectiveAlpha})`;
        } else if (normY < 0.1) {
          // Upper hemisphere: Electric Violet
          return isDark
            ? `rgba(139, 92, 246, ${effectiveAlpha})`
            : `rgba(124, 58, 237, ${effectiveAlpha})`;
        } else if (normY < 0.5) {
          // Equator: Cyan
          return isDark
            ? `rgba(6, 182, 212, ${effectiveAlpha})`
            : `rgba(8, 145, 178, ${effectiveAlpha})`;
        } else {
          // Bottom pole: Emerald
          return isDark
            ? `rgba(16, 185, 129, ${effectiveAlpha})`
            : `rgba(5, 150, 105, ${effectiveAlpha})`;
        }
      };

      // 1. Draw Latitude Rings
      for (const lat of latData) {
        ctx.beginPath();
        let first = true;
        let avgZ = 0;

        for (let j = 0; j <= pointsPerRing; j++) {
          const theta = (j / pointsPerRing) * Math.PI * 2;
          const x0 = Math.cos(theta) * lat.r;
          const y0 = lat.y;
          const z0 = Math.sin(theta) * lat.r;

          // Rotate around X
          const cosX = Math.cos(rotX);
          const sinX = Math.sin(rotX);
          const y1 = y0 * cosX - z0 * sinX;
          const z1 = y0 * sinX + z0 * cosX;

          // Rotate around Y
          const cosY = Math.cos(rotY);
          const sinY = Math.sin(rotY);
          const x2 = x0 * cosY + z1 * sinY;
          const z2 = -x0 * sinY + z1 * cosY;

          avgZ += z2;

          const scale = fov / (fov + z2 + radius * 0.3);
          const px = x2 * scale + cx;
          const py = y1 * scale + cy;

          if (first) {
            ctx.moveTo(px, py);
            first = false;
          } else {
            ctx.lineTo(px, py);
          }
        }

        avgZ /= pointsPerRing;
        const normY = lat.y / radius;
        const depthAlpha = Math.max(0.08, Math.min(0.55, (avgZ + radius) / (radius * 2)));
        ctx.strokeStyle = getColor(normY, depthAlpha * 0.85);
        ctx.lineWidth = isDark ? 1.2 : 1.35;
        ctx.stroke();
      }

      // 2. Draw Longitude Meridians
      for (let i = 0; i < lonRings; i++) {
        const phiBase = (i / lonRings) * Math.PI * 2;
        ctx.beginPath();
        let first = true;
        let avgZ = 0;

        for (let j = 0; j <= pointsPerRing; j++) {
          const theta = (j / pointsPerRing) * Math.PI - Math.PI / 2;
          const x0 = Math.cos(theta) * Math.cos(phiBase) * radius;
          const y0 = Math.sin(theta) * radius;
          const z0 = Math.cos(theta) * Math.sin(phiBase) * radius;

          // Rotate around X
          const cosX = Math.cos(rotX);
          const sinX = Math.sin(rotX);
          const y1 = y0 * cosX - z0 * sinX;
          const z1 = y0 * sinX + z0 * cosX;

          // Rotate around Y
          const cosY = Math.cos(rotY);
          const sinY = Math.sin(rotY);
          const x2 = x0 * cosY + z1 * sinY;
          const z2 = -x0 * sinY + z1 * cosY;

          avgZ += z2;

          const scale = fov / (fov + z2 + radius * 0.3);
          const px = x2 * scale + cx;
          const py = y1 * scale + cy;

          if (first) {
            ctx.moveTo(px, py);
            first = false;
          } else {
            ctx.lineTo(px, py);
          }
        }

        avgZ /= pointsPerRing;
        const depthAlpha = Math.max(0.08, Math.min(0.5, (avgZ + radius) / (radius * 2)));
        ctx.strokeStyle = getColor(0, depthAlpha * 0.7);
        ctx.lineWidth = isDark ? 1.1 : 1.25;
        ctx.stroke();
      }

      // 3. Draw Celestial / Protocol Data Nodes on the Sphere
      for (const node of dataNodes) {
        const x0 = Math.cos(node.lat) * Math.cos(node.lon) * radius;
        const y0 = Math.sin(node.lat) * radius;
        const z0 = Math.cos(node.lat) * Math.sin(node.lon) * radius;

        // Rotate around X
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const y1 = y0 * cosX - z0 * sinX;
        const z1 = y0 * sinX + z0 * cosX;

        // Rotate around Y
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const x2 = x0 * cosY + z1 * sinY;
        const z2 = -x0 * sinY + z1 * cosY;

        // Only draw if on front hemisphere
        if (z2 > -radius * 0.2) {
          const scale = fov / (fov + z2 + radius * 0.3);
          const px = x2 * scale + cx;
          const py = y1 * scale + cy;

          // Node Halo
          ctx.beginPath();
          ctx.arc(px, py, 6 * scale, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.shadowColor = node.color;
          ctx.shadowBlur = isDark ? 14 : 6;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Node center core
          ctx.beginPath();
          ctx.arc(px, py, 2.5 * scale, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? "#ffffff" : "#0f172a";
          ctx.fill();

          // Label with crisp contrast
          ctx.font = `${Math.max(9, Math.round(10 * scale))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.9)" : "rgba(15, 23, 42, 0.95)";
          ctx.fillText(node.label, px + 10 * scale, py + 3 * scale);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [size]);

  return (
    <div
      className={`relative flex items-center justify-center select-none pointer-events-auto ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => playHoverSound()}
      onClick={() => playPulseSound()}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
      {/* Subtle chromatic lens reflection rim */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none opacity-80 dark:opacity-100"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 62%, rgba(16, 185, 129, 0.1) 78%, rgba(6, 182, 212, 0.14) 88%, transparent 100%)",
        }}
      />
    </div>
  );
}
