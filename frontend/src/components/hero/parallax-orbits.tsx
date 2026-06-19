"use client"

import { motion, type MotionValue, useTransform } from "framer-motion"

type RingConfig = {
  size: number
  tiltX: number
  tiltZ: number
  duration: number
  reverse: boolean
  color: string
  depth: number
  dots: number
}

const RINGS: RingConfig[] = [
  { size: 520, tiltX: 72, tiltZ: -18, duration: 18, reverse: false, color: "#22d3ee", depth: 1, dots: 2 },
  { size: 720, tiltX: 66, tiltZ: 24, duration: 26, reverse: true, color: "#a855f7", depth: 1.8, dots: 2 },
  { size: 940, tiltX: 78, tiltZ: -8, duration: 34, reverse: false, color: "#38bdf8", depth: 2.6, dots: 1 },
]

function Ring({
  config,
  parallaxX,
  parallaxY,
}: {
  config: RingConfig
  parallaxX: MotionValue<number>
  parallaxY: MotionValue<number>
}) {
  // Rings shift opposite to the cursor; farther rings move more for depth.
  const x = useTransform(parallaxX, (v) => v * -config.depth)
  const y = useTransform(parallaxY, (v) => v * -config.depth)

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{ x, y, translateX: "-50%", translateY: "-50%" }}
    >
      <div style={{ perspective: 1200 }}>
        <div
          className="relative"
          style={{
            width: config.size,
            height: config.size,
            transform: `rotateX(${config.tiltX}deg) rotateZ(${config.tiltZ}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {/* The ring itself */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: `1px solid ${config.color}`,
              opacity: 0.35,
              boxShadow: `0 0 24px ${config.color}40, inset 0 0 24px ${config.color}25`,
            }}
          />

          {/* Data packets traversing the ring */}
          {Array.from({ length: config.dots }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0"
              initial={{ rotate: (360 / config.dots) * i }}
              animate={{ rotate: (360 / config.dots) * i + (config.reverse ? -360 : 360) }}
              transition={{ duration: config.duration, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <div
                className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  backgroundColor: config.color,
                  boxShadow: `0 0 12px 3px ${config.color}`,
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function ParallaxOrbits({
  parallaxX,
  parallaxY,
}: {
  parallaxX: MotionValue<number>
  parallaxY: MotionValue<number>
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {RINGS.map((config, i) => (
        <Ring key={i} config={config} parallaxX={parallaxX} parallaxY={parallaxY} />
      ))}
    </div>
  )
}
