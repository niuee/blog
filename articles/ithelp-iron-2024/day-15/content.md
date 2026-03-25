---
title: "Day 15 | 觸控 Zoooom"
published: 2024-09-29
author: vee
seriesOrder: 17
---

<img src="day15-banner.png" alt="day 15 banner" class="image-shadow image-rounded" style="max-width: 100%; height: auto;" />

今天我們要來講解觸控的縮放！

我們先來看一下之前實作觸控平移的時候用的 `touch-input.ts`。

`touch-input.ts`
```typescript
class TouchInput {

    private panStartPoint: Point;
    private isPanning: boolean;

    constructor(){
        this.panStartPoint = {x: 0, y: 0};
        this.isPanning = false;
    }

    touchstartHandler(event: TouchEvent){
        if(event.targetTouches.length == 1){
            this.panStartPoint = {x: event.targetTouches[0].clientX, y: event.targetTouches[0].clientY};
            this.isPanning = true;
        }
    }

    touchmoveHandler(event: TouchEvent) {
        if(this.isPanning && event.targetTouches.length == 1){
            const curTouchPoint = {x: event.targetTouches[0].clientX, y: event.targetTouches[0].clientY};
            const diff = vectorSubtraction(curTouchPoint, this.panStartPoint);
            const diffInWorld = this.camera.transfromVector2WorldSpace(diff);
            this.camera.setPositionBy(diffInWorld);
            this.panStartPoint = curTouchPoint;
        }
    }

    touchendHandler(event: TouchEvent) {
        this.isPanning = false;
    }

    touchcancelHandler(event: TouchEvent) {
        this.isPanning = false;
    }
}
```

在觸控縮放的部分，我們要實作的邏輯是 pinch to zoom。類似觸控板的操作，用兩隻手指頭去捏或是擴大來縮放。

因為這個手勢比較複雜，所以我們來拆解一下。

當我們一開始得到觸控的事件觸發時，我們需要檢查一下是不是兩隻手指的觸控。

然後我們需要紀錄這兩隻手指觸控的點。

接下來當這兩隻手指頭開始移動時，我們需要檢查是不是兩隻手指的距離變長還是變短了。

看是變長還是變短我們需要放大或是縮小。

流程大概就是這樣。

我們一步一步來。

先來捕捉一下觸控 `touchstart` 被兩隻手指出發的時候。

如果先前已經有觸發一隻指頭的 `touchstart` 會造成平移模式被啟動。

我們要先解除平移模式。

`touch-input.ts`
```typescript
class TouchInput {

    // 上略

    touchstartHandler(event: TouchEvent){
        if(event.targetTouches.length == 1){
            this.panStartPoint = {x: event.targetTouches[0].clientX, y: event.targetTouches[0].clientY};
            this.isPanning = true;
        } else if (event.targetTouches.length == 2){
            this.isPanning = false;
        }
    }

    // 下略
}
```

接下來我們要紀錄初始的兩個手指的觸控點。

這裏我們要向平移那樣先在 `TouchInput` 類別加上一個 variable `initialTouchDistance`

`touch-input.ts`
```typescript
class TouchInput {

    // 上略
    private initialTouchDistance: number;

    constructor(camera: Camera){
        this.camera = camera;
        this.panStartPoint = {x: 0, y: 0};
        this.isPanning = false;
        this.initialTouchDistance = 0;
        this.touchstartHandler = this.touchstartHandler.bind(this);
        this.touchmoveHandler = this.touchmoveHandler.bind(this);
        this.touchendHandler = this.touchendHandler.bind(this);
        this.touchcancelHandler = this.touchcancelHandler.bind(this);
    }

    touchstartHandler(event: TouchEvent){
        if(event.targetTouches.length == 1){
            this.panStartPoint = {x: event.targetTouches[0].clientX, y: event.targetTouches[0].clientY};
            this.isPanning = true;
        } else if (event.targetTouches.length == 2){
            this.isPanning = false;
        }
    }

    // 下略
}
```

接下來我們來計算初始的兩隻手指頭之間的距離。我們先從 `vector` import `magnitude`

`touch-input.ts`
```typescript
import { Point, vectorSubtraction, magnitude } from "./vector";
```

