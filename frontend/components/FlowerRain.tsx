"use client";

import { useEffect, useRef, useState } from "react";

interface Petal {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
  color: string; // marigold (orange/yellow), rose (red)
  opacity: number;
}

export default function FlowerRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const handleTrigger = () => {
      setIsActive(true);
      // Automatically turn off after 8 seconds of rain
      setTimeout(() => {
        setIsActive(false);
      }, 8000);
    };

    window.addEventListener("trigger-flower-rain", handleTrigger);
    return () => window.removeEventListener("trigger-flower-rain", handleTrigger);
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let petals: Petal[] = [];
    const maxPetals = 80;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resizeCanvas);

    const colors = [
      "#ff8f00", // marigold orange
      "#ffc107", // marigold yellow
      "#e91e63", // rose pink
      "#d32f2f", // rose red
    ];

    const createPetal = (onScreen = false): Petal => {
      return {
        x: Math.random() * canvas.width,
        y: onScreen ? Math.random() * canvas.height : -20,
        size: Math.random() * 8 + 6,
        speedY: Math.random() * 2 + 1.5,
        speedX: Math.random() * 1 - 0.5,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 2 - 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.4 + 0.6,
      };
    };

    // Initialize petals
    for (let i = 0; i < maxPetals; i++) {
      petals.push(createPetal(true));
    }

    const drawPetal = (ctx: CanvasRenderingContext2D, p: Petal) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.beginPath();
      
      // Draw organic petal oval/tear shape
      ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fill();

      // Petal center vein highlight
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.lineTo(p.size * 0.8, 0);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    };

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      petals.forEach((p, index) => {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.y * 0.01) * 0.3; // wind sway
        p.rotation += p.rotationSpeed;

        drawPetal(ctx, p);

        // Respawn if off screen bottom
        if (p.y > canvas.height + 20) {
          petals[index] = createPetal(false);
        }
      });

      animationId = requestAnimationFrame(update);
    };

    update();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 block h-full w-full"
    />
  );
}
