---
title: "Day 13 | Zoooom"
published: 2024-09-27
author: vee
seriesOrder: 15
---

<img src="day13-banner.png" alt="day 13 banner" class="image-shadow image-rounded" style="max-width: 100%; height: auto;" />

昨天好像不小心一次噴太多內容，希望大家沒有消化不良。

我會持續回去補充 Day 12 的內容，因為我昨天才發現我好像有些東西沒有寫好。

不過 Day 12 的東西就有點像是支線任務那樣，大家也可以選擇不要細看內容，只要拿實作的細節就好。

今天我們要來做三本柱之一的縮放功能，縮放與平移相比真的簡單許多，大家可以放心。

縮放主要是會用到 canvas context 的 `scale`。

縮放跟平移一樣，我們都會支援 滑鼠鍵盤、觸控板、以及觸控。

觸控的部分會比較複雜一點，我會需要先講一些前備知識，所以不會放在今天的篇幅。

我們縮放的邏輯也會跟平移一樣，會盡量遵循大家熟悉的軟體操作邏輯，主要會跟 figma 借鏡。

雖然 `scale(x, y)` 可以傳入任意的 x、y 值，但是因為 0 跟 負數還有 x、y 不同值的情況在只是移動畫布的情景下不太合理。

所以我們有一個類似平移的方匡邊界，去限制縮放倍率的範圍。

我們的倍率不會小於等於 0 但是上限沒有特別的限制。

等於 0 的會畫布會被變不見，負數的話畫布會上下左右顛倒。

我們先在 `camera.ts` 裡面新增一個 type `ZoomLevelBoundary`

`camera.ts`
```typescript
export type ZoomLevelBoundary = {
    min: number;
    max: number;
}
```

然後把它加進去 `Camera` 類別裡面。

`camera.ts`
```typescript
class Camera {

    // 略
    private _zoomLevelBoundary: ZoomLevelBoundary;

    constructor(viewPortWidth: number = 500, viewPortHeight: number = 500, positionBoundary: PositionBoundary = {min: {x: -1000, y: -1000}, max: {x: 1000, y: 1000}}, zoomLevelBoundary: ZoomLevelBoundary = {min: 0.1, max: 10}){
        this._position = {x: 0, y: 0};
        this._zoomLevel = 1; // 縮放程度不能夠小於或是等於 0 這個原因會在後續章節介紹。
        this._rotation = 0;
        this._positionBoundary = positionBoundary;
        this.viewPortWidth = viewPortWidth;
        this.viewPortHeight = viewPortHeight;
        this.limitEntireViewPort = true;
        this._zoomLevelBoundary = zoomLevelBoundary;
    }

    // 略
}
```

在這邊補充一下，這個系列使用的縮放倍率 `ZoomLevel` 數字越大的意思是放大，越小的意思則是縮小。

縮放的操作邏輯以滑鼠鍵盤來說最直覺的方式應該是滾動滑鼠滾輪了吧。

但是！我們在平移的時候已經有使用 `wheel` 這個 event 來處理觸控板的平移。

所以如果我們又用來處理縮放，那就會變成同一個操作會同時進行平移與縮放，這是我們不樂見的。

之前平移的觸控板實作時有稍微提到，觸控板在兩隻手指 pinch 的時候也會觸發 `wheel` event 不過會帶上 `event.ctrlKey` 為 `true`。

我們可以利用這個，讓滑鼠滾輪在滾動的時候也需要按下 control 才會進行縮放。因為我們觸控板在 pinch 時也是觸發一樣的 event，這樣我們可以一個 Handler 同時處理滑鼠鍵盤以及觸控板。

當然如果你是 mac 的話也可以加上 `cmd` 的判斷，讓操作比較像是 figma。

不過這樣做的缺點是如果我們單獨滾動滑鼠滾輪，會觸發到觸控板的平移操作。

這大概也是為什麼有些軟體會選擇讓使用者選擇目前是使用觸控板還是滑鼠操作。可以針對不同的輸入裝置進行操作體驗的最佳化。

不過如果以通用為優先，這個做法應該算是目前最佳解了。

接下來我們去 `KeyboardMouseInput` 類別裡面。

找到之前的 `wheelHandler` 裡面有一個 `if` 的條件式是我們之前預留的。 

