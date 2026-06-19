# Prompt: High-Density "Cyber Spark" Mouse Trail Refinement

The current mouse trail works, but it is too sparse and simple (just colored dots). I want to significantly upgrade its visual impact to make it a dense, mesmerizing "Cyberpunk Spark" trail. 

**DO NOT use generic shapes like flowers or hearts.** The shapes MUST fit the enterprise Cybersecurity/Sci-Fi theme.

**Please implement the following upgrades to the Mouse Trail component:**

1. **Shape Transformation (Cyber Sparks / Shards):**
   - Replace the simple rounded dots with sharp, high-tech shapes. Use 4-point glowing stars (using CSS `clip-path: polygon(...)`), thin glowing geometric shards, or tiny cyber-crosshairs.
   - Mix 2-3 different shapes dynamically to make the trail look complex and organic.

2. **High-Density & Scatter Effect (Make it THICK):**
   - **Density:** Spawn more particles per mouse movement. Instead of 1 particle per tick, spawn 2 or 3 particles simultaneously when the mouse moves.
   - **Scatter (Velocity):** Do not spawn them exactly on a single single pixel line. Give each spawned particle a random X and Y offset (e.g., `-15px` to `+15px` from the cursor) so the trail forms a "thick cloud" or "brush stroke" of particles rather than a thin string.

3. **Dynamic Lifespan & Physics:**
   - Add slight "gravity" or "drift". When a particle spawns, it should slowly drift downwards or outwards while shrinking and fading.
   - Vary the lifespan: Some particles should fade quickly (300ms), while others linger a bit longer (800ms) with a glowing pulse effect.

4. **Vibrant Glow (Neon Pop):**
   - Enhance the `box-shadow` to create an intense neon glow around these shapes.
   - Alternate the colors between Electric Cyan (`#00f2fe`), Neon Purple (`#8b5cf6`), and occasionally a bright white core to simulate intense heat/energy.

**Implementation note:** Use `framer-motion` to handle the enter/exit animations smoothly, and ensure you cap the array size (e.g., max 60-80 particles at a time) to prevent DOM lag, while still maintaining the illusion of a thick, dense trail.