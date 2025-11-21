---
title: 履歷
author: Vincent Chang
published: 2025-01-01
---

<div class="resume-header">
  <h1 class="resume-name">張永裕</h1>
  <div class="resume-contact">
    <a href="mailto:vntchang@gmail.com">vntchang@gmail.com</a>
    <span class="separator">•</span>
    <span>+886 979-723-415</span>
    <span class="separator">•</span>
    <a href="https://github.com/niuee" target="_blank">github.com/niuee</a>
    <span class="separator">•</span>
    <span>臺北, 臺灣</span>
  </div>
</div>

## 工作經驗

<div class="resume-section">

### <span class="resume-company">ViewSonic</span> — 前端工程師
<div class="resume-meta">
  <span class="resume-date">2024年11月 - 至今</span>
  <span class="separator">•</span>
  <span class="resume-location">臺北, 臺灣</span>
</div>
<div class="resume-tech">React • TypeScript • PixiJS • HTML Canvas • WebGL</div>

**主要參與開發的產品: <a href="https://teamone.viewsonic.com" target="_blank">TeamOne</a> - 線上協作白板平台**

- 使用 **React**、**Next.js**、**TypeScript** 和 **PixiJS** 開發及維護 <a href="https://teamone.viewsonic.com" target="_blank">TeamOne</a>
- 最佳化筆觸橡皮擦計算方式，提升至少 30% 的效能；與 Miro 近期推出的 Precision Eraser 使用體驗截然不同。
- 透過將互動元素從 DOM 遷移至 canvas，解決了關鍵的同步問題並提升應用程式效能（確保主線程交互不會阻塞）。
- 透過將客製化文字編輯器從基於 Slate.js 重構為基於 Lexical，增強了文字編輯功能和使用者體驗，為未來功能開發帶來更高的靈活性和可維護性。
- 透過實作客製化 mesh，改善視覺品質和使用者體驗，在重疊透明筆畫時保留個別筆畫顏色，消除顏色混合的視覺瑕疵。
- 與後端團隊合作，實作讓使用者無需登入平台也可以分享及共編白板的功能。(目前尚未上線，預計 2026 年第一季上線)

</div>

<div class="resume-section">

### <span class="resume-company">Jubo</span> — 前端工程師
<div class="resume-meta">
  <span class="resume-date">2024年1月 - 2024年10月</span>
  <span class="separator">•</span>
  <span class="resume-duration">10 個月</span>
  <span class="separator">•</span>
  <span class="resume-location">臺北, 臺灣</span>
</div>
<div class="resume-tech">React • TypeScript • Golang • PostgreSQL • ASP.NET</div>

