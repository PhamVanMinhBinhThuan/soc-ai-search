# Prompt: Interactive Mouse Trail & Copywriting Refinement

The current Hero section looks phenomenal. Now, let's refine the UX and add a mesmerizing micro-interaction.

**1. Copywriting Update (Remove Auth Tech Name):**
- End-users do not need to know the underlying authentication technology (Keycloak). 
- Change the primary central CTA button text from "Authenticate via Keycloak" to "Access Console" or "Get Started".
- Change the top-right header button from "Sign in with Keycloak" to "Secure Login".

**2. Cyber Particle Mouse Trail Effect (Crucial):**
- Implement a dynamic mouse trail effect that follows the user's cursor anywhere on the screen.
- **Behavior:** As the mouse moves, spawn small glowing "cyber particles" (tiny circles or stars with cyan/purple `box-shadow` glow) exactly at the cursor's X/Y coordinates.
- **Animation:** These particles must smoothly shrink (`scale: 0`), drift slightly downwards or randomly, and fade out (`opacity: 0`) over 500ms to 800ms. 
- **Tech constraint:** Use React state and `framer-motion` (or optimized CSS transitions). Ensure performance by limiting the maximum number of active particles in the DOM at any given time (e.g., keep an array of the last 20-30 positions and remove old ones).
- The trail should look like a digital comet, floating cyber-dust, or a magical futuristic glow tracking the mouse.

**3. Polish & Z-Index Safety:**
- Keep the existing 3D parallax orbital rings fully intact.
- Ensure the particle trail layer has `pointer-events-none` so it absolutely does not block the user from clicking the buttons or interacting with the UI.
- The trail should seamlessly blend with the dark background (`mix-blend-screen` or `mix-blend-lighten` if applicable).