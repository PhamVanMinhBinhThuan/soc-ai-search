# Prompt: Advanced Interactive Landing Page for SOC AI Search (v2)

Upgrade the existing static Authentication Gateway for the "SOC AI Search" platform into a highly interactive, premium, and dynamic interface. The goal is to make the user say "Wow" through smooth animations and deep cyber-security aesthetics.

**Tech Stack:** React, TypeScript, Tailwind CSS, `framer-motion` (CRITICAL for animations), `lucide-react`, shadcn/ui.

**Core Interactive Requirements:**

1. **Mouse-Tracking Spotlight Background:**
   - Instead of a static grid, create an interactive `bg-grid-pattern`.
   - Implement a dynamic mouse-tracking effect: Use React state or Framer Motion's `useMotionValue` to track the cursor's X/Y coordinates. Render a radial gradient (a soft cyan/purple glow) that seamlessly follows the user's cursor behind the main card, illuminating the grid only where the mouse is.

2. **3D Magnetic / Animated Border Card:**
   - The central authentication card must feature a Glassmorphism effect (`backdrop-blur-xl`, `bg-zinc-950/50`).
   - Add a "Magic Border" effect: A subtle glowing gradient border that spins around the card's perimeter, or highlights the edge closest to the mouse cursor.
   - Optional: Implement a very subtle 3D tilt effect on the card using Framer Motion when the user hovers over the card area.

3. **Staggered Entrance Animations (On Mount):**
   - When the page loads, do not just snap everything into view.
   - Use `framer-motion` to create a `staggerChildren` animation:
     1. First, the shield icon and title fade & slide down smoothly.
     2. Second, the description text fades in.
     3. Third, the 4 feature pills pop in one by one (`scale: 0.9` to `1` with a slight spring effect).
     4. Finally, the main Keycloak button slides up and glows.

4. **Hover Micro-Interactions (The "Juice"):**
   - **Shield Icon:** When hovering over the card header, make the shield icon pulse with a neon cyan drop-shadow.
   - **Feature Pills (Tags):** On hover, each pill should elegantly lift up (`-translate-y-1`), and its border should transition to a bright neon semantic color (e.g., Cyan for Natural Language, Purple for AI, Green for RBAC).
   - **Login Button:** 
     - Add a smooth "Shimmer" effect (a slanted light beam passing through the button automatically every few seconds).
     - On hover, expand its glowing drop-shadow (`shadow-[0_0_20px_rgba(0,242,254,0.5)]`) and slightly scale it up (`scale: 1.02`).

5. **Refined Typography & Layout:**
   - Make the "NEXT-GENERATION SECURITY OPERATIONS" sub-title track wider (letter-spacing: uppercase, `tracking-widest`) and apply a text gradient (Cyan to Purple).
   - Keep the bottom footer text very subtle, perhaps with a pulsing red dot next to "Protected by Caddy & Keycloak" to simulate a live, secure heartbeat.

**Strict Output Rules:**
- Output a single, robust React component containing all the necessary Framer Motion logic.
- Ensure the code handles performance well (use lightweight animations).
- Maintain the absolute dark, premium cybersecurity vibe (no bright backgrounds, strictly dark zinc/slate with neon accents).