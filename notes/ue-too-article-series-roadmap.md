# Under the Hood of an Interactive Canvas — Article Series Roadmap

> Personal reference. Not part of the site build.

## Series Theme

**"Under the Hood of an Interactive Canvas"**

Progressively peel back the layers of an interactive canvas application, starting from what the user sees (viewport) and drilling inward through each architectural layer until the reader understands how every piece fits together — and can build their own.

Why this theme works:

- Creates a natural progression from simple to complex
- Each article is self-contained but builds on the previous one
- Mirrors the actual data flow architecture of `@ue-too/board` (input → interpretation → mux → camera → render)
- Gives room to branch into supporting packages (`@ue-too/math`, `@ue-too/animate`, `@ue-too/curve`, etc.) as natural extensions

---

## Article Roadmap

### Part 1 — The Viewport: Turning a Canvas into a Window

- What "infinite canvas" means and why `<canvas>` doesn't do it out of the box
- The mental model: camera looking at a world vs. a page scrolling
- Minimal working example: `Board` + `requestAnimationFrame` + `step()`
- What you get for free: default pan/zoom/touch controls

**Audience hook:** "You've used Figma or Miro. Here's what's actually happening underneath."

---

### Part 2 — World Space vs. Screen Space: The Coordinate Duality

- The two coordinate systems and why they matter
- `screenToWorld` / `worldToScreen` — when and why you need them
- The affine transformation matrix behind pan, zoom, and rotation
- Practical example: hit-testing objects on a pannable canvas

**Packages:** `@ue-too/board`, `@ue-too/math`

---

### Part 3 — What Does the User Want? Interpreting Raw Input

- The problem: a `pointerdown` event could mean pan, draw, select, or nothing
- How `@ue-too/board` uses a finite state machine to interpret user intent
- Supporting mouse, trackpad, and touch with a single abstraction
- How to customize input behavior

**Packages:** `@ue-too/board` (input interpretation layer), `@ue-too/being` (state machine concepts)

---

### Part 4 — The Input Pipeline: From Events to Camera Movement

- Full data flow: DOM events → event parsers → state machine → input orchestrator → camera mux → camera rig → observable camera
- Why an orchestrator + mux pattern: handling competing input sources (user vs. animation vs. programmatic)
- The `allowPassThrough` permission model
- Camera rig restrictions and clamping (zoom bounds, pan limits)

**Note:** This is the architecture deep-dive article. Lean on the mermaid diagram from the board README.

---

### Part 5 — Smooth Moves: Animating the Camera

- Why you need animation for a good canvas UX (click-to-focus, zoom transitions, guided tours)
- The `@ue-too/animate` keyframe system: Animation, CompositeAnimation, easing
- How camera animations interact with user input through the mux
- Building a "click to fly to point" interaction

**Packages:** `@ue-too/animate`, `@ue-too/board`

---

### Part 6 — Drawing Curves: Bezier Paths on an Interactive Canvas

- Bezier curve fundamentals (quadratic, cubic) and why they matter for canvas apps
- The `@ue-too/curve` API: evaluation, splitting, arc-length parameterization, intersection
- Practical example: a simple path/curve editor on an infinite canvas
- Animating objects along curves

**Packages:** `@ue-too/curve`, `@ue-too/math`

---

### Part 7 — Playing Well with Others: Framework Integrations

- Why `@ue-too/board` is framework-agnostic at its core
- Integration with PixiJS, Fabric.js, Konva
- Integration with React (`@ue-too/board-react`) and Vue (`@ue-too/board-vue`)
- The pattern: what stays the same and what changes across frameworks

**Packages:** `@ue-too/board-react`, `@ue-too/board-vue`, examples

---

### Part 8 — Advanced: Adding Physics to Your Canvas

- When you might want physics in a canvas app (simulations, games, interactive demos)
- The `@ue-too/dynamics` world: rigid bodies, collision detection (broad + narrow phase), constraints
- Rendering physics on an `@ue-too/board` canvas
- Spatial indexing strategies (QuadTree, Dynamic Tree, Sweep-and-Prune)

**Packages:** `@ue-too/dynamics`, `@ue-too/board`

---

### Part 9 — Scaling Up: Entity Component System Architecture

- When your canvas app outgrows ad-hoc object management
- ECS fundamentals: entities, components, systems, signatures
- The `@ue-too/ecs` coordinator pattern
- Example: managing hundreds of interactive objects on a canvas

**Packages:** `@ue-too/ecs`

---

### Part 10 — Putting It All Together: Building a Real Application

- Walk through a real app built on the toolkit (e.g., the railroad layout diagram tool or the tabletop game prototype maker)
- Which packages were used where and why
- Design decisions, trade-offs, and lessons learned
- Where the toolkit is heading next

**Note:** Capstone article that ties the series together.

---

## Relationship to Existing Articles

| Existing Article | Relationship |
|---|---|
| *How I Built an Infinite Canvas: the why* | Prequel / motivation piece — link as background before Part 1 |
| *A User Manual on @ue-too/board* | Complementary reference — the series goes deeper on "why" while this covers "how to use" |
| *What Does the User Want?* | Directly overlaps with Part 3 — refine/expand into Part 3 or link to it |
| *Infinite Canvas* series (2 parts) | Shorter version of Parts 1–2 — new series supersedes with more depth |
| *Railroad Layout Diagram* series | Could serve as the basis for Part 10's real application walkthrough |

---

## Optional Bonus Articles

- **Geographic Projections** — the `@ue-too/border` package for map-based canvas apps
- **Building Custom Input Modes** — extending the state machine for app-specific gestures (lasso select, freehand draw)
- **Performance & Optimization** — offscreen canvas, worker threads, culling strategies

---

## Writing Priorities

1. **Start with Parts 1–4** — they form the core narrative arc and cover the most distinctive aspects of `@ue-too/board`
2. **Parts 5–9 can be written in any order** — more self-contained explorations of individual packages
3. **Part 10 should come last** — assumes familiarity with everything
4. **Each article should include a live interactive demo** where possible
