"use client";

import { useEffect, useRef } from "react";

/**
 * The global star-field ambient layer (spec §7): a low-density canvas particle
 * layer behind the aurora blobs. Respects prefers-reduced-motion (no twinkle /
 * drift). The radial base + auroras are pure CSS (globals.css); this only paints
 * the stars so the GPU load stays tiny.
 */
export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    let stars: { x: number; y: number; r: number; a: number; tw: number }[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.floor(
        (window.innerWidth * window.innerHeight) / 14000,
      );
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.1 + 0.2,
        a: Math.random() * 0.5 + 0.2,
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const isLight = () =>
      document.documentElement.classList.contains("light");

    const draw = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const base = isLight() ? "15,23,42" : "255,255,255";
      for (const s of stars) {
        const twinkle = reduced ? s.a : s.a * (0.6 + 0.4 * Math.sin(t / 900 + s.tw));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${base},${twinkle * (isLight() ? 0.35 : 1)})`;
        ctx.fill();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    if (reduced) {
      draw(0);
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <div className="space-bg" aria-hidden />
      <div className="aurora aurora-cyan" aria-hidden />
      <div className="aurora aurora-violet" aria-hidden />
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-[1]"
      />
    </>
  );
}
