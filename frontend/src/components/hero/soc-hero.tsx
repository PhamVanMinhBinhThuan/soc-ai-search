"use client"

import type React from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { Shield, Sparkles } from "lucide-react"
import { StarField } from "./star-field"
import { AiCore } from "./ai-core"
import { ParallaxOrbits } from "./parallax-orbits"
import { CyberTrail } from "./cyber-trail"

export function SocHero({
  topRightContent,
  children,
}: {
  topRightContent?: React.ReactNode
  children?: React.ReactNode
}) {
  // Raw normalized cursor offset from center, in px-ish range.
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)

  // Smooth the motion so parallax feels weighty, not twitchy.
  const parallaxX = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.6 })
  const parallaxY = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.6 })

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const { innerWidth, innerHeight } = window
    // Range roughly -1 .. 1 scaled to a useful pixel travel.
    rawX.set(((e.clientX - innerWidth / 2) / innerWidth) * 60)
    rawY.set(((e.clientY - innerHeight / 2) / innerHeight) * 60)
  }

  const handleMouseLeave = () => {
    rawX.set(0)
    rawY.set(0)
  }

  return (
    <main
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen overflow-hidden bg-[#030712] text-zinc-100 selection:bg-cyan-500/30"
    >
      {/* Vignette to deepen the edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(3,7,18,0.85) 100%)",
        }}
      />

      {/* Layered space scene */}
      <StarField parallaxX={parallaxX} parallaxY={parallaxY} />
      <AiCore parallaxX={parallaxX} parallaxY={parallaxY} />
      <ParallaxOrbits parallaxX={parallaxX} parallaxY={parallaxY} />

      {/* Cyber particle cursor trail (pointer-events-none, never blocks clicks) */}
      <CyberTrail />

      {/* Top navigation */}
      <header className="relative z-30 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10">
            <Shield className="h-5 w-5 text-cyan-300" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            SOC <span className="text-cyan-300">AI</span> Search
          </span>
        </div>

        {topRightContent}
      </header>

      {/* Hero content overlaid on the core */}
      <section className="relative z-20 mx-auto flex min-h-[calc(100vh-92px)] max-w-4xl flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-400/10 px-4 py-1.5 text-xs font-medium text-purple-200"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Zero-Trust Security Intelligence
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
          style={{ textShadow: "0 2px 40px rgba(3,7,18,0.9)" }}
        >
          Intelligent Event Search
          <br />
          for{" "}
          <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Modern SOC Teams.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-zinc-300 sm:text-lg"
          style={{ textShadow: "0 2px 20px rgba(3,7,18,0.9)" }}
        >
          Scale your security operations. AI-powered log analysis, real-time
          aggregations, and zero-trust RBAC in one unified platform.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="mt-10 w-full max-w-2xl"
        >
          {children}
        </motion.div>
      </section>
    </main>
  )
}
