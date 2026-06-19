import {
  Activity,
  AlertCircle,
  BarChart3,
  BrainCircuit,
  Loader2,
  LogIn,
  ShieldCheck,
  ShieldHalf,
} from 'lucide-react'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion'
import { useRef, type ReactNode } from 'react'

import { useSocAuth, type SocAuthState } from '@/auth/auth-context'

/* ─── css injected once ───────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @keyframes shimmerBeam {
    0%   { transform: translateX(-130%) skewX(-18deg); }
    100% { transform: translateX(250%)  skewX(-18deg); }
  }
  @keyframes rotateBorder {
    from { --border-rot: 0deg; }
    to   { --border-rot: 360deg; }
  }
  @keyframes heartbeat {
    0%,100% { opacity:1; transform:scale(1); }
    50%     { opacity:0.3; transform:scale(0.7); }
  }
  @property --border-rot {
    syntax: '<angle>';
    inherits: false;
    initial-value: 0deg;
  }
  .shimmer-btn::before {
    content:'';
    position:absolute; top:0; left:0;
    width:35%; height:100%;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent);
    animation:shimmerBeam 2.8s ease-in-out infinite;
    border-radius:inherit;
  }
  .spinning-border {
    background: conic-gradient(
      from var(--border-rot),
      rgba(6,182,212,0.8) 0deg,
      rgba(139,92,246,0.6) 90deg,
      rgba(6,182,212,0.1) 180deg,
      rgba(6,182,212,0.8) 360deg
    );
    animation: rotateBorder 4s linear infinite;
  }
  .heartbeat-dot { animation: heartbeat 2s ease-in-out infinite; }
`

/* ─── animation variants ─────────────────────────────────────────────────── */
const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}
const slideDown: Variants = {
  hidden:  { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}
const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
}
const popIn: Variants = {
  hidden:  { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 20 } },
}
const slideUp: Variants = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

