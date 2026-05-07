---
title: Résumé
author: Vincent Chang
published: 2025-01-01
---

<div class="resume-header">
  <h1 class="resume-name">Vincent Chang</h1>
  <div class="resume-contact">
    <a href="mailto:vntchang@gmail.com">vntchang@gmail.com</a>
    <span class="separator">•</span>
    <span>+886 979-723-415</span>
    <span class="separator">•</span>
    <a href="https://github.com/niuee" target="_blank">github.com/niuee</a>
    <span class="separator">•</span>
    <span>Taipei, Taiwan</span>
  </div>
</div>

## Work Experience

<div class="resume-section">

### <span class="resume-company"><a href="https://www.viewsonic.com" target="_blank">ViewSonic</a></span> — Frontend Engineer
<div class="resume-meta">
  <span class="resume-date">Nov. 2024 - Present</span>
  <span class="separator">•</span>
  <span class="resume-location">Taipei, Taiwan</span>
</div>
<div class="resume-tech">React • Next.js • TypeScript • PixiJS • HTML Canvas • WebGL • Tailwind • Android WebView</div>

**<a href="https://teamone.viewsonic.com" target="_blank">TeamOne</a>: Real-time Online Collaboration Whiteboard Service**

- Develop and maintain <a href="https://teamone.viewsonic.com" target="_blank">TeamOne</a>, a real-time collaborative whiteboard platform built with **React**, **Next.js**, **TypeScript**, and **PixiJS**.
- Optimized the stroke eraser algorithm for at least 30% performance improvement, delivering UX on par with Miro's precision eraser.
  <div style="display: flex; gap: 10px; margin-top: 8px;">
    <figure style="flex: 1; margin: 0; text-align: center;">
      <img src="teamone.gif" alt="TeamOne Eraser" style="width: 100%;">
      <figcaption style="font-size: 0.85em; color: #666; margin-top: 4px;">TeamOne</figcaption>
    </figure>
    <figure style="flex: 1; margin: 0; text-align: center;">
      <img src="miro.gif" alt="Miro Eraser" style="width: 100%;">
      <figcaption style="font-size: 0.85em; color: #666; margin-top: 4px;">Miro</figcaption>
    </figure>
  </div>
- Refactored the custom text editor from Slate.js to Lexical, improving flexibility and maintainability for future feature development.
- Partnered with the backend team to ship anonymous share-and-collaborate, letting users co-edit whiteboards without an account — improving BYOD (Bring Your Own Device) UX and driving higher usage.
- Implemented passive-stylus and multi-touch support for the Android WebView client, including a 4-stage gesture pipeline that routes finger input to lasso selection and pen input to drawing, with a multi-pen mode supporting up to 10 concurrent strokes.
- Built a canvas-rendered comment pin system on **PixiJS** with custom hit-testing and opacity blending, so pins fade automatically when their anchored shapes are obscured.

**SetupWizard: Android WebView Device Setup Wizard**

- Bootstrapped a **React 19** + **Vite** + **TypeScript** + **TailwindCSS** application running inside Android WebView for ViewSonic display first-time setup; ported lint, i18n, and testing infrastructure from TeamOne.
- Worked around an Android WebView constraint that blocks ES-module scripts on `file://` URLs by configuring Vite to emit a single self-contained bundle targeting ES2015.
- Built a reusable infinite-scroll wheel component for the date/time/timezone picker (throttled wheel events, dynamic buffering, wrap-around index normalization) and wired it to native Android APIs for timezone, WiFi, and Ethernet configuration.

</div>

<div class="resume-section">

### <span class="resume-company"><a href="https://www.jubohealth.com/home" target="_blank">Jubo</a></span> — Frontend Engineer
<div class="resume-meta">
  <span class="resume-date">Jan. 2024 - Oct. 2024</span>
  <span class="separator">•</span>
  <span class="resume-duration">10 Months</span>
  <span class="separator">•</span>
  <span class="resume-location">Taipei, Taiwan</span>
</div>
<div class="resume-tech">React • TypeScript • Golang • PostgreSQL • ASP.NET</div>

