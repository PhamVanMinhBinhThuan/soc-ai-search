# Prompt: Landing Page / Auth Gateway cho SOC AI Search

## Context

The file to modify is `frontend/src/auth/auth-gate.tsx`. It contains an `AuthGateView` component with 3 states:
1. `auth.loading` → Shows a loading spinner
2. `!auth.authenticated` → Shows the **login card** (the main landing page — this is what needs the most redesign)
3. Authenticated → renders `children` (the main dashboard, untouched)

**Do NOT modify** `App.tsx`, the dashboard layout, or any other component. Only refactor the JSX inside `auth-gate.tsx`.

The `auth.signIn()` callback triggers Keycloak OIDC redirect. `auth.errorMessage` holds any auth error string.

---

## Tech Stack

React, TypeScript, Tailwind CSS v3, shadcn/ui, lucide-react. No external animation libraries. Use pure CSS `@keyframes` via `style` prop or a `<style>` tag injected via a `useEffect`-free approach (inline `<style>` in JSX is acceptable for this component).

---

## Visual Requirements

### 1. Full-screen Background

- `bg-zinc-950` as the base dark background.
- Implement a **cyber-grid pattern** using a CSS `background-image` with SVG or linear-gradient lines — subtle 1px grid lines in `rgba(6, 182, 212, 0.07)` (cyan, very low opacity). Grid cell size: `~40px x 40px`.
- Layer **two radial gradient glows** on top of the grid:
  - A **large cyan glow** (`radial-gradient(ellipse 70% 50% at 50% 50%, rgba(6,182,212,0.12) 0%, transparent 70%)`)
  - A **purple glow** offset slightly (`radial-gradient(ellipse 50% 40% at 60% 40%, rgba(139,92,246,0.08) 0%, transparent 70%)`)
- Add **2-3 small animated "scan line" or "particle dot" elements** as absolutely-positioned decorative divs with a slow `pulse` or `ping` CSS animation to give a sense of live system activity. These should be very subtle (opacity 0.3–0.5), colored cyan or violet.

### 2. Center Authentication Card

- Max width: `max-w-md` (448px), centered with `flex items-center justify-center min-h-svh`.
- Card style: **glassmorphism** — `bg-zinc-900/70 backdrop-blur-xl border border-zinc-700/60 rounded-3xl shadow-2xl`.
- Add an outer **glow ring** effect on the card: `shadow-[0_0_60px_-10px_rgba(6,182,212,0.25)]`.
- Card padding: `p-8` or `p-10`.

### 3. Branding Header (inside card)

- **Icon block:** A `ShieldHalf` or `Bot` icon from lucide-react inside a rounded container:
  - `bg-cyan-400/10 ring-1 ring-cyan-400/30 rounded-2xl p-3`
  - Icon color: `text-cyan-300`, size `size-7`
  - Add a **subtle glow animation** on the icon container: CSS `@keyframes iconPulse` that alternates `box-shadow` between `0 0 0px rgba(6,182,212,0)` and `0 0 20px rgba(6,182,212,0.4)` over 2.5s infinite.
- **Title:** `"SOC AI Search"` — `text-2xl font-bold tracking-tight text-white`
- **Tagline:** `"Next-Generation Security Operations"` — `text-sm text-cyan-400/80 font-medium tracking-wide uppercase` with a small divider line or letter-spacing.

### 4. Description Text

- `"Welcome to the secure analyst console. Authenticate via Keycloak to access the AI-powered event search engine, real-time aggregations, and automated threat summarization."`
- Style: `text-sm leading-relaxed text-zinc-400`, margin `mt-4 mb-6`.

### 5. Feature Highlight Pills/Badges

Display **3 badges** in a `flex flex-wrap gap-2` row:

| Badge | Icon | Color Theme |
|---|---|---|
| Natural Language Query | `BrainCircuit` or `MessageSquare` | cyan border + cyan tint |
| Real-time Aggregation | `BarChart3` or `Activity` | violet border + violet tint |
| Zero-Trust RBAC | `ShieldCheck` | emerald border + emerald tint |

- Style: `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium`
- Cyan: `border-cyan-500/30 bg-cyan-500/10 text-cyan-300`
- Violet: `border-violet-500/30 bg-violet-500/10 text-violet-300`
- Emerald: `border-emerald-500/30 bg-emerald-500/10 text-emerald-300`

### 6. Error Message (conditional)

If `auth.errorMessage` is present, show a styled error block:
- `rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 mb-4`
- Include a small `AlertCircle` icon (lucide-react) to the left of the message.

### 7. CTA Button (Sign In)

- Full-width: `w-full`
- Style: **NOT** the default shadcn Button gray. Use:
  ```
  bg-gradient-to-r from-cyan-500 to-blue-600
  hover:from-cyan-400 hover:to-blue-500
  text-white font-semibold
  rounded-xl py-3 text-sm
  transition-all duration-200
  hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]
  hover:scale-[1.02]
  active:scale-[0.98]
  ```
- Include `LogIn` icon (lucide-react) on the left.
- Label: `"Sign in with Keycloak"`
- `onClick={auth.signIn}`

### 8. Footer (outside card, bottom of screen)

Absolutely positioned at the bottom: `absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1`

- Line 1 (muted, tiny): `"End-to-End Encrypted Connection · SOC Environment MVP v1.0"` — `text-xs text-zinc-600`
- Line 2 (trust badge): `"🛡️ Protected by Caddy & Keycloak"` — `text-xs text-zinc-700`

---

## Loading State Redesign

The `auth.loading` state should also be redesigned to match the same full-screen background (cyber-grid + gradient glows). Show a centered card with:
- The animated icon container (same as above but with `Loader2 animate-spin` icon).
- Title: `"Restoring Secure Session"` — same typography.
- Subtitle: `"Verifying your Keycloak credentials..."` — `text-sm text-zinc-400`.
- A thin animated **progress bar** at the bottom of the card: a `div` with a shimmer/scanning animation from left to right in cyan color.

---

## Animations & Polish

1. **Card fade-in on mount:** Use a CSS class `animate-fadeInUp` with `@keyframes` that goes from `opacity:0; transform:translateY(16px)` to `opacity:1; transform:translateY(0)` over `0.4s ease-out`. Apply to the card div.
2. **Scan-line decoration:** 2 absolutely positioned elements with CSS `@keyframes scanPulse` (opacity 0 → 0.6 → 0, duration 3s, staggered delay) placed at the top-right and bottom-left corners of the screen.
3. **Icon glow pulse** on the shield icon (described in section 3).
4. All hover transitions should use `transition-all duration-200`.

---

## Overall Aesthetic Guidelines

- **DO NOT** make it look like a generic SaaS login page (no white backgrounds, no centered logo + plain button).
- It must feel like a **restricted-access military/enterprise cybersecurity terminal**.
- Keep the UI clean, data-free (no charts or tables on the login screen), completely focused on the single auth action.
- All colors must stay within the `zinc/cyan/violet/emerald` palette. No random blues, greens, or reds except the error state rose color.
- The finished result should feel like it belongs to the same design system as the existing dark-mode SOC dashboard.