然後我們在 `touchmoveHandler` 裡面計算一下兩點的距離。

`touch-input.ts`
```typescript
class TouchInput {

    // 上略
    private initialTouchDistance: number;

    constructor(camera: Camera){
        this.camera = camera;
        this.panStartPoint = {x: 0, y: 0};
        this.isPanning = false;
        this.initialTouchDistance = 0;
    }

    touchstartHandler(event: TouchEvent){
        if(event.targetTouches.length == 1){
            this.panStartPoint = {x: event.targetTouches[0].clientX, y: event.targetTouches[0].clientY};
            this.isPanning = true;
        } else if (event.targetTouches.length == 2){
            this.isPanning = false;
            const startPoint = {x: event.targetTouches[0].clientX, y: event.targetTouches[0].clientY};
            const endPoint = {x: event.targetTouches[1].clientX, y: event.targetTouches[1].clientY};
            const curDistance = magnitude(vectorSubtraction(endPoint, startPoint));
        }
    }

    // 下略
}
```

接下來我們要來在 `touchmoveHandler` 裡面去計算兩隻手指移動過後的距離。

然後計算它跟 `initialTouchDistance` 的差距。

這個差距就是我們要拿來計算縮放倍率的。

`touch-input.ts`
```typescript
class TouchInput {

    // 上略
    private initialTouchDistance: number;

    constructor(camera: Camera){
        this.camera = camera;
        this.panStartPoint = {x: 0, y: 0};
        this.isPanning = false;
        this.initialTouchDistance = 0;
    }

    touchstartHandler(event: TouchEvent){
        if(event.targetTouches.length == 1){
            this.panStartPoint = {x: event.targetTouches[0].clientX, y: event.targetTouches[0].clientY};
            this.isPanning = true;
        } else if (event.targetTouches.length == 2){
            this.isPanning = false;
            this.initialTouchDistance = magnitude(vectorSubtraction({x: event.targetTouches[0].clientX, y: event.targetTouches[0].clientY}, {x: event.targetTouches[1].clientX, y: event.targetTouches[1].clientY}));
        }
    }

    touchmoveHandler(event: TouchEvent) {
        if(this.isPanning && event.targetTouches.length == 1){
            const curTouchPoint = {x: event.targetTouches[0].clientX, y: event.targetTouches[0].clientY};
            const diff = vectorSubtraction(curTouchPoint, this.panStartPoint);
            const diffInWorld = this.camera.transfromVector2WorldSpace(diff);
            this.camera.setPositionBy(diffInWorld);
            this.panStartPoint = curTouchPoint;
        } else if(event.targetTouches.length == 2){
            const startPoint = {x: event.targetTouches[0].clientX, y: event.targetTouches[0].clientY};
            const endPoint = {x: event.targetTouches[1].clientX, y: event.targetTouches[1].clientY};
            const curDistance = magnitude(vectorSubtraction(endPoint, startPoint));
            const diff = curDistance - this.initialTouchDistance;
        }
    }

    // 下略
}
```

有了差距之後我們就可以計算縮放倍率要怎麼改變。

這邊我們還差一個東西，就是我們如果希望觸控的縮放不是只有在視窗的中心點縮放的話，我們需要找出那個縮放的錨點。

在這邊我選擇兩隻手指頭連成線後的中心點。

要算出兩個手指頭的觸控點的中心點，我們會需要用到之前找兩線段交點有用到的 `linearInterpolation`，利用線性插值直接找尋兩個點的中心點。

要記得也要 import 一下

`touch-input.ts`
```typescript
// 略

import { Point, vectorSubtraction, magnitude, linearInterpolation } from "./vector";

// 略
class TouchInput {

    // 上略

    touchmoveHandler(event: TouchEvent) {
        if(this.isPanning && event.targetTouches.length == 1){
            const curTouchPoint = {x: event.targetTouches[0].clientX, y: event.targetTouches[0].clientY};
            const diff = vectorSubtraction(curTouchPoint, this.panStartPoint);
            const diffInWorld = this.camera.transfromVector2WorldSpace(diff);
            this.camera.setPositionBy(diffInWorld);
            this.panStartPoint = curTouchPoint;
        } else if(event.targetTouches.length == 2){
            const startPoint = {x: event.targetTouches[0].clientX, y: event.targetTouches[0].clientY};
            const endPoint = {x: event.targetTouches[1].clientX, y: event.targetTouches[1].clientY};
            const curDistance = magnitude(vectorSubtraction(endPoint, startPoint));
            const diff = curDistance - this.initialTouchDistance;
            const midPoint = linearInterpolation(startPoint, endPoint, 0.5);
        }
    }
    
    // 下略
}

```

