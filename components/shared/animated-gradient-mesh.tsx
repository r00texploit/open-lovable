"use client";

import { motion, useReducedMotion } from "framer-motion";

export function AnimatedGradientMesh() {
  const shouldReduceMotion = useReducedMotion();

  const orbs = [
    {
      color: "from-violet-500/20 to-fuchsia-500/20",
      size: 600,
      x: ["0%", "10%", "0%", "-10%", "0%"],
      y: ["0%", "-15%", "10%", "-5%", "0%"],
      duration: 20,
    },
    {
      color: "from-cyan-500/15 to-blue-500/15",
      size: 500,
      x: ["0%", "-20%", "10%", "0%"],
      y: ["0%", "15%", "-10%", "0%"],
      duration: 25,
    },
    {
      color: "from-amber-500/15 to-orange-500/15",
      size: 400,
      x: ["0%", "15%", "-10%", "0%"],
      y: ["0%", "-10%", "20%", "0%"],
      duration: 22,
    },
    {
      color: "from-emerald-500/10 to-teal-500/10",
      size: 350,
      x: ["0%", "-10%", "5%", "0%"],
      y: ["0%", "10%", "-15%", "0%"],
      duration: 18,
    },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${20 + i * 15}%`,
            top: `${10 + i * 20}%`,
          }}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: orb.x,
                  y: orb.y,
                }
          }
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div
            className={`w-full h-full rounded-full bg-gradient-to-br ${orb.color} blur-[100px]`}
          />
        </motion.div>
      ))}

      {/* Noise overlay for texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