- Maintained consumer-facing elderly care portal, [Jubo Care](https://www.jubo-care.com/), using **React**, **TypeScript**, and **Next.js**.
- Replaced Azure Media Player with shaka-player for video playback on the education platform.
- Developed cross-platform screenshot feature for the web app and mobile webview; collaborated with the mobile team to ensure UX consistency.
- Contributed to the main care information system (**React** frontend, **Node.js**/**Express.js** backend).
- Built location-based data display feature; supported the backend team with **Golang** API development.

</div>

<div class="resume-section">

### <span class="resume-company"><a href="https://www.droxotech.com/" target="_blank">Droxo Tech</a></span> — Software Developer
<div class="resume-meta">
  <span class="resume-date">Jan. 2021 - Jul. 2022</span>
  <span class="separator">•</span>
  <span class="resume-duration">1 year, 7 months</span>
  <span class="separator">•</span>
  <span class="resume-location">Tainan, Taiwan</span>
</div>
<div class="resume-tech">Golang • TypeScript • MongoDB • React • ROS</div>

**Full Stack Development: Fluid Storage Tank Inspection Robot**

- Built cross-platform monitoring and visualization apps using **React**, **Electron**, and **threejs**; designed **WebSocket**-based data flow and integrated **MongoDB** storage with external instruments via **RESTful API**.

**Agricultural UAVs: ROS integration for sensor and flight control systems**

- Integrated ROS sensors with flight control; optimized pesticide spraying using GPS and weed hotspot analysis; implemented precision landing with arUco tags; automated flight log processing using **Node.js**.

</div>

## Education

<div class="resume-section">

### <span class="resume-company">Purdue University</span> — B.S. Mechanical Engineering
<div class="resume-meta">
  <span class="resume-date">Aug. 2014 - Dec. 2018</span>
  <span class="separator">•</span>
  <span class="resume-location">West Lafayette, IN</span>
</div>

Took CS curriculum courses as technical electives following the CS minor track (data structures, algorithms, discrete math), building the foundation for my software career. The mechanical engineering background carries over directly: physics simulation, coordinate transforms, and computational geometry are at the core of the canvas and game projects I build today.

</div>

## Technical Skills

<div class="resume-section">

<div class="resume-skills">

<div class="resume-skill-category">
  <strong>Core:</strong> TypeScript/JavaScript, React, Next.js, PixiJS, HTML Canvas, WebGL
</div>

<div class="resume-skill-category">
  <strong>Graphics & Simulation:</strong> 2D rendering pipelines, Bézier curves, coordinate transforms, viewport management, physics simulation
</div>

<div class="resume-skill-category">
  <strong>Also proficient in:</strong> Golang, C/C++, Python, Vue, Electron.js, Node.js, GraphQL, PostgreSQL, MongoDB
</div>

<div class="resume-skill-category">
  <strong>Tools:</strong> Git, Jest, Mocha, Vite, pnpm monorepos
</div>

<div class="resume-skill-category">
  <strong>Languages:</strong> Chinese/Mandarin (Native), English (Fluent)
</div>

</div>

</div>

## Personal Projects

<div class="resume-section">

### <a href="https://github.com/ue-too/ue-too" target="_blank">ue-too</a>

A modular HTML canvas SDK organized as standalone packages in a pnpm monorepo on [GitHub](https://github.com/ue-too/ue-too), designed for drop-in integration into client applications. Powers <a href="https://banana.vntchang.dev" target="_blank">banana</a>, hidaka (horse racing game), and a knitting pattern editor.

Packages:

- <a href="https://github.com/ue-too/ue-too/tree/main/packages/board" target="_blank"><strong>board</strong></a>: HTML canvas viewport management (scale, pan, and rotate canvas).
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/being" target="_blank"><strong>being</strong></a>: finite state machine implementation.
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/animate" target="_blank"><strong>animate</strong></a>: animation interpolation utilities.
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/curve" target="_blank"><strong>curve</strong></a>: bezier curve computation utilities.
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/math" target="_blank"><strong>math</strong></a>: 2D vector computation utilities.

</div>

<div class="resume-section">

### <a href="https://banana.vntchang.dev" target="_blank"><strong>banana</strong></a> — Railway City Builder (Active WIP)

A browser-based 2D top-down city builder simulation centered on railroad systems. Built with React, PixiJS, and the `@ue-too` toolkit. I'm also writing a <a href="https://blog.vntchang.dev/series/banana/" target="_blank">10-part technical series</a> documenting its architecture.

- Implemented a block-signaling system with cascading aspect logic and a 5-phase auto-driver state machine with proportional braking calibrated to arrival distance.
- Built a dual-track laying tool with virtual-centerline interaction; snaps to joints by geometry and derives spacing per-duplication from segment width.
- Migrated scene state to three Zustand stores, collapsing ~40 `useState` and 15+ `useEffect` calls into a single `subscribe()`-driven render-sync hook with periodic IndexedDB auto-save.

</div>

<div class="resume-section">

### hidaka — Web-Based Horse Racing Simulation Game

- Graph-based track editor (bezier authoring, sessions, IndexedDB drafts, v2 JSON) consumed by the physics engine.
- Race precomputation in a **Web Worker**; sigmoid-knee stamina curves with per-horse phase amplifiers, calibrated against real Tokyo turf race data.
- Behavior-tree AI jockeys (3 archetypes) with pace-aware push and kick-shift mechanics; pixel-art rendering via custom `StripMesh`.

</div>
