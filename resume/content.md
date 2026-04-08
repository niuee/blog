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

### <span class="resume-company">ViewSonic</span> — Frontend Engineer
<div class="resume-meta">
  <span class="resume-date">Nov. 2024 - Present</span>
  <span class="separator">•</span>
  <span class="resume-location">Taipei, Taiwan</span>
</div>
<div class="resume-tech">React • TypeScript • PixiJS • HTML Canvas • WebGL</div>

**<a href="https://teamone.viewsonic.com" target="_blank">TeamOne</a>: Real-time Online Collaboration Whiteboard Service**

- Develop and maintain <a href="https://teamone.viewsonic.com" target="_blank">TeamOne</a> using **React**, **Next.js**, **TypeScript**, and **PixiJS**.
- Optimized the eraser calculation algorithm, delivering at least 30% performance improvement, with UX on par with Miro's precision eraser.
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
- Refactored interactive elements by migrating 40+ DOM elements to canvas, resolving user operation sync issues and reducing main-thread blocking during pan/zoom by ~25%.
- Reimplemented a custom mesh so that overlapping strokes within the same stroke do not add transparent colors, eliminating 100% of color blending artifacts.
- Refactored the text editor from Slate.js to Lexical, cutting editor-related bugs by 50% at once and improving maintainability.
- Collaborated with the backend team to implement share and collaborate without login, enabling one-click sharing for all board links with no signup required, improving BYOD (Bring Your Own Device) UX and driving higher usage.

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
- Replaced Azure Media Player with shaka-player for video playback on education platform.
- Developed cross-platform screenshot feature for web app and mobile webview.
- Built location-based data display feature; supported backend with **Golang** API development.

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

Started taking courses within the CS curriculum as technical electives. Followed the track for CS minor including data structure and algorithms, discrete math, etc. This is where I built a solid foundation for future endeavors in the CS field.

</div>

## Technical Skills

<div class="resume-section">

<div class="resume-skills">

<div class="resume-skill-category">
  <strong>Languages:</strong> Java, C/C++, JavaScript/TypeScript, Golang, Python, PHP, HTML, CSS
</div>

<div class="resume-skill-category">
  <strong>Libraries & Frameworks:</strong> Express.js, Django, React, Vue, Electron.js, GraphQL
</div>

<div class="resume-skill-category">
  <strong>Tools & Technologies:</strong> Git, Mocha, JUnit, Jest, PostgreSQL, MongoDB
</div>

<div class="resume-skill-category">
  <strong>Languages:</strong> Chinese/Mandarin (Native), English (Fluent)
</div>

</div>

</div>

## Personal Projects

<div class="resume-section">

### <a href="https://github.com/ue-too/ue-too" target="_blank">ue-too</a>

A set of tools for rapidly developing HTML canvas applications; all packages live in a single monorepo on [GitHub](https://github.com/ue-too/ue-too), and each package is published to npm.

Package list:

- <a href="https://github.com/ue-too/ue-too/tree/main/packages/board" target="_blank"><strong>board</strong></a>: HTML canvas viewport management (scale, pan, and rotate canvas).
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/being" target="_blank"><strong>being</strong></a>: finite state machine implementation.
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/animate" target="_blank"><strong>animate</strong></a>: animation interpolation utilities.
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/curve" target="_blank"><strong>curve</strong></a>: bezier curve computation utilities.
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/math" target="_blank"><strong>math</strong></a>: 2D vector computation utilities.

</div>

<div class="resume-section">

### <a href="https://github.com/ue-too/ue-too/tree/main/apps/banana" target="_blank"><strong>banana</strong></a>
This is what I currently devote most of my time to in terms of side projects. This is a city builder simulation that focuses on the railroad system.

</div>

<div class="resume-section">

### Web-based Horse Racing Simulation Game

A series of projects that will ultimately be integrated into a web-based horse racing simulation game.

- <a href="https://github.com/niuee/hrphysics-simulation" target="_blank"><strong>HR Physics Simulation</strong></a>: Simplified horse racing physics simulation.
- <a href="https://github.com/niuee/hrGraphql" target="_blank"><strong>HR GraphQL Server</strong></a>: Horse racing data GraphQL API implemented with gqlgen.
- <a href="https://github.com/niuee/hrcrawler" target="_blank"><strong>HR Crawler</strong></a>: Horse racing data crawler implemented with BeautifulSoup; some data feeds into the GraphQL API.
- <a href="https://github.com/niuee/hrracetrack-maker" target="_blank"><strong>HR Racetrack Maker</strong></a>: Bezier-curve-based race track editor.
</div>
