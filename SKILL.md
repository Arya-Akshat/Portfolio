You are improving an existing developer portfolio website for Akshat Arya.

## IMPORTANT FIRST STEP — Analyze Before Touching Anything

Read the full codebase. Preserve everything that works. Only implement the
two fixes listed below. Do not rebuild from scratch.

---

## Fix 1 — Skills Section Card Alignment (Masonry Layout)

### Root Cause

The current skills section uses CSS grid (`grid-cols-3`). CSS grid forces all
cards in the same row to share the same height — the tallest card in that row
dictates the height for every card beside it. So "Programming Languages"
(5 chips) sits next to "AI/ML" (15+ chips) and gets stretched to match it,
creating a huge empty white zone at the bottom of the smaller card.

`items-start` alone does NOT fully fix this — it only prevents the card element
from stretching, but the grid cell itself still occupies the full row height,
leaving a visual gap between the card bottom and the next row.

### Solution — CSS Columns (true masonry)

Replace the CSS grid with CSS columns. This is the correct approach for
variable-height card layouts — it flows cards into columns like newspaper
columns, so each card sits directly below the previous one with no gaps.

```tsx
// SkillsSection.tsx

export function SkillsSection({ skillGroups }: { skillGroups: SkillGroup[] }) {
  return (
    <section id="skills" className="py-24">
      <div className="max-w-5xl mx-auto px-6">
        <SectionTitle>Skills</SectionTitle>

        {/*
          CSS columns — NOT grid.
          Each card flows into the shortest column automatically.
          No empty space, no height stretching.
        */}
        <div
          style={{
            columnCount: 3,
            columnGap: "1.25rem",   // gap-5
          }}
          className="sm:columns-2 lg:columns-3 columns-1 gap-5"
        >
          {skillGroups.map((group) => (
            <div
              key={group.category}
              className="break-inside-avoid mb-5"
              // break-inside-avoid is critical — prevents a single card
              // from being split across two columns
            >
              <SkillCard group={group} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

### Tailwind columns utility

Use Tailwind's built-in columns utilities:

```tsx
<div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
  {skillGroups.map(group => (
    <div key={group.category} className="break-inside-avoid mb-5">
      <SkillCard group={group} />
    </div>
  ))}
