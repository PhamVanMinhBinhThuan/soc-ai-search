// src/auth/auth-gate.tsx
import { Activity, AlertCircle, LogIn, ShieldHalf } from 'lucide-react';
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
  @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 8px var(--glow-color); } 50% { box-shadow: 0 0 20px var(--glow-color); } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes iconPulse { 0%,100% { box-shadow: 0 0 0 rgba(6,182,212,0); } 50% { box-shadow: 0 0 20px rgba(6,182,212,0.4); } }
  @keyframes scanPulse { 0% { opacity: 0; transform: translateX(0) scaleX(0.98); } 30% { opacity: 0.55; } 60% { opacity: 0.18; } 100% { opacity: 0; transform: translateX(24px) scaleX(1.02); } }
  .animate-fadeInUp { animation: fadeInUp 0.4s ease-out both; }
  .shimmer-btn::before { content:''; position:absolute; top:0; left:0; width:35%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent); animation:shimmerBeam 2.8s ease-in-out infinite; border-radius:inherit; }
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
function CyberBackground({ mouseX, mouseY }: { mouseX: MotionValue<number>; mouseY: MotionValue<number> }) {
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });
  const radial = useTransform([springX, springY], ([x, y]) =>
    `radial-gradient(600px circle at ${x}px ${y}px, rgba(6,182,212,0.14) 0%, rgba(139,92,246,0.07) 35%, transparent 65%)`
  );
  return (
    <motion.div className="absolute inset-0" style={{ pointerEvents: 'none', zIndex: 0 }}>
      <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(rgba(6,182,212,0.065) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.065) 1px, transparent 1px)`, backgroundSize: '44px 44px' }} />
      <motion.div className="absolute inset-0" style={{ background: radial }} />
      <div className="absolute right-8 top-10 h-24 w-24 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute left-12 bottom-16 h-28 w-28 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="absolute right-8 top-8 h-0.5 w-24 rounded-full bg-cyan-300/50" style={{ animation: 'scanPulse 3s ease-in-out infinite' }} />
      <div className="absolute bottom-10 left-8 h-0.5 w-28 rounded-full bg-violet-300/40" style={{ animation: 'scanPulse 3s ease-in-out infinite 1.4s' }} />
    </motion.div>
  );
}

/* ─── Orb (AI Core) ─────────────────────────────────────────────── */
function AICore() {
  return (
    <motion.div className="relative flex size-80 items-center justify-center" animate={{ scale: [1, 1.03, 1], rotate: [0, 6, -6, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}>
      <motion.div
        className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(34,211,238,0.36),rgba(34,211,238,0.06)_38%,transparent_68%),radial-gradient(circle_at_65%_70%,rgba(168,85,247,0.34),rgba(168,85,247,0.06)_40%,transparent_70%)] blur-3xl"
        animate={{ opacity: [0.72, 0.48, 0.72] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-16 rounded-full border border-cyan-400/20 bg-cyan-300/5 blur-2xl"
        animate={{ opacity: [0.45, 0.2, 0.45] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-24 rounded-full border border-white/8 bg-white/5 backdrop-blur-3xl" />
      <div className="absolute inset-32 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.22),rgba(255,255,255,0.02)_65%,transparent_72%)] blur-xl" />
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
        style={{ width: 380, height: 380, top: 'calc(50% - 190px)', left: 'calc(50% - 190px)', x: offsetX, y: offsetY }}
        animate={{ rotate: [45, 405] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute left-1/2 top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.95)]" />
      </motion.div>
      <motion.div
        className="absolute rounded-full border border-violet-400/30"
        style={{ width: 540, height: 540, top: 'calc(50% - 270px)', left: 'calc(50% - 270px)', x: offsetX, y: offsetY }}
        animate={{ rotate: [-30, 330] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute left-1/2 top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-300 shadow-[0_0_18px_rgba(168,85,247,0.95)]" />
      </motion.div>
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
    <nav className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-6 py-2 md:px-8">
      <div className="flex items-center gap-2">
        <ShieldHalf className="size-5 text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]" />
        <span className="text-sm font-semibold tracking-wide text-white">SOC AI Search</span>
      </div>
      <button onClick={auth.signIn} className="shimmer-btn rounded-full border border-cyan-400/30 bg-transparent px-4 py-1.5 text-sm text-cyan-300 transition-all duration-200 hover:bg-cyan-400/10 hover:text-cyan-200 hover:shadow-[0_0_20px_rgba(34,211,238,0.25)]">
        Sign in with Keycloak
      </button>
    </nav>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────── */
function Footer() {
  return (
    <motion.div variants={fadeIn} className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1">
      <p className="text-[11px] text-zinc-600">End-to-End Encrypted Connection · SOC Environment MVP v1.0</p>
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
    <div className="dark relative flex min-h-svh items-center justify-center overflow-hidden bg-[#030712] px-4 text-foreground" onMouseMove={e => { mouseX.set(e.clientX); mouseY.set(e.clientY); }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <CyberBackground mouseX={mouseX} mouseY={mouseY} />
      <TopNav auth={auth} />
      <MouseTrail />
      <div className="relative z-10 flex flex-col items-center gap-8 px-2 pt-20 text-center md:pt-0">
        <OrbitalRings mouseX={mouseX} mouseY={mouseY} />
        <AICore />
        <motion.div className="relative z-10 flex max-w-4xl flex-col items-center gap-4 text-center" initial="hidden" animate="visible" variants={containerVariants}>
          <motion.h1 variants={slideDown} className="bg-linear-to-r from-cyan-300 via-sky-200 to-violet-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent drop-shadow-[0_0_24px_rgba(34,211,238,0.12)] md:text-5xl lg:text-6xl">
            Intelligent Event Search<br />for Modern SOC Teams.
          </motion.h1>
          <motion.p variants={fadeIn} className="max-w-2xl text-base leading-relaxed text-zinc-300 md:text-lg">
            Scale your security operations. AI-powered log analysis, real-time aggregations, and zero-trust RBAC in one unified platform.
          </motion.p>
          <motion.div variants={slideUp} className="flex flex-col gap-3">
            <motion.button
              id="keycloak-signin-btn"
              onClick={auth.signIn}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              className="shimmer-btn relative flex w-72 items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 py-3 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.02] hover:from-cyan-400 hover:to-blue-500 hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              <LogIn className="size-4" /> Authenticate via Keycloak
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, opacity: 0.9 }}
              className="text-sm text-zinc-400 underline decoration-dotted decoration-zinc-600 underline-offset-4 transition-all duration-200 hover:text-zinc-200"
            >
              Explore Features
            </motion.button>
          </motion.div>

          {auth.errorMessage ? (
            <motion.div
              variants={fadeIn}
              className="mt-2 flex max-w-xl items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-left text-sm text-rose-300"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{auth.errorMessage}</span>
            </motion.div>
          ) : null}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}

/* ─── Loading View (unchanged) ───────────────────────────────────── */
function LoadingView() {
  const loadingMouseX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const loadingMouseY = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 2 : 0);

  return (
    <div className="dark relative flex min-h-svh items-center justify-center overflow-hidden bg-[#030712] px-4 text-foreground">
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <CyberBackground mouseX={loadingMouseX} mouseY={loadingMouseY} />
      <motion.div className="animate-fadeInUp flex flex-col items-center gap-4 py-2 text-center" initial="hidden" animate="visible" variants={containerVariants}>
        <motion.div variants={slideDown} className="flex size-14 items-center justify-center rounded-2xl bg-cyan-400/10 ring-1 ring-cyan-400/25" style={{ animation: 'iconPulse 2.5s ease-in-out infinite' }}>
          <Activity className="size-7 animate-spin text-cyan-300" />
        </motion.div>
        <motion.div variants={fadeIn}>
          <p className="text-base font-bold tracking-tight text-white">Restoring Secure Session</p>
          <p className="mt-1 text-xs text-zinc-400">Verifying your Keycloak credentials...</p>
        </motion.div>
        <motion.div variants={fadeIn} className="relative h-0.5 w-full overflow-hidden rounded-full bg-zinc-800/90">
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
