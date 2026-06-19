"use client"

import { useMemo } from "react"
import { motion, type MotionValue, useTransform } from "framer-motion"

type Star = {
  top: number
  left: number
  size: number
  delay: number
  duration: number
  cyan: boolean
}

function generateStars(count: number): Star[] {
  // Deterministic pseudo-random so SSR and client match.
  let seed = 1337
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  return Array.from({ length: count }, () => ({
    top: rand() * 100,
    left: rand() * 100,
    size: rand() * 2 + 1,
    delay: rand() * 4,
    duration: rand() * 3 + 2,
    cyan: rand() > 0.65,
  }))
}

function useStars(count: number): Star[] {
  return useMemo(() => generateStars(count), [count])
}

export function StarField({
  parallaxX,
  parallaxY,
}: {
  parallaxX: MotionValue<number>
  parallaxY: MotionValue<number>
}) {
  const stars = useStars(90)

  // Background particles get a very slight parallax movement.
  const x = useTransform(parallaxX, (v) => v * -0.4)
  const y = useTransform(parallaxY, (v) => v * -0.4)

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ x, y }}
    >
      {stars.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            backgroundColor: s.cyan ? "#22d3ee" : "#e4e4e7",
            boxShadow: s.cyan
              ? "0 0 6px 1px rgba(34,211,238,0.8)"
              : "0 0 4px 1px rgba(228,228,231,0.5)",
          }}
          animate={{ opacity: [0.15, 0.9, 0.15] }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  )
}