</div>
```

- `columns-1` on mobile, `columns-2` on tablet, `columns-3` on desktop
- `gap-5` controls the gutter between columns
- `break-inside-avoid` on each card prevents cards from splitting across columns
- `mb-5` on each card provides vertical spacing between stacked cards

### SkillCard — height must be auto

The individual card must NOT have any fixed height, min-height, or h-full:

```tsx
function SkillCard({ group }: { group: SkillGroup }) {
  return (
    <div
      // No h-full, no min-h-*, no fixed height — pure auto
      className="bg-[#161B22] border border-white/[0.07] rounded-xl p-5
                 hover:border-white/[0.13] hover:bg-[#1C2333]
                 transition-all duration-200"
    >
      {/* Category label */}
      <p className="text-xs font-medium text-[#484F58] uppercase tracking-widest mb-3">
        {group.category}
      </p>

      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        {group.skills.map((skill) => (
          <span
            key={skill}
            className="px-3 py-1 rounded-full text-xs font-medium
                       bg-[#21262D] border border-white/[0.07]
                       text-[#8B949E] hover:text-[#E6EDF3]
                       hover:border-white/[0.13] transition-all duration-150
                       whitespace-nowrap"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  )
}
```

Note `whitespace-nowrap` on chips — prevents individual skill names from
breaking mid-word if the chip is near the column edge.

### Expected result

After this fix:
- "Programming Languages" (5 chips) → compact card, short height, no empty space
- "AI/ML" (15 chips) → tall card, fills its natural height
- Cards flow into whichever column has space, like a Pinterest/Masonry layout
- No card is ever taller than its own content

---

## Fix 2 — Background: Animated Web / Neural Network Pattern

Replace the square grid background with an animated web-like pattern —
random nodes connected by lines, like a neural network or constellation map.
This fits the AI/ML theme of the portfolio perfectly.

### Implementation — Canvas-based animated web

Create `components/ui/WebBackground.tsx`:

```tsx
"use client"

import { useEffect, useRef } from "react"

interface Node {
  x: number
  y: number
  vx: number
  vy: number
}

const NODE_COUNT = 80          // number of floating nodes
const CONNECTION_DIST = 150    // max distance to draw a line between nodes
const NODE_RADIUS = 1.5        // size of each dot
const MOUSE_DIST = 200         // distance at which mouse attracts nodes
const BASE_SPEED = 0.3         // movement speed

export function WebBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const nodesRef = useRef<Node[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Size canvas to full window
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    // Initialise nodes at random positions
    nodesRef.current = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * BASE_SPEED,
      vy: (Math.random() - 0.5) * BASE_SPEED,
    }))

    // Track mouse
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener("mousemove", onMouseMove)

    // Animation loop
    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      const nodes = nodesRef.current
      const mouse = mouseRef.current

      ctx.clearRect(0, 0, w, h)

      // Move nodes, bounce off edges
      nodes.forEach((node) => {
        node.x += node.vx
        node.y += node.vy
        if (node.x < 0 || node.x > w) node.vx *= -1
        if (node.y < 0 || node.y > h) node.vy *= -1

        // Subtle mouse attraction — nodes near cursor drift toward it gently
        const dx = mouse.x - node.x
        const dy = mouse.y - node.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MOUSE_DIST && dist > 0) {
          const force = (MOUSE_DIST - dist) / MOUSE_DIST * 0.02
          node.vx += (dx / dist) * force
          node.vy += (dy / dist) * force
          // Speed cap
          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy)
          if (speed > BASE_SPEED * 3) {
            node.vx = (node.vx / speed) * BASE_SPEED * 3
            node.vy = (node.vy / speed) * BASE_SPEED * 3
          }
        }
      })

      // Draw connections between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < CONNECTION_DIST) {
            // Closer = more opaque
            const alpha = (1 - dist / CONNECTION_DIST) * 0.25

            // Lines near mouse are brighter blue, others are muted white
            const mouseDist = Math.min(
              Math.hypot(mouse.x - nodes[i].x, mouse.y - nodes[i].y),
              Math.hypot(mouse.x - nodes[j].x, mouse.y - nodes[j].y)
            )
            const nearMouse = mouseDist < MOUSE_DIST

            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = nearMouse
              ? `rgba(59, 130, 246, ${alpha * 1.8})`   // blue near cursor
              : `rgba(255, 255, 255, ${alpha * 0.5})`  // muted white elsewhere
            ctx.lineWidth = nearMouse ? 0.8 : 0.5
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      nodes.forEach((node) => {
        const mouseDist = Math.hypot(mouse.x - node.x, mouse.y - node.y)
        const nearMouse = mouseDist < MOUSE_DIST
        const alpha = nearMouse ? 0.9 : 0.35

        ctx.beginPath()
        ctx.arc(node.x, node.y, nearMouse ? NODE_RADIUS * 1.8 : NODE_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = nearMouse
          ? `rgba(59, 130, 246, ${alpha})`
          : `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", onMouseMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ backgroundColor: "#0D1117" }}
    />
  )
}
```

### Usage — root layout

```tsx
// app/layout.tsx
import { WebBackground } from "@/components/ui/WebBackground"

export default function RootLayout({ children }) {
  return (
    <html>
      <body className="bg-[#0D1117]">
        <WebBackground />
        {children}
      </body>
    </html>
  )
}
```

### Section backgrounds — must be transparent

Remove solid `bg-[#0D1117]` from all `<section>` wrappers so the canvas
shows through. Keep cards opaque:

```
Sections:        bg-transparent  (canvas shows through)
Alternate sections: bg-black/20  (barely-there tint for rhythm)
Cards:           bg-[#161B22]    (solid — sits above the web)
Navbar:          bg-[#0D1117]/80 backdrop-blur-md  (semi-transparent)
```

### Performance note

The double nested loop for connections is O(n²). With 80 nodes that is
6,400 comparisons per frame — well within 60fps budget on modern hardware.
If performance is a concern on low-end devices, add this guard:

```tsx
// Skip every other frame on low-power devices
const shouldSkip = useRef(false)
// In the draw loop:
shouldSkip.current = !shouldSkip.current
if (shouldSkip.current && window.navigator.hardwareConcurrency < 4) return
```

### Reduced motion

```tsx
// At the top of useEffect:
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  // Draw static snapshot only — no animation loop
  drawOnce()
  return
}
```

---

## Previously Completed Fixes (verify these still work, do not regress)

- Hero: "Akshat Arya", professional summary, no template text
- Skill boxes: now using masonry columns (this session)
- Live button: hidden on projects without valid live URL
- Project buttons: pinned to card bottom (flex-col h-full)
- Duration: "X month(s)" — no "Not Specified"
- View More Projects: correctly reveals next 4 cards on each click
- Duration text: whitespace-nowrap, renders on single line
- JEE Mains: label visible in education
- Certificates: compact layout, no empty space
- Contact form: wired to akshat.arya13@gmail.com via EmailJS
- Social icons: Gmail, GitHub, LinkedIn, LeetCode in hero

---

## Quality Checklist

- [ ] Skills section uses CSS columns (not grid) — `columns-1 sm:columns-2 lg:columns-3`
- [ ] Each skill card has `break-inside-avoid` and `mb-5`
- [ ] No fixed height on skill cards — pure height-auto
- [ ] "Programming Languages" card is compact (no empty space below chips)
- [ ] "AI/ML" card is tall but not stretched — fills naturally
- [ ] All 5 skill groups render without empty whitespace anywhere
- [ ] Canvas web background renders across full page
- [ ] Nodes float and drift slowly across screen
- [ ] Lines between nearby nodes are visible but subtle
- [ ] Lines and nodes near cursor glow blue — lines elsewhere are faint white
- [ ] Nodes drift gently toward cursor position
- [ ] Section backgrounds are transparent — web canvas shows through
- [ ] Cards remain solid (bg-[#161B22]) — sit visually above the web
- [ ] Navbar is semi-transparent with backdrop blur
- [ ] Canvas resizes correctly on window resize
- [ ] Reduced motion: static snapshot only, no animation loop
- [ ] No performance issues — smooth 60fps on desktop