"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  z: number;
  pz: number;
}

interface WelcomeHyperspaceFieldProps {
  /** When true, slam out of light-speed and clear toward the homepage */
  exiting?: boolean;
  className?: string;
}

const STAR_COUNT = 160;
const DEPTH = 1000;
const RAMP_MS = 1100;
const EXIT_MS = 1200;

function spawnStar(spread: number): Star {
  const z = Math.random() * DEPTH + 40;
  return {
    x: (Math.random() - 0.5) * spread,
    y: (Math.random() - 0.5) * spread,
    z,
    pz: z,
  };
}

/**
 * Canvas hyperspace / light-speed star field for the entry welcome.
 * On exit: decelerate to a stop and fade the void so the homepage shows through.
 */
export function WelcomeHyperspaceField({
  exiting = false,
  className,
}: WelcomeHyperspaceFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exitingRef = useRef(exiting);

  useEffect(() => {
    exitingRef.current = exiting;
  }, [exiting]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let stars: Star[] = [];
    let spread = 1200;
    const started = performance.now();
    let exitStarted: number | null = null;

    function resize() {
      const parent = canvas!.parentElement;
      w = parent?.clientWidth || window.innerWidth;
      h = parent?.clientHeight || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      spread = Math.max(w, h) * 1.6;
      stars = Array.from({ length: STAR_COUNT }, () => spawnStar(spread));
    }

    function paint(now: number) {
      if (!running || !ctx) return;

      const cx = w / 2;
      const cy = h / 2;

      const ramp = Math.min(1, (now - started) / RAMP_MS);
      const eased = ramp * ramp * (3 - 2 * ramp);

      if (exitingRef.current && exitStarted === null) {
        exitStarted = now;
      }

      let settle = 1;
      let voidAlpha = 1;
      let exitT = 0;
      if (exitStarted !== null) {
        exitT = Math.min(1, (now - exitStarted) / EXIT_MS);
        /* Ease-out: hard brake from light-speed */
        const brake = 1 - Math.pow(1 - exitT, 3);
        settle = 1 - brake;
        voidAlpha = 1 - brake * 0.98;
      }

      const warp = eased * settle;
      const speed = 0.35 + warp * 46;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = `rgba(2, 2, 3, ${voidAlpha})`;
      ctx.fillRect(0, 0, w, h);

      if (voidAlpha > 0.04) {
        const core = ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          Math.max(w, h) * 0.55
        );
        core.addColorStop(
          0,
          `rgba(88, 70, 140, ${(0.06 + warp * 0.12) * voidAlpha})`
        );
        core.addColorStop(
          0.45,
          `rgba(40, 30, 70, ${(0.04 + warp * 0.05) * voidAlpha})`
        );
        core.addColorStop(1, "rgba(2, 2, 3, 0)");
        ctx.fillStyle = core;
        ctx.fillRect(0, 0, w, h);
      }

      /* Arrival bloom — brief flash as warp collapses */
      if (exitT > 0.15 && exitT < 0.55) {
        const bloom =
          exitT < 0.32
            ? (exitT - 0.15) / 0.17
            : 1 - (exitT - 0.32) / 0.23;
        ctx.fillStyle = `rgba(210, 205, 255, ${bloom * 0.14 * voidAlpha})`;
        ctx.fillRect(0, 0, w, h);
      }

      const focal = Math.min(w, h) * 0.55;

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.pz = star.z;
        star.z -= speed;

        if (star.z <= 1) {
          const next = spawnStar(spread);
          next.z = DEPTH * (0.65 + Math.random() * 0.35);
          next.pz = next.z;
          stars[i] = next;
          continue;
        }

        const sx = (star.x / star.z) * focal + cx;
        const sy = (star.y / star.z) * focal + cy;
        const px = (star.x / star.pz) * focal + cx;
        const py = (star.y / star.pz) * focal + cy;

        if (sx < -40 || sy < -40 || sx > w + 40 || sy > h + 40) {
          continue;
        }

        const depthFade = 1 - star.z / DEPTH;
        const alpha =
          Math.min(1, 0.25 + depthFade * 0.85 + warp * 0.2) * voidAlpha;
        if (alpha < 0.02) continue;

        const streak = Math.max(
          0.8,
          (1 - star.z / star.pz) * (8 + warp * 28)
        );

        ctx.beginPath();
        ctx.strokeStyle = `rgba(230, 226, 255, ${alpha})`;
        ctx.lineWidth = 0.55 + depthFade * (1.1 + warp * 1.4);
        ctx.lineCap = "round";
        ctx.moveTo(px, py);
        const dx = sx - px;
        const dy = sy - py;
        const len = Math.hypot(dx, dy) || 1;
        ctx.lineTo(
          sx + (dx / len) * streak * 0.15,
          sy + (dy / len) * streak * 0.15
        );
        ctx.stroke();

        if (warp > 0.2 && depthFade > 0.5) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
          ctx.arc(sx, sy, 0.55 + depthFade * (0.9 + warp * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(paint);
    }

    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(paint);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
