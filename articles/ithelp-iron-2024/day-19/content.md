---
title: "Day 19 | 再偷懶啊！趕快開始做事！"
published: 2024-10-03
author: vee
seriesOrder: 21
---

<img src="day19-banner.png" alt="day 19 banner" class="image-shadow image-rounded" style="max-width: 100%; height: auto;" />

這個系列主要前半部都是在描述怎麼實作一個無限畫布，但是如果這個無限畫布只是一張空白的紙實在是沒有什麼用處啊！

所以今天我們要來稍微點綴一下，讓它看起來比較五彩繽紛一點。

當然更多具體的實際應用我會在更後面一點的章節提到，我們今天就先從簡單的開始。

其實在無限畫布上面作畫跟一般你用 canvas 作畫是一樣的。

並不需要多做什麼東西。你在 canvas 上畫出來的，你就能在這個無限畫布上畫出來，然後還可以操作無限畫布去平移縮放跟旋轉。（指的是操作畫布，不是操作畫上去的東西去旋轉，如果有需要的話可能之後再補充）

所以我們先畫上一個長方形吧！

這個之前在 Day 03 | Canvas 的基礎裡面有稍微提到。

我把它貼過來

```javascript
rect(x, y, width, height)
```

`x` 矩形左上角的 x 座標 

`y` 矩形左上角的 y 座標 

`width` 矩形的寬度，應該說是 x 軸方向的長度 

`height` 矩形的高度，或者應該說 y 軸方向的長度

非常簡單。我們就直接來畫。

在 `main.ts` 裡面的 `step` function 裡面畫完座標軸後我們來畫一個矩形。

我們在 (30, 30) 的位置畫上一個 寬 10 、 高 50 的矩形。
`context.rect(30, 30, 10, 50);`

記得要把線條的顏色調回黑色不然會變成 y 軸的淡綠色。
`context.strokeStyle = "black";`

`main.ts`
```typescript
function step(timestamp: number){
    if(!context){
        return;
    }
    context.reset();
    // canvas.width = canvas.width; // 清空畫布
    context.translate(canvas.width / 2, canvas.height / 2);

    context.scale(camera.zoomLevel, camera.zoomLevel);
    context.rotate(-camera.rotation);
    context.translate(-camera.position.x, -camera.position.y);

    context.beginPath();
    context.arc(0, 0, 30, 0, 2 * Math.PI);
    context.stroke();

    // 畫出 x 軸
    context.beginPath();
    context.moveTo(0, 0); // 移動畫筆到原點
    context.lineTo(250, 0); // 從 moveTo 的點開始畫直線到 lineTo 的點 (250 是因為 canvas 的寬度是 500 目前我們畫到 250 就可以涵蓋可是範圍內的 x 軸)
    context.strokeStyle = `rgba(220, 59, 59, 0.8)`; // 畫出的線是一點淡淡的紅色
    context.stroke();

    // 畫出 y 軸
    context.beginPath();
    context.moveTo(0, 0); // 移動畫筆到原點
    context.lineTo(0, 250); // 從 moveTo 的點開始畫直線到 lineTo 的點
    context.strokeStyle = `rgba(87, 173, 72, 0.8)`; // 畫出的線是一點淡淡的綠色
    context.stroke();

    // 畫一個矩形
    context.beginPath();
    context.strokeStyle = "black";
    context.rect(30, 30, 10, 50);
    context.stroke();
    window.requestAnimationFrame(step); // 要記得 call requestAnimationFrame 不然動畫就只會有第一幀。
}
```

畫上去之後，你可以用平移、縮放、旋轉去看畫出來的矩形。

你可能之前就有觀察到一個現象，就是當你放大的時候座標軸的線會變得超級粗。

我們剛剛畫上去的矩形也有這個“問題”，不過這其實是預期的表現。因為我們實際上是看到放很大的同一個矩形。

但是如果我們想要看到在不同縮放倍率線條粗細都一樣的怎麼辦？

這時候我們就要搬出我們的相機了，因為我們有紀錄現在相機的縮放倍率。我們只要把想要的粗細除上相機的縮放倍率就可以了。

線條粗細的屬性是用 `context.lineWidth` 去調整，預設是 1。

所以假設我們想要線條的粗細在“我們看起來”的情況下都是維持在 1。

我們可以這樣做

`context.lineWidth = 1 / camera.zoomLevel`;

我們可以把它加在畫上矩形之前。

`main.ts`
```typescript
function step(timestamp: number){
    if(context){
        context.reset();
        // canvas.width = canvas.width; // 清空畫布
        context.translate(canvas.width / 2, canvas.height / 2);

        context.scale(camera.zoomLevel, camera.zoomLevel);
        context.rotate(-camera.rotation);
        context.translate(-camera.position.x, -camera.position.y);

        context.beginPath();
        context.arc(0, 0, 30, 0, 2 * Math.PI);
        context.stroke();

        // 畫出 x 軸
        context.beginPath();
        context.moveTo(0, 0); // 移動畫筆到原點
        context.lineTo(250, 0); // 從 moveTo 的點開始畫直線到 lineTo 的點 (250 是因為 canvas 的寬度是 500 目前我們畫到 250 就可以涵蓋可是範圍內的 x 軸)
        context.strokeStyle = `rgba(220, 59, 59, 0.8)`; // 畫出的線是一點淡淡的紅色
        context.stroke();

        // 畫出 y 軸
        context.beginPath();
        context.moveTo(0, 0); // 移動畫筆到原點
        context.lineTo(0, 250); // 從 moveTo 的點開始畫直線到 lineTo 的點
        context.strokeStyle = `rgba(87, 173, 72, 0.8)`; // 畫出的線是一點淡淡的綠色
        context.stroke();

        // 畫一個矩形
        context.beginPath();
        context.strokeStyle = "black";
        context.lineWidth = 1 / camera.zoomLevel;
        context.rect(30, 30, 10, 50);
        context.stroke();

    }
    window.requestAnimationFrame(step); // 要記得 call requestAnimationFrame 不然動畫就只會有第一幀。
}
```

這樣就可以維持線條寬度是 1 了。

不過畫完(stroke)後記得要把 `context.lineWidth` 給調整回這個作畫動作(`beginPath`)之前的數值，不然會影響到後面的每個作畫。

在這邊之所以沒有影響到是因為矩形是我們最後畫上的東西，到下一個重繪的循環時我們有呼叫 `context.reset()` 所以 `context.lineWidth` 會被重置回預設值 1 。

我們也可以針對相機的縮放倍率，去計算一個矩形現在在畫面大概是多大。

例如我們現在畫了一個寬高是 10 x 50 的矩形，那在縮放倍率是 0.05 的時候，我們的矩形在畫面上會是多大？

10 x 0.05 = 0.5; 50 x 0.05 = 2.5 在畫面上會是一個 0.5 x 2.5 的矩形。

計算這個有什麼用呢？因為你可以決定什麼東西在多少縮放倍率以下幾乎根本就看不見了，這樣就沒有畫出來的必要了吧？之類的需求。可以節省重繪需要的步驟。

或是什麼很複雜的圖形在小倍率的情況下可以只畫簡化過的版本；等等諸如此類的可以最佳化畫布的需求。

雖然我說要畫上五彩繽紛的東西但我好像到今天快結束了都沒有畫上什麼有意義的東西。哈哈哈哈

這部分就留給想像力比我應該豐富幾萬倍的大家來完成了，我先在這邊流個白～

那今天就到這邊！我們明天見！

