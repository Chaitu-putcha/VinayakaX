"use client";

import { useEffect, useRef } from "react";

interface Diya {
  x: number;
  y: number;
  size: number;
  speed: number;
  flameSize: number;
  flickerSpeed: number;
  phase: number;
}

export default function DiyaBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let diyas: Diya[] = [];
    const maxDiyas = 15;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createDiya = (initialY = false): Diya => {
      return {
        x: Math.random() * canvas.width,
        y: initialY ? Math.random() * canvas.height : canvas.height + 50,
        size: Math.random() * 8 + 6, // clay base radius
        speed: Math.random() * 0.4 + 0.2, // speed upwards
        flameSize: Math.random() * 4 + 4,
        flickerSpeed: Math.random() * 0.1 + 0.05,
        phase: Math.random() * Math.PI * 2
      };
    };

    // Seed initial diyas
    for (let i = 0; i < maxDiyas; i++) {
      diyas.push(createDiya(true));
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const drawDiyaBase = (ctx: CanvasRenderingContext2D, d: Diya) => {
      ctx.beginPath();
      // Draw clay pot base shape
      ctx.arc(d.x, d.y, d.size, 0, Math.PI, false);
      ctx.lineTo(d.x - d.size, d.y);
      ctx.fillStyle = "rgba(184, 91, 53, 0.4)"; // soft terracotta brown
      ctx.fill();
      
      // Draw inner highlight
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size - 2, 0, Math.PI, false);
      ctx.fillStyle = "rgba(139, 69, 19, 0.3)";
      ctx.fill();
    };

    const drawFlame = (ctx: CanvasRenderingContext2D, d: Diya, time: number) => {
      const flicker = Math.sin(time * d.flickerSpeed + d.phase) * 2;
      const flameH = d.flameSize + flicker;
      const flameW = d.size * 0.7;

      ctx.beginPath();
      ctx.moveTo(d.x - flameW / 2, d.y);
      ctx.quadraticCurveTo(d.x - flameW / 2, d.y - flameH * 0.4, d.x, d.y - flameH);
      ctx.quadraticCurveTo(d.x + flameW / 2, d.y - flameH * 0.4, d.x + flameW / 2, d.y);
      ctx.closePath();

      // Flame gradient (Saffron to Gold to White)
      const grad = ctx.createRadialGradient(
        d.x, d.y - flameH / 2, 1,
        d.x, d.y - flameH / 2, flameH
      );
      grad.addColorStop(0, "rgba(255, 255, 255, 0.9)"); // hot white center
      grad.addColorStop(0.3, "rgba(255, 215, 0, 0.8)"); // gold
      grad.addColorStop(0.7, "rgba(255, 111, 0, 0.5)"); // saffron
      grad.addColorStop(1, "rgba(255, 69, 0, 0)"); // transparent edge

      ctx.fillStyle = grad;
      ctx.fill();

      // Flame glow aura
      ctx.beginPath();
      ctx.arc(d.x, d.y - flameH / 2, flameH * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 140, 0, ${0.05 + Math.abs(flicker) * 0.01})`;
      ctx.fill();
    };

    let frameCount = 0;
    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      diyas.forEach((d, index) => {
        // Move diya up
        d.y -= d.speed;
        // Sway side to side
        d.x += Math.sin(frameCount * 0.005 + d.phase) * 0.15;

        // Draw elements
        drawDiyaBase(ctx, d);
        drawFlame(ctx, d, frameCount);

        // Respawn if drifted off top
        if (d.y < -50) {
          diyas[index] = createDiya(false);
        }
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10 block h-full w-full"
    />
  );
}
