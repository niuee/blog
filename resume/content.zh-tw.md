---
title: 履歷 | 張永裕
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

## 工作經歷

<div class="resume-section">

### <span class="resume-company"><a href="https://www.viewsonic.com/tw/" target="_blank">ViewSonic 優派科技</a></span> — 前端工程師
<div class="resume-meta">
  <span class="resume-date">2024年11月 - 至今</span>
  <span class="separator">•</span>
  <span class="resume-location">臺北, 臺灣</span>
</div>
<div class="resume-tech">React • Next.js • TypeScript • PixiJS • HTML Canvas • WebGL • Tailwind • Android WebView</div>

**<a href="https://teamone.viewsonic.com" target="_blank">TeamOne</a>: 即時線上協作白板服務**

- 使用 **React**、**Next.js**、**TypeScript**、以及 **PixiJS** 開發並維護即時協作白板平台 <a href="https://teamone.viewsonic.com" target="_blank">TeamOne</a>。
- 最佳化筆觸橡皮擦演算法，提升至少 30% 的效能，提供優於 Miro 近期推出 Precision Eraser 的使用者體驗。
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
- 將客製化文字編輯器從 Slate.js 重構為 Lexical，提升靈活性與可維護性，便於後續功能開發。
- 與後端團隊合作，實作讓使用者無需登入即可分享與共編白板的功能，提升 BYOD (Bring Your Own Device) 使用者體驗，進而提升使用率。
- 為 Android WebView 客戶端實作被動式觸控筆與多點觸控支援，包含四階段手勢處理管線（手指對應套索選取、觸控筆對應繪圖），以及最多支援 10 支同時繪製的多筆模式。
- 在 **PixiJS** 上建構基於 canvas 的留言釘系統，搭配客製化碰撞偵測與透明度混合，當錨定圖形被遮蔽時釘記會自動淡化。

**SetupWizard：Android WebView 裝置初始化設定精靈**

- 從零搭建運行於 Android WebView 中的 **React 19** + **Vite** + **TypeScript** + **TailwindCSS** 應用程式，作為 ViewSonic 顯示器初次開機的設定精靈；自 TeamOne 移植 lint、i18n 與測試相關設定。
- Android WebView 在 `file://` 路徑下會封鎖 ES module 腳本載入；透過將 Vite 設定為輸出單一自封閉的 bundle 並以 ES2015 為目標來繞過此限制。
- 為日期、時間、時區選擇器打造可重用的無限捲動滾輪元件（滾輪事件節流、動態緩衝、循環索引正規化），並串接 Android 原生 API 完成時區、WiFi 與乙太網路設定。

</div>

<div class="resume-section">

### <span class="resume-company"><a href="https://www.jubohealth.com/home" target="_blank">Jubo 智齡科技</a></span> — 前端工程師
<div class="resume-meta">
  <span class="resume-date">2024年1月 - 2024年10月</span>
  <span class="separator">•</span>
  <span class="resume-duration">10 個月</span>
  <span class="separator">•</span>
  <span class="resume-location">臺北, 臺灣</span>
</div>
<div class="resume-tech">React • TypeScript • Golang • PostgreSQL • ASP.NET</div>

