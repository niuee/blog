---
title: Infinite Canvas — Part 2 — Camera and viewport
published: 2025-11-02
author: vee
seriesOrder: 2
---

# Infinite Canvas — Part 2

In [Part 1](/articles/infinite-canvas/part-1) we introduced the idea of an infinite canvas. Here we focus on the camera (viewport).

## Camera and viewport

The camera determines which part of the world is visible and at what zoom. With [@ue-too/board](https://www.npmjs.com/package/@ue-too/board), you get:

- **Default controls**: space+drag to pan, Ctrl+scroll to zoom, pinch on touch devices.
- **Programmatic control**: `board.getCameraRig().panToWorld({ x, y })`, `setZoom()`, and coordinate helpers like `screenToWorld` / `worldToScreen`.

Use `board.step(timestamp)` in your render loop so the camera transform is applied before you draw. Everything you draw with `board.context` after that is in world space and will pan and zoom with the view.

That’s the core. Next we could add hit-testing, layers, or persistence—pick one and build from here.
