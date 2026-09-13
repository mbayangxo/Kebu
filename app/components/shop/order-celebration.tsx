"use client";

import { useCallback, useEffect, useRef } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  life: number;
};

const COLORS = [KEBU.orange, "#FFD700", "#25D366", "#6366F1", "#EC4899", "#0EA5E9", "#F97316"];

function launchConfetti(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles: Particle[] = [];
  // Two burst origins — left and right of center top
  const origins = [
    { x: canvas.width * 0.35, y: canvas.height * 0.35 },
    { x: canvas.width * 0.65, y: canvas.height * 0.35 },
  ];
  for (const origin of origins) {
    for (let i = 0; i < 70; i++) {
      const angle = -Math.PI / 2 + ((Math.random() - 0.5) * Math.PI * 1.2);
      const speed = 5 + Math.random() * 9;
      particles.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 7 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        life: 0.9 + Math.random() * 0.1,
      });
    }
  }

  let rafId = 0;
  function tick() {
    const W = canvas.width;
    const H = canvas.height;
    ctx!.clearRect(0, 0, W, H);
    let alive = 0;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.32;
      p.vx *= 0.985;
      p.rotation += p.rotSpeed;
      p.life -= 0.011;
      if (p.life <= 0 || p.y > H + 20) continue;
      alive++;
      ctx!.save();
      ctx!.globalAlpha = Math.max(0, p.life);
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx!.restore();
    }
    if (alive > 0) rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}

export function OrderCelebration({
  orderNum,
  onDismiss,
}: {
  orderNum: 1 | 2;
  onDismiss: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const dismiss = useCallback(() => dismissRef.current(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cancel = launchConfetti(canvas);
    const t = setTimeout(() => dismissRef.current(), 5500);
    return () => {
      cancel();
      clearTimeout(t);
    };
  }, []);

  const isFirst = orderNum === 1;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      style={{ background: "rgba(10,10,10,0.8)", backdropFilter: "blur(6px)" }}
      onClick={dismiss}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0"
        aria-hidden
      />
      <div
        className="relative z-10 w-full max-w-[340px] rounded-2xl p-8 text-center shadow-2xl"
        style={{ background: "#FFFAF6", border: "1px solid #F0E8DF" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
          style={{ background: KEBU.orange }}
          aria-hidden
        >
          {isFirst ? "🎉" : "🔥"}
        </div>

        <h2 className="text-[22px] font-black leading-tight" style={{ color: "#0F0D33" }}>
          {isFirst ? "Your first order!" : "Second order — keep going!"}
        </h2>

        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "#8A8578" }}>
          {isFirst
            ? "Someone just bought from you. This is just the beginning — more are coming."
            : "The momentum is real. Keep sharing your link."}
        </p>

        <button
          type="button"
          onClick={dismiss}
          className="mt-6 w-full rounded-xl py-3 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: KEBU.orange }}
        >
          Let&apos;s go!
        </button>

        <p className="mt-4 text-[11px]" style={{ color: "#C0B8B0" }}>
          Powered by <span style={{ color: KEBU.orange, fontWeight: 600 }}>kebu</span>
        </p>
      </div>
    </div>
  );
}
