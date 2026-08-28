"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

export default function TempleBell() {
  const [isRinging, setIsRinging] = useState(false);

  const playBellSound = () => {
    setIsRinging(true);
    setTimeout(() => setIsRinging(false), 500);

    // Synthesize metallic temple bell sound using Web Audio API
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Fundamental frequency for a resonant temple bell
      osc1.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc1.type = "sine";

      // Harmonics to create metallic resonance
      osc2.frequency.setValueAtTime(554.37, ctx.currentTime); // C#5 (Major Third)
      osc2.type = "sine";

      osc3.frequency.setValueAtTime(659.25, ctx.currentTime); // E5 (Fifth)
      osc3.type = "triangle";

      // Gain Envelope (fast attack, slow decay)
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);

      // Connect nodes
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      osc3.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Start & Stop oscillators
      osc1.start();
      osc2.start();
      osc3.start();

      osc1.stop(ctx.currentTime + 2.2);
      osc2.stop(ctx.currentTime + 2.2);
      osc3.stop(ctx.currentTime + 2.2);
    } catch (e) {
      console.warn("Web Audio API not supported on this browser:", e);
    }
  };

  return (
    <button
      onClick={playBellSound}
      className="group relative flex items-center justify-center rounded-full p-2.5 bg-saffron-100 hover:bg-saffron-500 hover:text-white transition-all duration-300 focus:outline-none"
      title="Ring Temple Bell"
    >
      <Bell
        className={`h-5 w-5 cursor-pointer text-saffron-600 group-hover:text-white transition-transform ${
          isRinging ? "animate-bounce origin-top rotate-12 scale-110" : "hover:animate-[bell-ring_0.5s_ease-in-out]"
        }`}
      />
      {/* Floating text helper */}
      <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
        Ring Bell
      </span>
    </button>
  );
}