- 使用 **React**、**TypeScript** 和 **Next.js** 維護面向消費者的長照入口網站：[智齡照顧網](https://www.jubo-care.com/)。
- 使用 shaka-player 替換即將被微軟棄用的 Azure Media Player 進行影音串流。
- 開發跨平台（手機，網頁）截圖功能，與手機 app 開發工程師整合，達到一致的跨平台操作體驗。
- 使用 **Golang** 支援後端開發 API。

</div>

<div class="resume-section">

### <span class="resume-company">佐翼科技</span> — 軟體開發工程師
<div class="resume-meta">
  <span class="resume-date">2021年1月 - 2022年7月</span>
  <span class="separator">•</span>
  <span class="resume-duration">1 年 7 個月</span>
  <span class="separator">•</span>
  <span class="resume-location">臺南, 臺灣</span>
</div>
<div class="resume-tech">Golang • ROS • TypeScript • MongoDB • React</div>

**全端開發：桶槽表面檢測機器人**

- 使用 **React**、**Electron** 和 **threejs** 建立跨平台監控和視覺化應用程式；設計基於 **WebSocket** 的資料流，並透過 **RESTful API** 將測量資料於 **MongoDB** 儲存與串接外部儀器整合。

**農業無人機：感測器和飛控系統的 ROS 整合**

- 將 ROS 感測器與飛控整合；使用 GPS 和雜草熱點分析優化農藥噴灑；使用 arUco 標籤實作精準降落；使用 **Node.js** 實作一個小型自動化飛行日誌處理程式。

</div>

## 學歷

<div class="resume-section">

### <span class="resume-company">普渡大學</span> — 機械工程學士
<div class="resume-meta">
  <span class="resume-date">2014年8月 - 2018年12月</span>
  <span class="separator">•</span>
  <span class="resume-location">西拉法葉, 印第安納州</span>
</div>

在大學時期修習 CS 相關的課程當作系上的技術選修課程。也是在這時候打下軟體開發的基礎；照著 CS 輔系的學程，修習了資料結構與演算法、離散數學等課程。

</div>

## 技術能力

<div class="resume-skills">

<div class="resume-skill-category">
  <strong>程式語言：</strong> JavaScript/TypeScript, Golang, Python, PHP, HTML, CSS, Java, C/C++
</div>

<div class="resume-skill-category">
  <strong>函式庫與框架：</strong> Express.js, Django, React, Electron.js, GraphQL
</div>

<div class="resume-skill-category">
  <strong>工具與技術：</strong> Git, Mocha, JUnit, Jest, PostgreSQL, MongoDB
</div>

<div class="resume-skill-category">
  <strong>語言：</strong> 中文/國語（母語），英文（流利）
</div>

</div>

## 個人專案

<div class="resume-section">

### <a href="https://github.com/ue-too/ue-too" target="_blank">ue-too</a>

用於快速搭建基於 HTML canvas 的應用程式。主要分為以下幾個模組套件（彼此可以各自獨立）（所有套件皆由一個 <a href="https://github.com/ue-too/ue-too" target="_blank">monorepo</a> 做管理）：
- <a href="https://github.com/ue-too/board" target="_blank"><strong>board</strong></a>：HTML canvas viewport 的管理工具。可以快速建立一個簡易的無限畫布，並支援平移、縮放、旋轉等操作。
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/being" target="_blank"><strong>being</strong></a>：有限狀態機的實作。 board 其中判斷使用者操作意圖的部分有使用到這個套件，
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/animate" target="_blank"><strong>animate</strong></a>：簡易動畫函式庫。
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/curve" target="_blank"><strong>curve</strong></a>：貝茲曲線計算。
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/math" target="_blank"><strong>math</strong></a>：基礎數學計算（主要是向量相關）。

</div>

<div class="resume-section">

### <a href="https://github.com/ue-too/ue-too/tree/main/apps/banana" target="_blank"><strong>banana</strong></a>
目前投入最多時間在這個專案上面。目標是想要做一個城市發展模擬的遊戲，但主要聚焦在鐵路的建設和發展。可以參考 [readme](https://github.com/ue-too/ue-too/tree/main/apps/banana) 了解更多。或是去這個 [live demo](https://banana.vntchang.dev) 看看。

</div>

<div class="resume-section">

### 網頁版賽馬模擬

一系列最終將整合為賽馬模擬遊戲的專案。

- <a href="https://github.com/niuee/hrphysics-simulation" target="_blank"><strong>HR Physics Simulation</strong></a>：使用 Python 實作的簡化物理模擬，主要是模擬 Top Down 2D 的碰撞檢測以及運動狀態。
- <a href="https://github.com/niuee/hrGraphql" target="_blank"><strong>HR GraphQL Server</strong></a>：使用 gqlgen 實作的一個 GraphQL 伺服器。主要作為查詢賽馬血統相關的複雜資料（例如家系、等等）<a href="https://vntchang.dev/hrgraphql" target="_blank">線上演示</a>
- <a href="https://github.com/niuee/hrcrawler" target="_blank"><strong>HR Crawler</strong></a>：簡易的 Python 爬蟲；主要從日本網站 netkeiba.com 抓取真實世界的賽馬資料。部分抓取的資料會呈現在上述 GraphQL 伺服器中。並非用來盈利，主要是實驗性質，之後的會使用虛構架空的賽馬資料。
- <a href="https://github.com/niuee/hrracetrack-maker" target="_blank"><strong>HR Racetrack Maker</strong></a>：用於建立賽道的編輯器，可在上述物理引擎中用於模擬賽馬。基本上是一個貝茲曲線編輯器。操作背後的邏輯靈感來自 3D 建模軟體 Blender。<a href="https://vntchang.dev/racetrack-maker" target="_blank">live demo</a>
</div>
