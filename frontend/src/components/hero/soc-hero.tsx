"use client"

import type React from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { ArrowRight, KeyRound, Shield } from "lucide-react"
import { StarField } from "./star-field"
import { AiCore } from "./ai-core"
import { ParallaxOrbits } from "./parallax-orbits"
import { CyberTrail } from "./cyber-trail"

export function SocHero({
  topRightContent,
  children,
  statusContent,
  onAccessConsole,
}: {
  topRightContent?: React.ReactNode
  children?: React.ReactNode
  statusContent?: React.ReactNode
  onAccessConsole?: () => void
}) {
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const parallaxX = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.6 })
  const parallaxY = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.6 })
  const hasCustomTopRight = topRightContent !== undefined

  const handleLogin = onAccessConsole ?? (() => undefined)

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const { innerWidth, innerHeight } = window
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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(3,7,18,0.85) 100%)",
        }}
      />

      <StarField parallaxX={parallaxX} parallaxY={parallaxY} />
      <AiCore parallaxX={parallaxX} parallaxY={parallaxY} />
      <ParallaxOrbits parallaxX={parallaxX} parallaxY={parallaxY} />
      <CyberTrail />

      <header className="relative z-30 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10">
            <Shield className="h-5 w-5 text-cyan-300" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            SOC <span className="text-cyan-300">AI</span> Search
          </span>
        </div>

        {hasCustomTopRight ? (
          topRightContent
        ) : (
          <button
            type="button"
            onClick={handleLogin}
            className="group inline-flex items-center gap-2 rounded-lg border border-zinc-700/80 bg-transparent px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-cyan-400/60 hover:bg-cyan-400/10 hover:text-white"
          >
            <KeyRound className="h-4 w-4 text-cyan-300" />
            Sign In
          </button>
        )}
      </header>

      <section className="relative z-20 mx-auto flex min-h-[calc(100vh-92px)] max-w-4xl flex-col items-center justify-center px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl"
          style={{ textShadow: "0 2px 40px rgba(3,7,18,0.9)" }}
        >
          AI-Powered Event Search for{" "}
          <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Security Teams.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-zinc-300 sm:text-lg"
          style={{ textShadow: "0 2px 20px rgba(3,7,18,0.9)" }}
        >
          Search events using natural language. Fast, intelligent, and secure.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className={children ? "mt-10 w-full max-w-2xl" : "mt-10 flex flex-col items-center gap-4 sm:flex-row"}
        >
          {children ?? (
            <>
              <button
                id="keycloak-signin-btn"
                type="button"
                onClick={handleLogin}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold text-[#030712]"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-cyan-300 via-white to-purple-300 bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite]" />
                <span className="relative flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Access Console
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            </>
          )}
        </motion.div>

        {statusContent ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
            className="relative z-20 mt-6 w-full max-w-xl"
          >
            {statusContent}
          </motion.div>
        ) : null}
      </section>
    </main>
  )
}
