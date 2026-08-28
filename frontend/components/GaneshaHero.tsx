"use client";

import { motion } from "framer-motion";

export default function GaneshaHero() {
  return (
    <div className="relative flex items-center justify-center w-full max-w-[450px] aspect-square mx-auto">
      {/* Outer glowing halo */}
      <div className="absolute inset-0 bg-radial-gradient from-saffron-500/20 via-gold-400/5 to-transparent rounded-full blur-3xl animate-pulse" />
      
      {/* Floating Diya indicators */}
      <div className="absolute top-4 left-6 animate-bounce duration-1000 bg-saffron-100 dark:bg-amber-950/40 p-2 rounded-full border border-gold-400/30">🪔</div>
      <div className="absolute bottom-10 right-6 animate-bounce duration-700 bg-saffron-100 dark:bg-amber-950/40 p-2 rounded-full border border-gold-400/30">🪔</div>

      {/* Lord Ganesha SVG Illustration */}
      <motion.svg
        viewBox="0 0 200 200"
        className="w-[85%] h-[85%] relative z-10 filter drop-shadow-[0_0_15px_rgba(255,111,0,0.4)]"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        {/* Subtle decorative halo ring */}
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="url(#goldGradient)"
          strokeWidth="1"
          strokeDasharray="4 8"
          className="animate-[spin_40s_linear_infinite]"
        />

        {/* Lord Ganesha outline paths */}
        {/* Ears */}
        <path
          d="M 60,80 C 40,70 35,110 55,120 C 60,122 65,110 65,100 Z"
          fill="none"
          stroke="url(#saffronGradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M 140,80 C 160,70 165,110 145,120 C 140,122 135,110 135,100 Z"
          fill="none"
          stroke="url(#saffronGradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Crown (Mukut) */}
        <path
          d="M 80,60 L 100,20 L 120,60 Z"
          fill="url(#goldGradient)"
          stroke="url(#saffronGradient)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <circle cx="100" cy="30" r="3" fill="#ffffff" className="animate-ping" />
        <path d="M 85,50 H 115" stroke="#ffffff" strokeWidth="2" />

        {/* Face and Trunk */}
        <path
          d="M 80,75 C 80,105 75,130 95,145 C 105,153 115,140 112,125 C 110,110 95,100 95,85"
          fill="none"
          stroke="url(#saffronGradient)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        
        {/* Trunk curve decoration (Laddu catcher) */}
        <path
          d="M 112,125 C 115,120 125,120 128,128 C 130,135 120,140 115,138"
          fill="none"
          stroke="url(#goldGradient)"
          strokeWidth="3"
        />

        {/* Large belly (Lambodara) */}
        <path
          d="M 75,110 C 65,135 70,170 100,170 C 130,170 135,135 125,110"
          fill="none"
          stroke="url(#saffronGradient)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Forehead Tilak (Red & Gold) */}
        <path
          d="M 97,55 C 97,55 100,45 100,45 C 100,45 103,55 103,55 Z"
          fill="#d32f2f"
        />
        <line x1="94" y1="52" x2="106" y2="52" stroke="#ffd700" strokeWidth="1.5" />
        <line x1="95" y1="56" x2="105" y2="56" stroke="#ffd700" strokeWidth="1.5" />

        {/* Tusk */}
        <path d="M 78,92 L 68,96 L 77,98 Z" fill="#ffffff" />

        {/* Modak (Laddu) in hand */}
        <circle cx="135" cy="132" r="5" fill="url(#goldGradient)" />
        <circle cx="131" cy="136" r="4" fill="url(#goldGradient)" />
        <circle cx="139" cy="136" r="4" fill="url(#goldGradient)" />

        {/* Definitions for Gradients */}
        <defs>
          <linearGradient id="saffronGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff9f43" />
            <stop offset="100%" stopColor="#ee5253" />
          </linearGradient>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffe066" />
            <stop offset="50%" stopColor="#ffd700" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
        </defs>
      </motion.svg>
    </div>
  );
}
