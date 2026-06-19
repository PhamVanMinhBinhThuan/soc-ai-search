# Prompt: Immersive 3D Parallax Hero Landing Page for SOC AI Search

Redesign the landing page for my "SOC AI Search" platform. Abandon the small central authentication card layout. Instead, create a grand, full-screen "Hero Section" layout inspired by modern enterprise SaaS platforms. 

The aesthetic is "Cybersecurity AI Core": Deep dark background, starry/data-node particles, and semantic neon colors (Cyan and Purple).

**Tech Stack:** React, TypeScript, Tailwind CSS, `framer-motion`, `lucide-react`.

**Layout & Visual Architecture:**

1. **Top Navigation Bar:**
   - Left: Logo (Shield icon + "SOC AI Search" text).
   - Right: A sleek "Sign in with Keycloak" button (ghost or outline style until hovered).

2. **The "AI Core" (Central 3D Element):**
   - In the exact center of the screen, render a large, abstract glowing orb or a highly stylized "AI Brain/Shield" composed of layered CSS radial gradients and blur effects (`filter blur-3xl`). 
   - It should pulse slowly and subtly shift colors between deep neon purple and cyan.

3. **Mouse-Tracking Parallax Orbits (CRUCIAL):**
   - Surrounding the central "AI Core", create 2 or 3 large, thin orbital rings (ellipses) set at tilted angles (like planetary rings or radar sweeps).
   - Add small glowing dots traversing these rings to simulate data packets.
   - **Interaction:** Use `framer-motion`'s `useMouseMove`, `useMotionValue`, and `useTransform` to tie the X/Y position of the mouse to these rings. When the mouse moves, the rings must shift slightly in the opposite direction (Parallax effect) to create a profound sense of 3D depth. The background particles should also have a very slight parallax movement.

4. **Hero Typography & Content (Overlaid on the Core):**
   - Layered directly over the central glowing core (ensure high contrast and readability using `z-index` and text shadows).
   - **Main Headline:** Massive, bold, modern typography. Example: "Intelligent Event Search\nfor Modern SOC Teams." (Make part of the text a gradient).
   - **Sub-headline:** "Scale your security operations. AI-powered log analysis, real-time aggregations, and zero-trust RBAC in one unified platform." (Muted, readable text like `text-zinc-300`).

5. **Call to Action (CTA):**
   - Below the sub-headline, place a prominent, glowing button: "Authenticate via Keycloak" alongside a secondary button like "Explore Features".
   - The primary button should have a smooth animated gradient border or a shimmer effect.

**Implementation Rules for the AI:**
- You MUST use `framer-motion` to implement the mouse parallax effect on the orbital rings. Do not just make them spin; they must react to mouse position.
- Keep the design strictly Dark Mode (`bg-[#030712]` or similar deep space color).
- Do not use external heavy 3D libraries like Three.js. Achieve this using clever CSS `transform`, `perspective`, SVG for the rings, and Framer Motion.
- Ensure the text remains perfectly readable over the glowing elements.