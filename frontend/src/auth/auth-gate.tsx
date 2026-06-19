// src/auth/auth-gate.tsx
import { Activity, ShieldHalf, LogIn } from 'lucide-react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
  type MotionValue,
} from 'framer-motion';
import { useState, useEffect, useCallback, type ReactNode } from 'react';

import { useSocAuth, type SocAuthState } from '@/auth/auth-context';

/* ─── Global CSS (injected once) ─────────────────────────────────────── */
const GLOBAL_CSS = `
  @keyframes shimmerBeam { 0% { transform: translateX(-130%) skewX(-18deg); } 100% { transform: translateX(250%) skewX(-18deg); } }
  @keyframes rotateBorder { from { --border-rot: 0deg; } to { --border-rot: 360deg; } }
  @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 8px var(--glow-color); } 50% { box-shadow: 0 0 20px var(--glow-color); } }
  @property --border-rot { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
  .shimmer-btn::before { content:''; position:absolute; top:0; left:0; width:35%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent); animation:shimmerBeam 2.8s ease-in-out infinite; border-radius:inherit; }
  .spinning-border { background: conic-gradient(from var(--border-rot),rgba(6,182,212,0.8) 0deg,rgba(139,92,246,0.6) 90deg,rgba(6,182,212,0.1) 180deg,rgba(6,182,212,0.8) 360deg); animation: rotateBorder 4s linear infinite; }
  .heartbeat-dot { animation: pulseGlow 2s ease-in-out infinite; }
  .particle { position:absolute; pointer-events:none; mix-blend-mode:screen; }
  .shape-star { clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
  .shape-shard { clip-path: polygon(0% 0%, 100% 0%, 80% 100%, 20% 100%); }
  .shape-cross { clip-path: polygon(45% 0%,55% 0%,55% 45%,100% 45%,100% 55%,55% 55%,55% 100%,45% 100%,45% 55%,0% 55%,0% 45%,45% 45%); }
`;

/* ─── Animation Variants ─────────────────────────────────────── */
const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const fadeIn: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } } };
const slideDown: Variants = { hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22,1,0.36,1] } } };
const slideUp: Variants = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22,1,0.36,1] } } };