`keyboardmouse-input.ts`
```typescript
class KeyboardMouseInput {
    // 上略

    wheelHandler(event: WheelEvent){
        event.preventDefault();
        if(event.ctrlKey){
            // 縮放操作
        } else {
            // 平移操作
            const diff = {x: event.deltaX, y: event.deltaY};
            const diffInWorld = this.camera.transformVector2WorldSpace(diff);
            this.camera.setPositionBy(diffInWorld);
        }
    }

    // 下略
}
```

我們可以直接取得 `event.deltaY` 這個當作我們縮放的量。不過通常會加上一個 damping 不然可能馬上就縮放到看不見了。

你也可以針對自己的需求調整縮放的敏感度。如果你把這個差距乘上目前當下的縮放倍率，會讓縮放的感覺在每個不同的縮放倍率是一至的。（就是不會你放很大的時候，你輕輕動一下東西就被放大到看不見了）

接下來我們要回去 `camera.ts`，我們要寫幾個 helper function

`camera.ts`
```typescript
export function withinZoomLevelBoundary(zoomLevel: number, zoomLevelBoundary: ZoomLevelBoundary): boolean {
    return zoomLevel <= zoomLevelBoundary.max && zoomLevel >= zoomLevelBoundary.min;
}
```

然後把它加進去 `Camera` 裡面的 `setZoomLevel` 這個 function 裡面。

`camera.ts`
```typescript
class Camera {
    // 上略
    setZoomLevel(targetZoom: number){
        if(!withinZoomLevelBoundary(targetZoom, this._zoomLevelBoundary)){
            return;
        }
        this._zoomLevel = targetZoom;
    }
    // 下略
}
```

接下來我們在 `Camera` 裡面加上一個 `setZoomLevelBy(deltaZoomLevel: number)` 的 function

`camera.ts`
```typescript
class Camera {
    // 上略
    
    setZoomLevelBy(deltaZoomLevel: number){
        this.setZoomLevel(this._zoomLevel + deltaZoomLevel);
    }

    setZoomLevel(zoomLevel: number){
        if(!withinZoomLevelBoundary){
            return;
        }
        this._zoomLevel = zoomLevel;
    }

    // 下略
}
```

在 `KeyboardMouseInput` 裡面的 `wheelHandler` 裡面加上縮放相機的邏輯

`keyboardmouse-input.ts`
```typescript
class KeyboardMouseInput {
    // 上略

    wheelHandler(event: WheelEvent){
        event.preventDefault();
        if(event.ctrlKey){
            // 縮放操作
            const deltaZoomLevel = -event.deltaY * this.camera.zoomLevel * 0.025;
        } else {
            // 平移操作
            const diff = {x: event.deltaX, y: event.deltaY};
            const diffInWorld = this.camera.transformVector2WorldSpace(diff);
            this.camera.setPositionBy(diffInWorld);
        }
    }

    // 下略
}
```

這邊會加上負號主要是滑鼠滾輪的方向還有觸控板的方向，你可以自己調整看看。然後 0.025 也是我自己覺得比較好的係數，也可以自己用用看再調整。不過我發現這個係數在有些滑鼠上面簡直是毀天滅地，所以大家可以針對自己的體驗再去調整。

之後就可以直接把這個 `deltaZoomLevel` 丟給 Camera 了。

`keyboardmouse-input.ts`
```typescript
class KeyboardMouseInput {
    // 上略

    wheelHandler(event: WheelEvent){
        event.preventDefault();
        if(event.ctrlKey){
            // 縮放操作
            const deltaZoomLevel = -event.deltaY * this.camera.zoomLevel * 0.025;
            this.camera.setZoomLevelBy(deltaZoomLevel);
        } else {
            // 平移操作
            const diff = {x: event.deltaX, y: event.deltaY};
            const diffInWorld = this.camera.transformVector2WorldSpace(diff);
            this.camera.setPositionBy(diffInWorld);
        }
    }

    // 下略
}
```

基本上這樣就有簡單的縮放功能了，而且是觸控板跟滑鼠鍵盤一起完成。

你可以試用看看，可能會發現有哪裡怪怪的或是不如你預期的方式運作。

我會留到明天來揭曉～可以先思考看看！

那我們明天見吧！

