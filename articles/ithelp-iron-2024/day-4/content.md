---
title: "Day 04 | Canvas 你怎麼都沒有反應？"
published: 2024-09-18
author: vee
seriesOrder: 4
---

<img src="day4-banner.png" alt="day 4 banner" class="image-shadow image-rounded" style="max-width: 100%; height: auto;" />

## Canvas 只是睡著了？
Canvas 本身是沒有「動」的概念。

已經畫下去的東西除非把它擦掉或是畫新的東西覆蓋上去，不然它是不會消失的。

畫在上面的東西是靜態的就像是一張圖片。

上一篇介紹的三個 `translate` 、 `scale` 、 `rotate` 移動的是 `context` 而不是 canvas。

因此把 canvas 弄得看起來像使用者可以平移、縮放、旋轉的流程大概會是這樣：
1. 把 canvas 現在有的東西整個清空
2. 調整 context 到想要的平移、縮放以及旋轉
3. 重新把原本在 canvas 上面的東西畫回去 (這樣畫上去的東西會有被移動、被縮放以及被旋轉的效果)

大概就是這樣一直重複，並且根據使用者的操作進行 `translate`、`scale` 以及 `rotate`的變換。

這個重複的循環有幾種方式可以達成。

1. `requestAnimationFrame` 
2. `setTimeout` 或是 `setInterval`
3. 使用者觸發更新

## 讓 Canvas 動起來

### `requestAnimationFrame`

這個是 web 原生的 API，人如其名，主要是用在動畫方面的用途。

就像是跟瀏覽器說我準備要畫下一幀的圖了喔，並且提供一個回調函數去執行畫圖的部分。

它會以螢幕更新的頻率被呼叫，所以通常是 60 Hz 左右。

有一個比較需要注意的點是當視窗沒有在 focus 的時候，瀏覽器會停止去呼叫 `requestAnimationFrame`。以節省資源。

所以如果是需要持續執行的話可能就會需要監聽 `visibilitychange` 事件，來暫停或是以別的方式繼續進行 `requestAnimationFrame` 裡某些被呼叫的功能。不這麼做的話，如果你有在回條函數裡面計算兩幀之間的時間差，那個時間差會在視窗沒有 focus 的時候瘋狂累積，而如果剛好你又有基於兩幀之間的時間差去做的計算，那個計算會爆炸。

### `setTimeout` 、 `setInerval`

`setTimeout` 跟 `setInerval` 應該是另外一個蠻常見的方式。

因為 `canvas` 需要定期去重畫，最直覺簡單第一個想到的方法可能就會是 `setTimeout` `setInterval` 這類週期性的排程方式。

不過因為 `setTimeout` 以及 `setInterval` 是沒有辦法保證在你指定的時間一定會執行，而且必須要自己想辦法取得幀與幀之間的時間差。在動畫或是畫面相關的通常還是會使用 `requestAnimationFrame` 。

不過在背景視窗裡面它們還是會持續執行，所以選擇哪種方法端看你最在乎的部分是什麼。

### 使用者觸發更新

如果使用者沒有操作畫布，畫布就沒有更新的必要。

這個大前提使得只監聽使用者的輸入並且對畫布作出相對應的更新，然後再重繪變成一個可行的方法。

不過這個設置會相對比較麻煩。而且因為是監聽使用者的操作，就不會使用 `requestAnimationFrame` 這樣如果有需要其他動畫的話就會需要再另外自己安排。

在這個系列裡面我主要會專注在第一種，會在更後面的章節介紹第三種，但是第二種並不會特別著墨。

<br />

--- 

<br />


### 大概的形狀

先說一下之後會大概怎麼使用 `requestAnimationFrame` 

主要會是重複最上面提到的三個步驟。

```javascript
function step(timestamp) {
// requestAnimation 會提供一個 timestamp 給 callback，比較好計算時間差

// 這裡會先把畫布清空
.
.
.

// 再來把 context 移動到指定地點
ctx.translate(某個位置);
ctx.rotate(某個旋轉角度);
ctx.scale(某個縮放倍率);

// 接下來就是把畫布原本的東西畫回去
.
.
.
}
```

大概就是這樣來循環。

今天的內容就到這裡，我們明天見！

