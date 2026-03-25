---
title: "Day 02 | 無限空間"
published: 2024-09-16
author: vee
seriesOrder: 2
---

<img src="day2-banner.png" alt="day 1 banner" class="image-shadow image-rounded" style="max-width: 100%; height: auto;" />

## 什麼是無限畫布？

簡單來說無限畫布就是一張大白紙的概念，你可以在這張白紙上面畫上你想要的任何東西在任何你想要的地方，而如果要給這張畫布的尺寸設下限制，你希望會是無限。

其實我也不太確定無限畫布 (Infinite Canvas) 這個詞是怎麼來的，但是我自己的理解它最核心的概念就是在任何地方畫下任何東西，沒有什麼空間或形狀上的限制。

畫布延伸的方向也不會只侷限在單一方向而是平面畫布上的四個方向（上、下、左、右），而使用者的瀏覽方式也不侷限在一般往下滾動的常規方式。

在這裡列舉一些有應用到無限畫布概念的產品或函式庫，可能會比較好理解無限畫布的概念。

### 產品
- [Figma](https://www.figma.com/)
- [ViewSonic 的 TeamOne](https://teamone.viewsonic.com/)
- [Miro](https://miro.com/) 
- [Heptabase 的 Whiteboard](https://heptabase.com/)
- [Excalidraw (開源)](https://github.com/excalidraw/excalidraw)
- [tl;draw (開源)](https://tldraw.dev/)
- [macOS, iPadOS, iOS 的 Freeform](https://www.apple.com/newsroom/2022/12/apple-launches-freeform-a-powerful-new-app-designed-for-creative-collaboration/)
- [desmos](https://www.desmos.com/calculator)

### 函式庫
- [konva](https://konvajs.org/index.html)
- [panzoom](https://github.com/timmywil/panzoom)
- [panzoom](https://github.com/anvaka/panzoom)
- [fabricjs](http://fabricjs.com/)

還有很多很優秀的產品跟函式庫我沒有列出來，有些可能是我還沒挖掘到，請大家也可以幫忙補充～

有一個網站叫做 [Infinite Canvas](https://infinitecanvas.tools/)，它裡面羅列很多關於無限畫布的產品與函式庫。

如果有興趣的話可以去參考看看更多其他的產品。

如果你是前端工程師或是UI/UX設計師或相關職位，那你一定多少有用過或是聽過 Figma 。

敝司的後端工程師會用 draw.io 去畫一些規劃圖，跟流程圖，而 PM 也會用 miro 之類的工具畫一些跟工程師溝通需要用到的圖。

無限畫布在純軟公司裡面應該算是一個無所不在的存在！

Excalidraw 跟 tl;draw 在 GitHub 上星星數的成長都顯示無限畫布這個主題算是一個蠻熱門的項目。（雖然不知道在鐵人賽開始時熱潮還是不是在 xD）

但無限畫布其實就是一個概念，它實作的方法百百種。(有些會用 svg 等等其他的方式)

這個系列會是利用 HTML canvas 去實作一個無限畫布。

上面說了那麼多，我總結一下組成無限畫布兩個基本要素：
1. 使用者可以在畫布上的任何一個地方畫上任何東西
2. 使用者可以移動到畫布上的任何一個位置去觀看畫布上的內容

## 這個系列主要會實現的功能

HTML Canvas API 其實已經實現了無限畫布的第一個要素，因此這個系列文會專注在第二個要素，「移動畫布」上面。

### 移動畫布
「移動畫布」又可以細分成以下 3 個功能：
- 平移 (Pan)
- 縮放 (Zoom)
- 旋轉 (Rotate)

### 應用
實作完以上3個主要功能之後我會用一些額外的函式庫去講解一些可以完成的應用。（在畫布上作畫）包含
- 畫一些簡單的圖表 (串接 D3.js)
- 動畫
- 畫地圖
- 手寫字
- 一個物理模擬的視覺化介面
- 貝茲曲線編輯器

這個系列文的重點不是在於打造出 Figma 或是一個完整的產品，而是說明怎麼做出 Figma 的基底。

如果展示怎麼做出 Figma 那應該也不只 30 篇了，我也很懷疑我自己有沒有那個能力或毅力做到。xD

說了這麼多，如果要吸引人看的話，果然還是需要一個完成品對吧？

但是因為寫這篇文章的當下，我也還沒有完成 xD 所以只能靠大家的想像力了，不過我們到第 8 天或是第 9 天的時候就差不多可以有一個雛形了，還請大家撐到那個時候拜託！

我們明天見？
