---
title: "Banana — Part 10 — Debug Tools & Performance"
published: 2026-03-31
author: vee
tags: [wip]
seriesOrder: 10
---

# Banana — Debug Tools & Performance

Building a complex simulation requires good debugging and performance tools. Banana ships with several built-in utilities.

## Debug Overlays

Toggle visual overlays to inspect the internals:

- **Joint IDs** — display identifiers at track junctions
- **Segment IDs** — label each track segment
- **Formation IDs** — show train formation identifiers
- **Station stops** — visualize where trains stop at stations

## Performance Monitoring

Stats.js integration provides real-time FPS, memory, and render time monitoring directly in the viewport.

## Stress Tests

Built-in stress test tools let you push the system to its limits by spawning large numbers of entities to identify performance bottlenecks.

## Spatial Indexing

An R-tree spatial index enables efficient proximity detection, so the system can quickly find nearby tracks, stations, and trains without scanning every entity.

## Experimental Features

- **MapLibre map overlay** — overlay real-world maps beneath the simulation for geographic reference
