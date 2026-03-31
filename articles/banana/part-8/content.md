---
title: "Banana — Part 8 — Camera & Navigation"
published: 2026-03-31
author: vee
seriesOrder: 8
---

# Banana — Camera & Navigation

Smooth camera control is essential for navigating a large railway network. Banana's camera system goes beyond basic pan and zoom.

## Pan, Zoom & Rotate

The camera supports full 2D navigation via mouse and trackpad:

- **Pan** — click and drag to move around the map
- **Zoom** — scroll to zoom in and out
- **Rotate** — rotate the viewport for different viewing angles

## Van Wijk & Nuij Optimal Interpolation

Camera transitions use the Van Wijk & Nuij algorithm for geodesic-style animation. This produces smooth, natural-feeling movements when the camera flies between distant locations — automatically balancing zoom level and travel distance.

## Follow & Lock-On Mode

The camera can follow a moving train, keeping it centered in the viewport as it travels along the track.

## Scale Ruler

A zoom-aware scale ruler in the viewport adjusts dynamically to show real-world distances at the current zoom level.
