import { useEffect, useRef } from "react";
import { juice } from "@/game/juice";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  spin: number;
};

export function Garden() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const styles = getComputedStyle(document.documentElement);
    const gold = styles.getPropertyValue("--color-gold").trim() || "#f0c14a";
    const blossom = styles.getPropertyValue("--color-blossom").trim() || "#ef6d8a";
    const cream = styles.getPropertyValue("--color-fg").trim() || "#f6f1e4";
    const colors = [gold, blossom, cream];
    const motes: Particle[] = [];

    const spawn = (count: number, burst: boolean) => {
      const rect = canvas.getBoundingClientRect();
      for (let i = 0; i < count; i++) {
        if (motes.length > 90) motes.shift();
        const angle = Math.random() * Math.PI * 2;
        const speed = burst ? 40 + Math.random() * 140 : 8 + Math.random() * 18;
        motes.push({
          x: burst ? rect.width * (0.35 + Math.random() * 0.3) : Math.random() * rect.width,
          y: burst ? rect.height * (0.35 + Math.random() * 0.25) : Math.random() * rect.height,
          vx: Math.cos(angle) * speed,
          vy: (burst ? Math.sin(angle) * speed : -speed) - (burst ? 20 : 0),
          life: 0,
          max: burst ? 0.8 + Math.random() * 0.7 : 6 + Math.random() * 6,
          size: burst ? 2 + Math.random() * 3.4 : 1.2 + Math.random() * 2.2,
          color: colors[i % colors.length] ?? gold,
          spin: Math.random() * Math.PI,
        });
      }
    };

    if (!reduce) spawn(22, false);

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let last = performance.now();
    let raf = 0;
    let running = true;
    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, width, height);
      for (let i = motes.length - 1; i >= 0; i--) {
        const mote = motes[i]!;
        mote.life += dt;
        if (mote.life > mote.max) {
          motes.splice(i, 1);
          continue;
        }
        mote.x += mote.vx * dt;
        mote.y += mote.vy * dt;
        mote.vy += 12 * dt;
        mote.spin += dt;
        const alpha = 1 - mote.life / mote.max;
        ctx.save();
        ctx.translate(mote.x, mote.y);
        ctx.rotate(mote.spin);
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = mote.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, mote.size, mote.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (!reduce && motes.length < 18 && Math.random() < 0.04) spawn(1, false);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const unsub = juice.on((kind) => {
      if (kind === "win") spawn(reduce ? 10 : 56, true);
      else if (kind === "bloom" || kind === "ok") spawn(reduce ? 4 : 16, true);
    });
    const onHide = () => {
      running = document.visibilityState === "visible";
      if (running) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      unsub();
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}