/* ─── Background – Grid + Spotlights ─────────────────────────────── */
function CyberBackground() {
  const mouseX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const mouseY = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 2 : 0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });
  const radial = useTransform([springX, springY], ([x, y]) =>
    `radial-gradient(600px circle at ${x}px ${y}px, rgba(6,182,212,0.14) 0%, rgba(139,92,246,0.07) 35%, transparent 65%)`
  );
  return (
    <motion.div className="absolute inset-0" onMouseMove={e => { mouseX.set(e.clientX); mouseY.set(e.clientY); }} style={{ pointerEvents: 'none', zIndex: 0 }}>
      <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(rgba(6,182,212,0.065) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.065) 1px, transparent 1px)`, backgroundSize: '44px 44px' }} />
      <motion.div className="absolute inset-0" style={{ background: radial }} />
    </motion.div>
  );
}

/* ─── Orb (AI Core) ─────────────────────────────────────────────── */
function AICore() {
  return (
    <motion.div
      className="relative size-72 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500/70 opacity-80 blur-3xl"
      animate={{ scale: [1, 1.07, 1], rotate: [0, 15, -15, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: '0 0 60px 30px rgba(6,182,212,0.4)' }}
        animate={{ opacity: [0.6, 0.3, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

/* ─── Orbital Rings ─────────────────────────────────────────────── */
function OrbitalRings({ mouseX, mouseY }: { mouseX: MotionValue<number>; mouseY: MotionValue<number> }) {
  const offsetX = useTransform<number, number>(mouseX, v => -(v - window.innerWidth / 2) * 0.02);
  const offsetY = useTransform<number, number>(mouseY, v => -(v - window.innerHeight / 2) * 0.02);
  return (
    <motion.div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
      <motion.div
        className="absolute rounded-full border border-cyan-400/30"
        style={{ width: 380, height: 380, top: 'calc(50% - 190px)', left: 'calc(50% - 190px)', x: offsetX, y: offsetY, rotate: 45 }}
      />
      <motion.div
        className="absolute rounded-full border border-violet-400/30"
        style={{ width: 540, height: 540, top: 'calc(50% - 270px)', left: 'calc(50% - 270px)', x: offsetX, y: offsetY, rotate: -30 }}
      />
    </motion.div>
  );
}

/* ─── Mouse Trail (High‑Density Cyber Sparks) ───────────────────── */
interface Particle { id: string; x: number; y: number; shape: string; color: string; size: number; lifespan: number }
function MouseTrail() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const max = 70;
  const spawn = useCallback((e: MouseEvent) => {
    const shapes = ['shape-star', 'shape-shard', 'shape-cross'];
    const colors = ['#00f2fe', '#8b5cf6', '#ffffff'];
    const rect = document.body.getBoundingClientRect();
    const baseX = e.clientX - rect.left;
    const baseY = e.clientY - rect.top;
    const newParts: Particle[] = [];
    for (let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * 30;
      const offsetY = (Math.random() - 0.5) * 30;
      newParts.push({
        id: `${Date.now()}-${Math.random()}`,
        x: baseX + offsetX,
        y: baseY + offsetY,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 4,
        lifespan: Math.random() * 500 + 300,
      });
    }
    setParticles(p => {
      const combined = [...newParts, ...p];
      return combined.slice(0, max);
    });
  }, []);
  useEffect(() => {
    window.addEventListener('mousemove', spawn);
    return () => window.removeEventListener('mousemove', spawn);
  }, [spawn]);
  return (
    <AnimatePresence>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className={`particle ${p.shape}`}
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            background: p.color,
            '--glow-color': p.color,
          } as React.CSSProperties}
          initial={{ opacity: 1, scale: 1, y: 0, x: 0 }}
          animate={{ opacity: 0, scale: 0, y: 20, rotate: 180, transition: { duration: p.lifespan / 1000 } }}
          exit={{ opacity: 0 }}
        />
      ))}
    </AnimatePresence>
  );
}

/* ─── Top Navigation ─────────────────────────────────────────────── */
function TopNav({ auth }: { auth: SocAuthState }) {
  return (
    <nav className="absolute top-4 left-0 right-0 flex items-center justify-between px-6 py-2">
      <div className="flex items-center gap-2">
        <ShieldHalf className="size-5 text-cyan-300" />
        <span className="text-sm font-semibold text-white">SOC AI Search</span>
      </div>
      <button onClick={auth.signIn} className="shimmer-btn rounded-full bg-transparent border border-cyan-400/30 px-4 py-1.5 text-sm text-cyan-300 hover:bg-cyan-400/10">
        Secure Login
      </button>
    </nav>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────── */
function Footer() {
  return (
    <motion.div variants={fadeIn} className="absolute bottom-5 left-0 right-0 flex flex-col items-center gap-1">
      <p className="text-[11px] text-zinc-700">End-to-End Encrypted · SOC Environment MVP v1.0</p>
      <p className="flex items-center gap-1.5 text-[11px] text-zinc-600">
        <span className="heartbeat-dot inline-block size-1.5 rounded-full bg-emerald-400" />
        Protected by Caddy &amp; Keycloak
      </p>
    </motion.div>
  );
}

function LandingView({ auth }: { auth: SocAuthState }) {
  const mouseX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const mouseY = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 2 : 0);

  return (
    <div className="dark relative flex min-h-svh items-center justify-center overflow-hidden bg-zinc-950 px-4 text-foreground" onMouseMove={e => { mouseX.set(e.clientX); mouseY.set(e.clientY); }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <CyberBackground />
      <TopNav auth={auth} />
      <MouseTrail />
      <div className="relative z-10 flex flex-col items-center gap-8">
        <OrbitalRings mouseX={mouseX} mouseY={mouseY} />
        <AICore />
        <motion.div className="flex flex-col items-center gap-4 text-center" initial="hidden" animate="visible" variants={containerVariants}>
          <motion.h1 variants={slideDown} className="bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl lg:text-6xl">
            Intelligent Event Search<br />for Modern SOC Teams
          </motion.h1>
          <motion.p variants={fadeIn} className="max-w-xl text-base text-zinc-300">
            Scale your security operations. AI‑powered log analysis, real‑time aggregations, and zero‑trust RBAC in one unified platform.
          </motion.p>
          <motion.div variants={slideUp} className="flex flex-col gap-3">
            <motion.button
              id="keycloak-signin-btn"
              onClick={auth.signIn}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              className="shimmer-btn relative flex w-60 items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 font-bold text-white transition-colors duration-200 hover:from-cyan-400 hover:to-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              <LogIn className="size-4" /> Access Console
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, opacity: 0.9 }}
              className="text-sm text-zinc-400 underline"
            >
              Explore Features
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}

/* ─── Loading View (unchanged) ───────────────────────────────────── */
function LoadingView() {
  return (
    <div className="dark relative flex min-h-svh items-center justify-center overflow-hidden bg-zinc-950 px-4 text-foreground">
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <CyberBackground />
      <motion.div className="flex flex-col items-center gap-4 py-2 text-center" initial="hidden" animate="visible" variants={containerVariants}>
        <motion.div variants={slideDown} className="flex size-14 items-center justify-center rounded-2xl bg-cyan-400/10 ring-1 ring-cyan-400/25">
          <Activity className="size-7 animate-spin text-cyan-300" />
        </motion.div>
        <motion.div variants={fadeIn}>
          <p className="text-base font-bold tracking-tight text-white">Restoring Secure Session</p>
          <p className="mt-1 text-xs text-zinc-500">Verifying Keycloak credentials…</p>
        </motion.div>
        <motion.div variants={fadeIn} className="relative h-0.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className="shimmer-btn absolute inset-0" />
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ─── Auth Gate ────────────────────────────────────────────────────── */
export function AuthGateView({ auth, children }: { auth: SocAuthState; children: ReactNode }) {
  if (!auth.enabled) return children;
  if (auth.loading) return <LoadingView />;
  if (!auth.authenticated) return <LandingView auth={auth} />;
  return children;
}
export function AuthGate({ children }: { children: ReactNode }) {
  return (
    <AuthGateView auth={useSocAuth()}>{children}</AuthGateView>
  );
}