- 使用 **React**、**TypeScript**、以及 **Next.js** 開發和維護面向消費者類型的高齡照護入口網站 [Jubo Care 智齡照顧網](https://www.jubo-care.com/)。
- 與後端工程師合作替換教育平台上即將退場的 Azure Media Player，並以開源函式庫 shaka-player 取代影音播放功能。
- 與 App 端工程師合作開發可在網頁與手機端 Webview 頁面上皆可使用的截圖功能。
- 參與主要照護資訊系統開發（**React** 前端、**Node.js**/**Express.js** 後端）。
- 開發根據定位顯示資料的高齡社區資源功能；以 **Golang** 支援後端團隊開發基礎 API。

</div>

<div class="resume-section">

### <span class="resume-company"><a href="https://www.droxotech.com/" target="_blank">Droxo Tech 佐翼科技</a></span> — 軟體開發
<div class="resume-meta">
  <span class="resume-date">2021年1月 - 2022年7月</span>
  <span class="separator">•</span>
  <span class="resume-duration">1 年 7 個月</span>
  <span class="separator">•</span>
  <span class="resume-location">臺南, 臺灣</span>
</div>
<div class="resume-tech">Golang • TypeScript • MongoDB • React • ROS</div>

**桶槽貼壁式檢測載具**

- 使用 **React**、**Electron**、**threejs** 開發跨平台監控和視覺化應用程式，設計 **WebSocket**-based 的資料流和整合 **MongoDB** 儲存桶槽檢測數據。
- 整合外部測量儀器，實作桶槽貼壁式檢測載具的測量功能。

**農用植保機: 使用 ROS 整合感測器和飛行控制系統**

- 結合 GPS 和雜草熱點分析，使用 ROS 整合感測器和飛行控制系統，最佳化農用植保機的噴灑方式。
- 使用 arUco tags 實作無人機精準降落。
- 自動化飛行日誌處理。

</div>

## 學歷

<div class="resume-section">

### <span class="resume-company">普渡大學 Purdue University</span> — 機械工程學士
<div class="resume-meta">
  <span class="resume-date">2014年8月 - 2018年12月</span>
  <span class="separator">•</span>
  <span class="resume-location">印第安納州 西拉法葉, 美國</span>
</div>

於系選修中修讀多門資工系課程，並依循資工輔系學程選修了資料結構、演算法、離散數學等課程，奠定後續軟體職涯的基礎。機械工程的背景也直接延伸到現在的工作：物理模擬、座標轉換、計算幾何，正是我在 Canvas 與遊戲專案中的核心技能。

</div>

## 技術能力

<div class="resume-section">

<div class="resume-skills">

<div class="resume-skill-category">
  <strong>核心技術:</strong> TypeScript/JavaScript, React, Next.js, PixiJS, HTML Canvas, WebGL
</div>

<div class="resume-skill-category">
  <strong>圖像 & 模擬:</strong> 2D 渲染管線、貝茲曲線、座標轉換、視窗管理、物理模擬
</div>

<div class="resume-skill-category">
  <strong>其他:</strong> Golang, C/C++, Python, Vue, Electron.js, Node.js, GraphQL, PostgreSQL, MongoDB
</div>

<div class="resume-skill-category">
  <strong>工具:</strong> Git, Jest, Mocha, Vite, pnpm monorepos
</div>

<div class="resume-skill-category">
  <strong>語言:</strong> 中文 (母語), 英文 (流利)
</div>

</div>

</div>

## 個人專案

<div class="resume-section">

### <a href="https://github.com/ue-too/ue-too" target="_blank">ue-too</a>

用於建構互動式 HTML canvas 應用程式的模組化 SDK，組織為 [GitHub](https://github.com/ue-too/ue-too) 上的 pnpm monorepo，可直接整合進客戶端應用。目前支撐 <a href="https://banana.vntchang.dev" target="_blank">banana</a>、hidaka（賽馬模擬遊戲），以及一個編織圖樣編輯器（開發中）。

套件列表：

- <a href="https://github.com/ue-too/ue-too/tree/main/packages/board" target="_blank"><strong>board</strong></a>: HTML canvas 視窗管理工具（使 canvas 可以被縮放、平移、與旋轉）。
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/being" target="_blank"><strong>being</strong></a>: 有限狀態機的實作。
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/animate" target="_blank"><strong>animate</strong></a>: 動畫插值相關工具。
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/curve" target="_blank"><strong>curve</strong></a>: 貝茲曲線相關計算工具。
- <a href="https://github.com/ue-too/ue-too/tree/main/packages/math" target="_blank"><strong>math</strong></a>: 2D 向量相關計算工具。

</div>

<div class="resume-section">

### <a href="https://banana.vntchang.dev" target="_blank"><strong>banana</strong></a> — 鐵道導向城市建造模擬（活躍開發中）

一款網頁版 2D 俯視角都市建造模擬遊戲，聚焦在鐵道系統。使用 React、PixiJS 和 `@ue-too` 工具組開發。目前正在撰寫<a href="https://blog.vntchang.dev/series/banana/" target="_blank">十篇系列技術文章</a>，詳細記錄架構和各項功能的實作。

- 實作號誌系統（含級聯燈號邏輯）與 5 階段自動駕駛狀態機，搭配以到站距離校準的比例式煞車。
- 打造雙軌鋪設工具，以虛擬中心線進行互動；依幾何位置自動吸附至既有節點，並依各路段寬度動態計算間距。
- 將場景狀態遷移至三個 Zustand store，將 ~40 個 `useState` 與 15 個以上 `useEffect` 整併為單一 `subscribe()` 驅動的渲染同步 hook，並支援週期性 IndexedDB 自動儲存。

</div>

<div class="resume-section">

### hidaka — 網頁版賽馬模擬遊戲

- 圖結構（graph-based）的賽道編輯器（貝茲曲線編輯、Session 草稿管理、IndexedDB 持久化、v2 JSON 格式）供物理引擎使用。
- 比賽預先運算於 **Web Worker** 執行；使用 sigmoid-knee 體力曲線搭配各馬匹分階段加成，並以實際東京草地賽事資料校準。
- 以行為樹驅動的 AI 騎師（3 種原型），具備配速感知的催促與衝刺機制；以客製化 `StripMesh` 渲染像素風格畫面。

</div>
