"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

type Shape = "star" | "shard" | "crosshair"
type Hue = "cyan" | "purple" | "white"

type Particle = {
  id: number
  x: number
  y: number
  size: number
  rotate: number
  spin: number
  driftX: number
  driftY: number
  shape: Shape
  hue: Hue
  duration: number
  pulse: boolean
}

// Cap concurrent DOM nodes to prevent layout/paint lag.
const MAX_PARTICLES = 72
// Minimum cursor travel (px) before a burst spawns. Small = dense trail.
const SPAWN_DISTANCE = 6

// Sharp 4-point star (sparkle) via clip-path.
const STAR_CLIP =
  "polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%)"
// Thin angular shard.
const SHARD_CLIP = "polygon(50% 0%, 65% 50%, 50% 100%, 35% 50%)"

const COLORS: Record<Hue, { core: string; glow: string }> = {
  cyan: {
    core: "#00f2fe",
    glow: "0 0 6px 1px rgba(0,242,254,0.9), 0 0 14px 3px rgba(0,242,254,0.55), 0 0 26px 6px rgba(0,242,254,0.25)",
  },
  purple: {
    core: "#8b5cf6",
    glow: "0 0 6px 1px rgba(139,92,246,0.9), 0 0 14px 3px rgba(139,92,246,0.55), 0 0 26px 6px rgba(139,92,246,0.25)",
  },
  white: {
    core: "#ffffff",
    glow: "0 0 6px 1px rgba(255,255,255,0.95), 0 0 14px 3px rgba(180,240,255,0.6), 0 0 26px 6px rgba(0,242,254,0.3)",
  },
}

const SHAPES: Shape[] = ["star", "shard", "crosshair"]

function pickHue(): Hue {
  const r = Math.random()
  // Bias toward cyan/purple, occasional hot-white core.
  if (r < 0.45) return "cyan"
  if (r < 0.85) return "purple"
  return "white"
}

function makeParticle(id: number, x: number, y: number): Particle {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
  const quick = Math.random() < 0.45
  return {
    id,
    // Scatter around the cursor so the trail reads as a thick cloud.
    x: x + (Math.random() - 0.5) * 30,
    y: y + (Math.random() - 0.5) * 30,
    size: shape === "shard" ? 6 + Math.random() * 10 : 7 + Math.random() * 9,
    rotate: Math.random() * 360,
    spin: (Math.random() - 0.5) * 220,
    driftX: (Math.random() - 0.5) * 50,
    // Gravity: mostly drift downward + a little outward.
    driftY: 18 + Math.random() * 46,
    shape,
    hue: pickHue(),
    duration: quick ? 0.3 + Math.random() * 0.15 : 0.6 + Math.random() * 0.25,
    pulse: !quick && Math.random() < 0.5,
  }
}

export function CyberTrail() {
  const [particles, setParticles] = useState<Particle[]>([])
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const idRef = useRef(0)

  const spawnBurst = useCallback((x: number, y: number) => {
    // 2-3 particles per movement tick for high density.
    const count = 2 + Math.floor(Math.random() * 2)
    const burst: Particle[] = []
    for (let i = 0; i < count; i++) {
      burst.push(makeParticle(idRef.current++, x, y))
    }
    setParticles((prev) => {
      const next = [...prev, ...burst]
      return next.length > MAX_PARTICLES
        ? next.slice(next.length - MAX_PARTICLES)
        : next
    })
  }, [])

  const remove = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id))
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const prev = lastPos.current
      if (!prev) {
        lastPos.current = { x: e.clientX, y: e.clientY }
        spawnBurst(e.clientX, e.clientY)
        return
      }
      const dist = Math.hypot(e.clientX - prev.x, e.clientY - prev.y)
      if (dist >= SPAWN_DISTANCE) {
        lastPos.current = { x: e.clientX, y: e.clientY }
        spawnBurst(e.clientX, e.clientY)
      }
    }
    window.addEventListener("mousemove", onMove, { passive: true })
    return () => window.removeEventListener("mousemove", onMove)
  }, [spawnBurst])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 mix-blend-screen"
    >
      <AnimatePresence>
        {particles.map((p) => {
          const c = COLORS[p.hue]
          const isCrosshair = p.shape === "crosshair"
          const clip =
            p.shape === "star"
              ? STAR_CLIP
              : p.shape === "shard"
                ? SHARD_CLIP
                : undefined

          return (
            <motion.span
              key={p.id}
              initial={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: p.rotate }}
              animate={{
                opacity: 0,
                scale: p.pulse ? [1.15, 0.2] : 0.15,
                x: p.driftX,
                y: p.driftY,
                rotate: p.rotate + p.spin,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: p.duration, ease: "easeOut" }}
              onAnimationComplete={() => remove(p.id)}
              className="absolute"
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                marginLeft: -p.size / 2,
                marginTop: -p.size / 2,
              }}
            >
              {isCrosshair ? (
                // Tiny cyber-crosshair: two thin glowing bars.
                <span
                  className="absolute inset-0"
                  style={{ filter: `drop-shadow(${c.glow.split(",")[0]})` }}
                >
                  <span
                    className="absolute left-1/2 top-0 h-full"
                    style={{
                      width: 1.5,
                      marginLeft: -0.75,
                      background: c.core,
                      boxShadow: c.glow,
                    }}
                  />
                  <span
                    className="absolute top-1/2 left-0 w-full"
                    style={{
                      height: 1.5,
                      marginTop: -0.75,
                      background: c.core,
                      boxShadow: c.glow,
                    }}
                  />
                </span>
              ) : (
                <span
                  className="absolute inset-0"
                  style={{
                    background: c.core,
                    clipPath: clip,
                    boxShadow: c.glow,
                  }}
                />
              )}
            </motion.span>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
