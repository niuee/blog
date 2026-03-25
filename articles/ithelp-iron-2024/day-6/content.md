---
title: "Day 06 | 說好的無限呢？"
published: 2024-09-20
author: vee
seriesOrder: 6
---

<img src="day6-banner.png" alt="day 6 banner" class="image-shadow image-rounded" style="max-width: 100%; height: auto;" />

我今天又要跳脫一下實作來解釋一些技術上面的抉擇。

今天的主題主要是關於 HTML canvas 的，如果你對實作選擇背後的考量沒有太大興趣的話，你今天可以先休息一天！

### 為了動起來，我們必須一直重繪！

在 Day 04 的時候我們有稍微提到過 HTML Canvas 充其量就是一張圖片而已。

為了要讓他有動起來的感覺，我們必須一直重新渲染 canvas 的最新狀態。

而清空 canvas 也是重繪中重要的一步。

### 要怎麼把 canvas 清空？

就我有限的認知，有兩種方法可以把一個 canvas 上面所有的圖畫都清掉。（歡迎各路高手幫我補充！）

1. 重新設定 canvas 的 width 或是 height
2. 使用 [`context.clearRect(x, y, width, height)`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clearRect) 這個 API

### 在這個系列我們選擇 2 !

為什麼在這邊選擇 2 呢？因為後面我們會需要監聽 canvas 的 width 跟 height 的變化。（用途會在後面的章節提到）

如果我們在清空的時候選擇用重新 assign width 或是 height 來達成時，我們會需要在監聽的 handler 裡面去做額外的處理，看看是不是 canvas 的 width 或是 height 有變化，還是我們只是在清空畫布。

我的考量是不想要讓 width 跟 height 監聽 handler 的邏輯變得太複雜，以及一直去 trigger canvas 的 MutationObserver。 

當然不是凡事都是有正確的解答，就連現在我也還在反覆思考我做這樣的選擇是不是正確的，有沒有需要更改？哪邊是我沒有考慮到的？

經過這個系列之後讀者們應該就會有自己的能力可以去做這個決定，如果你覺得更改 width 來清空 canvas 會是比較理想的做法，到後面你也可以自己做相對應的修改！

### 選擇 2 的話犧牲了什麼？

其實就像標題上面寫的，無限畫布變得不無限了！

就是因為 `clearRect` 這個函數需要給它指定的寬高，這樣它才知道要清空的範圍。

而“範圍”這個詞本身就跟“無限”相抵觸，我們不能真的用出一個無限的畫布。（如果你選擇在後面把清空方式改成 1 的話可能就可以把無限這個噱頭重新加進來了！）

沒有無限了？什麼？！你這個釣魚標題！不看了不看了！

等等 QAQ 先聽我解釋解釋。

我們可以先停下來思考一下，無限畫布的意義。

在我的解讀以及理解裡，無限畫布的重點不是在無限而是在自由。

畫布的尺寸只要足夠大，不一定需要無限。

所以我才願意犧牲這部分；我覺得沒有人會真的用到“無限的空間”

而是需要一種“這個空間大到我填不滿，我要用的時候不會沒有空間”的感覺。

當然每個人的想法不同，你可能不認同我的想法，無限畫布就是需要無限的尺寸，我還是私心希望你可以跟完這個系列，到後期你應該就可以自己發展出想要的樣子！

雖然不是真的無限，但是系列之後的文章我還是會稱我們現在在實作的東西為無限畫布，請多多指教！

今天就到這裡了～

大家明天見！

後記 1：
另外還有一個 `context.reset()` 是之後的章節會出現的。這個後面也會提到，但我在這裡補充一下。

`reset` 在 chrome 跟在 safari 會是不一樣的表現。在 chrome 上除了 `transform` 跟其他一些屬性會被重置以外，畫布也會被清空，但是在 safari 不會被清空，所以在蘋果的裝置上 `reset` 是不會清空畫布的，包括 iPhone、iPad 都是。

因此目前考量支援的關係暫時不會只使用 `context.reset()` 去清空畫布，會搭配上面說的 `clearRect` 如果後續 safari 對 `reset` 的實作有更改的話就可以把 `clearRect` 拔掉。（繼續追求支援度的話可以把 `reset` 換成 `resetTransform`）

我實在找不太到 safari 在哪裡有紀錄這種不太符合標準的實作，因為在 html living standard 裡面的確在 reset 上面是有提到要把畫布清空 [連結在這裡](https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-reset)，chrome 跟 firefox 都是有清空的。蘋果總是與眾不同。

你可以用 safari 跟 chrome 還有 firefox 去開 [MDN 的這個範例](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/reset#browser_compatibility)，下面有一個 toggle 的範例，玩玩看你就會看出 safari 是跟其他兩個瀏覽器不一樣。

後記 2：
其實好像也是可以利用 tiling（分割區塊）的方式去達成無限畫布，不過這個方向就是另外一個開發方向了，跟本系列後續的方向會有點不太一樣，所以目前我沒有打算將這個技巧利用在這個系列裡面，可能番外篇或是明年可以試試看？

