---
title: "Banana — Part 1 — 介紹與總覽"
published: 2026-03-31
author: vee
tags: [wip]
seriesOrder: 1
---

# Banana — 介紹與總覽

歡迎來到這個系列的第一篇文章！本系列將帶你認識 [Banana](https://banana.vntchang.dev)，一個使用 React 和 PixiJS 打造的 2D 俯視角鐵道模擬器。

## 什麼是 Banana？

Banana 是一個在瀏覽器中運行的鐵道模擬遊戲。你可以鋪設軌道、設置車站、組建列車編組，並觀看它們按照時刻表運行——全部在無限畫布上即時渲染。

## 靈感來源

這個專案的靈感來自以下幾款遊戲：

- **NIMBY Rails** — 軌道規劃與路網設計
- **A-Train** — 城市建設與時刻表管理
- **Transport Fever** — 列車編組與物理模擬

## 技術棧

- **React 19** 搭配 TypeScript 作為 UI 層
- **PixiJS 8** 用於高效能 2D WebGL 渲染
- **Vite** 作為建置工具
- **Tailwind CSS** 與 **Radix UI** 負責樣式與元件
- **i18next** 支援國際化（英文與繁體中文）
- 來自 `@ue-too` monorepo 的自製套件，處理畫布、曲線、數學運算與動畫

## 本系列涵蓋內容

在接下來的 10 篇文章中，我們將逐一介紹 Banana 的每個主要功能：

1. 介紹與總覽（本篇）
2. 軌道系統
3. 地形
4. 列車與編組
5. 列車物理與移動
6. 車站與建築
7. 時刻表與排程
8. 鏡頭與導航
9. 序列化與匯入/匯出
10. 除錯工具與效能

開始吧！
