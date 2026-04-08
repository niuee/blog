---
title: "Banana — Part 9 — Serialization & Import/Export"
published: 2026-03-31
author: vee
tags: [wip]
seriesOrder: 9
---

# Banana — Serialization & Import/Export

Being able to save and load your railway world is crucial. Banana has a full serialization system for persisting the entire scene.

## Scene Serialization

The entire state of the simulation can be serialized, including:

- Track layout and geometry
- Train formations and positions
- Station placements and configurations
- Terrain heightmap data
- Building positions

## Export

Export your work to a file that can be shared or backed up. The export captures a complete snapshot of your railway world.

## Import

Import previously saved scenes to continue working on them or to load shared layouts from other users.

## Data Format

The serialization system converts the in-memory game state into a portable format that preserves all relationships between entities — tracks connected to junctions, trains on specific segments, stations assigned to platforms.