取得這個中心點之後，我們需要把這個點轉換成世界座標系。

因為轉換座標系會需要有 canvas 的位置所以我們需要把 `canvas` 也放進來

`touch-input.ts`
```typescript
class TouchInput {
    // 上略
    private canvas: HTMLCanvasElement;

    constructor(camera: Camera, canvas: HTMLCanvasElement){
        this.camera = camera;
        this.panStartPoint = {x: 0, y: 0};
        this.isPanning = false;
        this.initialTouchDistance = 0;
        this.canvas = canvas;
        this.touchstartHandler = this.touchstartHandler.bind(this);
        this.touchmoveHandler = this.touchmoveHandler.bind(this);
        this.touchendHandler = this.touchendHandler.bind(this);
        this.touchcancelHandler = this.touchcancelHandler.bind(this);
    }

    // 下略 
}
```

記得也要去 `main.ts` 裡面更新一下 `TouchInput` 傳入的參數。

```typescript
const touchInput = new TouchInput(camera, canvas);
```

接下來我們也是如法炮製。把 `midPoint` 轉換成世界座標系。

然後把根據兩隻手指頭距離的差別，調整相機的縮放。

調整完相機的縮放之後，再計算一次滑鼠游標在世界座標系的差別，之後把相機的位置平移去彌補這個差距。

這邊我也多加一個新的 variable `ZOOM_SENSATIVITY` 來控制觸控縮放的敏感度。

`touch-input.ts`
```typescript
class TouchInput {

    private ZOOM_SENSATIVITY: number = 0.005

    // 上略

    touchmoveHandler(event: TouchEvent) {
        if(this.isPanning && event.targetTouches.length == 1){
            const curTouchPoint = {x: event.targetTouches[0].clientX, y: event.targetTouches[0].clientY};
            const diff = vectorSubtraction(curTouchPoint, this.panStartPoint);
            const diffInWorld = this.camera.transfromVector2WorldSpace(diff);
            this.camera.setPositionBy(diffInWorld);
            this.panStartPoint = curTouchPoint;
        } else if(event.targetTouches.length == 2){
            const startPoint = {x: event.targetTouches[0].clientX, y: event.targetTouches[0].clientY};
            const endPoint = {x: event.targetTouches[1].clientX, y: event.targetTouches[1].clientY};
            const curDistance = magnitude(vectorSubtraction(endPoint, startPoint));
            const diff = curDistance - this.initialDistance;
            const midPoint = linearInterpolation(startPoint, endPoint, 0.5);
            const boundingBox = this.canvas.getBoundingClientRect();
            const topLeftCorner = {x: boundingBox.left, y: boundingBox.top};
            const viewPortCenter = {x: topLeftCorner.x + this.canvas.width / 2, y: topLeftCorner.y + this.canvas.height / 2};
            const midPointInViewPortSpace = {x: midPoint.x - viewPortCenter.x, y: midPoint.y - viewPortCenter.y};
            const midPointInWorldSpace = this.camera.transformViewPort2WorldSpace(midPointInViewPortSpace);
            const deltaZoomLevel = diff * 0.1 * this.camera.zoomLevel * this.ZOOM_SENSATIVITY;
            this.camera.setZoomLevelBy(deltaZoomLevel);
            const midPointInWorldSpacePostZoom = this.camera.transformViewPort2WorldSpace(midPointInViewPortSpace);
            const deltaPosition = vectorSubtraction(midPointInWorldSpacePostZoom, midPointInWorldSpace);
            this.camera.setPositionBy(deltaPosition);
        }
    }
    
    // 下略
}

```

沒錯，觸控的縮放大概就是這樣！

今天的進度在[這裡](https://github.com/niuee/infinite-canvas-tutorial/tree/Day15)

那我們明天見！

