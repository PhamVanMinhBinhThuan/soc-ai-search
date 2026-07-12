"use client"

import { motion, type MotionValue, useTransform } from "framer-motion"

export function AiCore({
  parallaxX,
  parallaxY,
}: {
  parallaxX: MotionValue<number>
  parallaxY: MotionValue<number>
}) {
  // The core drifts opposite to the cursor for depth.
  const x = useTransform(parallaxX, (v) => v * -0.6)
  const y = useTransform(parallaxY, (v) => v * -0.6)

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ x, y }}
    >
      <div className="relative">
        {/* Outer ambient glow */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.35) 0%, rgba(34,211,238,0.18) 45%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />

        {/* Mid core, shifts hue between purple and cyan */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
          animate={{
            background: [
              "radial-gradient(circle, rgba(124,58,237,0.75) 0%, rgba(124,58,237,0.15) 55%, transparent 75%)",
              "radial-gradient(circle, rgba(34,211,238,0.75) 0%, rgba(34,211,238,0.15) 55%, transparent 75%)",
              "radial-gradient(circle, rgba(124,58,237,0.75) 0%, rgba(124,58,237,0.15) 55%, transparent 75%)",
            ],
            scale: [1, 1.08, 1],
          }}
          transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />

        {/* Hot inner nucleus */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl"
          style={{
            background:
              "radial-gradient(circle, rgba(244,244,255,0.9) 0%, rgba(34,211,238,0.6) 40%, transparent 70%)",
          }}
          animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.6, 0.95, 0.6] }}
          transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  )
}
