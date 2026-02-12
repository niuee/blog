---
title: 無限畫布 — 第一部分 — 介紹
published: 2025-11-01
author: vee
seriesOrder: 1
---

# Infinite Canvas — Part 1

This is the first part of a short series on infinite canvas concepts and the [@ue-too/board](https://www.npmjs.com/package/@ue-too/board) library.

## What is an infinite canvas?

An infinite canvas lets users pan and zoom across a unbounded 2D space. Tools like Figma, Miro, and Excalidraw use this pattern. The web’s `<canvas>` element does not provide this out of the box; viewport (camera) logic is up to you.

In the next part we’ll look at how to control the camera and structure a minimal app around a board instance.