/* ─── cyber-grid background ─────────────────────────────────────────────── */
function CyberBackground() {
  const mouseX = useMotionValue(
    typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
  )
  const mouseY = useMotionValue(
    typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  )
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 })

  const background = useTransform(
    [springX, springY],
    ([x, y]: number[]) =>
      `radial-gradient(600px circle at ${x}px ${y}px,
        rgba(6,182,212,0.14) 0%,
        rgba(139,92,246,0.07) 35%,
        transparent 65%)`,
  )

  return (
    <motion.div
      className="absolute inset-0"
      onMouseMove={(e) => {
        mouseX.set(e.clientX)
        mouseY.set(e.clientY)
      }}
      style={{ pointerEvents: 'none', zIndex: 0 }}
    >
      {/* Static grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6,182,212,0.065) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,0.065) 1px, transparent 1px)
          `,
          backgroundSize: '44px 44px',
        }}
      />
      {/* Mouse spotlight */}
      <motion.div className="absolute inset-0" style={{ background }} />
      {/* Ambient glows */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 55% 40% at 50% 50%, rgba(6,182,212,0.07) 0%, transparent 70%),
            radial-gradient(ellipse 40% 35% at 70% 30%, rgba(139,92,246,0.06) 0%, transparent 70%)
          `,
        }}
      />
    </motion.div>
  )
}

/* ─── scan-line decorators ───────────────────────────────────────────────── */
function ScanDecorators() {
  return (
    <>
      <motion.div
        className="absolute right-14 top-16 h-px w-20 rounded-full bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
        animate={{ opacity: [0, 0.7, 0], y: [0, 8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      <motion.div
        className="absolute bottom-28 left-10 h-px w-14 rounded-full bg-gradient-to-r from-transparent via-violet-400/50 to-transparent"
        animate={{ opacity: [0, 0.6, 0], y: [0, 6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute left-8 top-10 size-1.5 rounded-full bg-cyan-400/70"
        animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0.2, 0.7] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-14 right-12 size-1 rounded-full bg-violet-400/60"
        animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0.1, 0.6] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        className="absolute right-28 top-1/3 size-0.5 rounded-full bg-cyan-300/40"
        animate={{ opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, delay: 0.8 }}
      />
    </>
  )
}

/* ─── 3D tilt + spinning border card ────────────────────────────────────── */
function GlassCard({ children }: { children: ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null)

  const rotateX = useSpring(useMotionValue(0), { stiffness: 200, damping: 25 })
  const rotateY = useSpring(useMotionValue(0), { stiffness: 200, damping: 25 })
  const glowOpacity = useSpring(useMotionValue(0.15), { stiffness: 150, damping: 20 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    rotateX.set(((e.clientY - cy) / (rect.height / 2)) * -6)
    rotateY.set(((e.clientX - cx) / (rect.width / 2)) * 6)
    glowOpacity.set(0.45)
  }

  const handleMouseLeave = () => {
    rotateX.set(0)
    rotateY.set(0)
    glowOpacity.set(0.15)
  }

  const borderOpacity = useTransform(glowOpacity, [0.15, 0.45], [0.4, 1])

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      className="relative z-10 w-full max-w-sm"
    >
      {/* Spinning gradient border */}
      <motion.div
        className="spinning-border absolute -inset-[1.5px] rounded-3xl"
        style={{ opacity: borderOpacity }}
      />
      {/* Card surface */}
      <motion.div
        className="relative rounded-3xl bg-zinc-950/85 p-8 backdrop-blur-2xl"
        style={{
          boxShadow: useTransform(
            glowOpacity,
            [0.15, 0.45],
            [
              '0 0 20px -8px rgba(6,182,212,0.15), 0 24px 48px -12px rgba(0,0,0,0.85)',
              '0 0 55px -6px rgba(6,182,212,0.35), 0 24px 48px -12px rgba(0,0,0,0.9)',
            ],
          ),
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

/* ─── feature pill ───────────────────────────────────────────────────────── */
type PillColor = 'cyan' | 'violet' | 'emerald' | 'zinc'
const pillBase: Record<PillColor, string> = {
  cyan:    'border-cyan-500/25 bg-cyan-500/8 text-cyan-400 hover:border-cyan-400/80 hover:bg-cyan-400/18 hover:text-cyan-200',
  violet:  'border-violet-500/25 bg-violet-500/8 text-violet-400 hover:border-violet-400/80 hover:bg-violet-400/18 hover:text-violet-200',
  emerald: 'border-emerald-500/25 bg-emerald-500/8 text-emerald-400 hover:border-emerald-400/80 hover:bg-emerald-400/18 hover:text-emerald-200',
  zinc:    'border-zinc-600/40 bg-zinc-800/50 text-zinc-500 hover:border-zinc-500/60 hover:text-zinc-300',
}

function Pill({ icon: Icon, label, color }: {
  icon: React.FC<{ className?: string }>
  label: string
  color: PillColor
}) {
  return (
    <motion.span
      variants={popIn}
      whileHover={{ y: -3, scale: 1.06 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      className={`inline-flex cursor-default select-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-200 ${pillBase[color]}`}
    >
      <Icon className="size-3" />
      {label}
    </motion.span>
  )
}

/* ─── footer ─────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <motion.div
      variants={fadeIn}
      className="absolute bottom-5 left-0 right-0 flex flex-col items-center gap-1"
    >
      <p className="text-[11px] text-zinc-700">
        End-to-End Encrypted · SOC Environment MVP v1.0
      </p>
      <p className="flex items-center gap-1.5 text-[11px] text-zinc-600">
        <span className="heartbeat-dot inline-block size-1.5 rounded-full bg-emerald-400" />
        Protected by Caddy &amp; Keycloak
      </p>
    </motion.div>
  )
}

/* ─── loading state ──────────────────────────────────────────────────────── */
function LoadingView() {
  return (
    <div className="dark relative flex min-h-svh items-center justify-center overflow-hidden bg-zinc-950 px-4 text-foreground">
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <CyberBackground />
      <ScanDecorators />

      <GlassCard>
        <motion.div
          className="flex flex-col items-center gap-4 py-2 text-center"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div
            variants={slideDown}
            className="flex size-14 items-center justify-center rounded-2xl bg-cyan-400/10 ring-1 ring-cyan-400/25"
          >
            <Loader2 className="size-7 animate-spin text-cyan-300" />
          </motion.div>
          <motion.div variants={fadeIn}>
            <p className="text-base font-bold tracking-tight text-white">
              Restoring Secure Session
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Verifying Keycloak credentials…
            </p>
          </motion.div>
          <motion.div
            variants={fadeIn}
            className="relative h-0.5 w-full overflow-hidden rounded-full bg-zinc-800"
          >
            <div className="shimmer-btn absolute inset-0" />
          </motion.div>
        </motion.div>
      </GlassCard>

      <motion.div
        className="absolute bottom-5 left-0 right-0 flex flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <p className="text-[11px] text-zinc-700">
          End-to-End Encrypted · SOC Environment MVP v1.0
        </p>
      </motion.div>
    </div>
  )
}

/* ─── login landing view ─────────────────────────────────────────────────── */
function LoginView({ auth }: { auth: SocAuthState }) {
  return (
    <div className="dark relative flex min-h-svh items-center justify-center overflow-hidden bg-zinc-950 px-4 text-foreground">
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <CyberBackground />
      <ScanDecorators />

      <GlassCard>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* ── Header ── */}
          <motion.div variants={slideDown} className="mb-5 flex items-center gap-3.5">
            <motion.div
              whileHover={{ scale: 1.12 }}
              transition={{ type: 'spring', stiffness: 350, damping: 18 }}
              className="shrink-0 flex size-12 items-center justify-center rounded-2xl bg-cyan-400/10 ring-1 ring-cyan-400/25"
              style={{
                filter: 'drop-shadow(0 0 0px rgba(6,182,212,0))',
              }}
              whileFocus={{ filter: 'drop-shadow(0 0 14px rgba(6,182,212,0.9))' }}
            >
              <motion.div
                whileHover={{ filter: 'drop-shadow(0 0 12px rgba(6,182,212,0.9))' }}
                transition={{ duration: 0.2 }}
              >
                <ShieldHalf className="size-6 text-cyan-300" />
              </motion.div>
            </motion.div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                SOC AI Search
              </h1>
              <p className="mt-0.5 bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400 bg-clip-text text-[10px] font-semibold tracking-widest text-transparent uppercase">
                Next-Generation Security Operations
              </p>
            </div>
          </motion.div>

          {/* Separator */}
          <motion.div
            variants={fadeIn}
            className="mb-5 h-px w-full bg-gradient-to-r from-transparent via-zinc-700/70 to-transparent"
          />

          {/* ── Description (concise) ── */}
          <motion.p
            variants={fadeIn}
            className="mb-6 text-[13px] leading-relaxed text-zinc-500"
          >
            Authenticate via Keycloak to enter the AI-powered SOC console.
          </motion.p>

          {/* ── Feature pills ── */}
          <motion.div
            variants={containerVariants}
            className="mb-8 flex flex-wrap gap-1.5"
          >
            <Pill icon={BrainCircuit} label="Natural Language" color="cyan"    />
            <Pill icon={BarChart3}    label="Live Aggregation" color="violet"  />
            <Pill icon={ShieldCheck}  label="Zero-Trust RBAC"  color="emerald" />
            <Pill icon={Activity}     label="Elasticsearch"     color="zinc"    />
          </motion.div>

          {/* ── Error ── */}
          {auth.errorMessage ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/8 p-3 text-[13px] text-rose-300"
            >
              <AlertCircle className="mt-px size-4 shrink-0" />
              <span className="leading-snug">{auth.errorMessage}</span>
            </motion.div>
          ) : null}

          {/* ── CTA button ── */}
          <motion.div variants={slideUp}>
            <motion.button
              id="keycloak-signin-btn"
              type="button"
              onClick={auth.signIn}
              whileHover={{
                scale: 1.025,
                boxShadow: '0 0 30px rgba(6,182,212,0.6), 0 0 60px rgba(6,182,212,0.25)',
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              className="shimmer-btn relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 text-sm font-bold text-white transition-colors duration-200 hover:from-cyan-400 hover:to-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              <LogIn className="size-4" />
              Sign in with Keycloak
            </motion.button>
            <p className="mt-2.5 text-center text-[11px] text-zinc-600">
              Redirects to your organisation's Keycloak instance
            </p>
          </motion.div>
        </motion.div>
      </GlassCard>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <Footer />
      </motion.div>
    </div>
  )
}

/* ─── exported gate ──────────────────────────────────────────────────────── */
export function AuthGateView({
  auth,
  children,
}: {
  auth: SocAuthState
  children: ReactNode
}) {
  if (!auth.enabled) return children
  if (auth.loading) return <LoadingView />
  if (!auth.authenticated) return <LoginView auth={auth} />
  return children
}

export function AuthGate({ children }: { children: ReactNode }) {
  return (
    <AuthGateView auth={useSocAuth()}>
      {children}
    </AuthGateView>
  )
}
