---
title: "Day 18 | 你不動我不動策略"
published: 2024-10-02
author: vee
seriesOrder: 20
---

<img src="day18-banner.png" alt="day 18 banner" class="image-shadow image-rounded" style="max-width: 100%; height: auto;" />

今天的內容有點像是支線，所以在實際改動你的 code 之前，可以先把這篇看完再決定要不要去跟著實作！

在 Day 04 | Canvas 你怎麼沒有反應？ 有稍微提到我們除了一直用 rAF(requestAnimationFrame) 去更新 context 最新的相機狀態以外，我們也可以在相機真的有平移、縮放、或是旋轉的時候才去重繪。

要達成這件事，我們這邊會應用 `Observer` 觀察者的設計模式，讓我們可以從外部知道相機的各種屬性什麼時候更新了。

我們先新增一個 `camera-observer.ts` 檔案在 `src` 裡面。

然後我們在 `camera-observer.ts` 裡面新增一個 `CameraObserver` 這個類別

`camera-observer.ts`
```typescript
class CameraObserver {

}
```

我們先定義三種不同屬性更新的 “事件” 應該要長什麼樣子。

我們當然可以直接傳給事件 handler 相機當下的屬性當作參數，這樣做其實也沒有什麼大問題，我也會直接傳這個當作其中一個參數。

只是我們也可以針對不同的“操作”去傳不同的參數給事件的 handler 。

就像是網頁中不同的 event handler 它收到的 event 參數也是不同的。

那我們先處理平移，我們先建立一個 `type` 是定義平移的 event detail。

另外我們加上也會當作參數傳給 handler 的相機屬性 `CameraState`

針對平移的部分可能 handler 最想知道的會是從哪裡移動到哪裡。

`camera-observer.ts`
```typescript
import { Point } from "./vector";

export type CameraState = {
    position: Point;
    zoomLevel: number;
    rotation: number;
}

export type PanEvent = {
    origin: Point;
    destination: Point;
}
```

接下來是縮放。

縮放的 handler 我認為最需要知道的資訊是從起始 縮放倍率 縮放到 終點縮放倍率。

`camera-observer.ts`
```typescript
// 略
export type ZoomEvent = {
    origin: number;
    destination: number;
}
// 略
```

最後一個是旋轉。

`camera-observer.ts`
```typescript
// 略
export type RotateEvent = {
    origin: number;
    destination: number;
}
// 略
```

這邊我們來把它們組合起來變成一個 `CameraEvent`。

`camera-observer.ts`
```typescript
export type CameraEvent = {
    "pan": PanEvent;
    "zoom": ZoomEvent;
    "rotate": RotateEvent;
} 
```

這邊主要也是為了 TypeScript 的部分，讓開發體驗可以好一點，可以有好的 autocomplete 體驗。

我們現在來定義 `CameraObserver` 裡面會需要的 call back list 的 type。就是當事件發生時，我們需要呼叫的回調函數們。

`camera-observer.ts`
```typescript
export type CallBackList<K extends keyof CameraEvent> = ((event: CameraEvent[K], cameraState: CameraState)=>void)[];
```

我們可以回到 `CameraObserver` 這個類別了。

先幫它增加一些 variable。 主要是不同 event 的 callback list。

`camera-observer.ts`
```typescript
class CameraObserver {

    private panCallBacks: CallBackList<"pan">;
    private zoomCallBacks: CallBackList<"zoom">;
    private rotateCallBacks: CallBackList<"rotate">;

    constructor(){
        this.panCallBacks = [];
        this.zoomCallBacks = [];
        this.rotateCallBacks = [];
    }

}
```

接下來我們需要開一個接口讓相機可以跟 `CameraObserver` 說狀態已經更新了。

`camera-observer.ts`
```typescript
class CameraObserver {

    // 略
    notifyPan(origin: Point, destination: Point, cameraState: CameraState){
        this.panCallBacks.forEach((panCallBack)=>{
            queueMicrotask(()=>{panCallBack({origin, destination}, cameraState)});
        });
    }

    notifyZoom(origin: number, destination: number, cameraState: CameraState){
        this.zoomCallBacks.forEach((zoomCallBack)=>{
            queueMicrotask(()=>{zoomCallBack({origin, destination}, cameraState);});
        });
    }

    notifyRotate(origin: number, destination: number, cameraState: CameraState){
        this.rotateCallBacks.forEach((rotateCallBack)=>{
            queueMicrotask(()=>{rotateCallBack({origin, destination}, cameraState)});
        });
    }
    // 略

}
```

然後我們就可以開放讓外部訂閱這些 event 了。

我們也可以在外部訂閱的同時回傳給它們取消訂閱的 function 。

我們把它定義成 `Unsubscribe`

`camera-observer.ts`
```typescript
export type Unsubscribe = () => void;
```

`camera-observer.ts`
```typescript
class CameraObserver {

    // 略
    on<K extends keyof CameraEvent>(eventName: K, callback: (event: CameraEvent[K], cameraState: CameraState)=>void): Unsubscribe {
        switch (eventName){
        case "pan":
            this.panCallBacks.push(callback as (event: CameraEvent["pan"], cameraState: CameraState)=>void);
            return ()=>{this.panCallBacks = this.panCallBacks.filter((cb) => cb !== callback)};
        case "zoom":
            this.zoomCallBacks.push(callback as (event: CameraEvent["zoom"], cameraState: CameraState)=>void);
            return ()=>{this.zoomCallBacks = this.zoomCallBacks.filter((cb) => cb !== callback)};
        case "rotate":
            this.rotateCallBacks.push(callback as (event: CameraEvent["rotate"], cameraState: CameraState)=>void);
            return ()=>{this.rotateCallBacks = this.rotateCallBacks.filter((cb) => cb !== callback)};
        }
        return ()=>{};
    }
    // 略
}
```

這樣外部在呼叫 `on` 的時候就可以針對不同的 event 可以有提示傳入 callback 的參數會有哪些。

`camera-observer.ts` 到這邊就差不多了，最後我們只需要 export `CameraObserver` 就好。

`camera-observer.ts`
```typescript
export { CameraObserver };
```

接下來我們回到 `camera.ts` 去在狀態改變的時候呼叫 `CameraObserver` 讓它去通知。

我們要先加一個 `cameraObserver` 的 variable 給 `camera` 

記得也要先 import `CameraObserver` 喔。

`camera.ts`
```typescript
import { CameraObserver } from "./camera-observer"

class Camera {
    // 略

    private _cameraObserver: CameraObserver;

    constructor(viewPortWidth: number = 500, viewPortHeight: number = 500, positionBoundary: PositionBoundary = {min: {x: -1000, y: -1000}, max: {x: 1000, y: 1000}}, zoomLevelBoundary: ZoomLevelBoundary = {min: 0.1, max: 10}){
        this._position = {x: 0, y: 0};
        this._zoomLevel = 1; // 縮放程度不能夠小於或是等於 0 這個原因會在後續章節介紹。
        this._rotation = 0;
        this._positionBoundary = positionBoundary;
        this.viewPortWidth = viewPortWidth;
        this.viewPortHeight = viewPortHeight;
        this.limitEntireViewPort = true;
        this._zoomLevelBoundary = zoomLevelBoundary;
        this._cameraObserver = new CameraObserver();
    }

    // 略
}
```

之後我們到 `setPosition` 、 `setRotation` 、 `setZoomLevel` 裡面各自呼叫相對應的 `notfiy` function 。

`camera.ts`
```typescript
class Camera {
    // 略
    
    // 改變相機位置時
    setPosition(position: Point){
        if(this.limitEntireViewPort && !viewPortWithinPositionBoundary(this.viewPortWidth, this.viewPortHeight, destination, this._zoomLevel, this._rotation, this._positionBoundary)){
            return;
        }
        if(!withinPositionBoundary(destination, this._positionBoundary)){
            return;
        }
        const origin = {...this._position};
        this._position = destination;
        // 當相機位置真的有改變時，跟觀察者說我已經更新了
        this._cameraObserver.notifyPan(origin, {...this._position}, {position: {...this._position}, zoomLevel: this._zoomLevel, rotation: this._rotation});
    }
    
    // 改變相機縮放倍率時
    setZoomLevel(zoomLevel: number){
        if(!withinZoomLevelBoundary(targetZoom, this._zoomLevelBoundary)){
            return;
        }
        const origin = this._zoomLevel;
        this._zoomLevel = targetZoom;
        // 當相機縮放倍率真的有改變時，跟觀察者說我已經更新了
        this._cameraObserver.notifyZoom(origin, this._zoomLevel, {postion: {...this._position}, zoomLevel: this._zoomLevel, rotation: this._rotation});
    }
    
    // 改變相機旋轉角度時
    setRotation(rotation: number){
        if(this._rotationBoundary != undefined && !rotationWithinBoundary(rotation, this._rotationBoundary)){
            return;
        }
        const origin = this._rotation;
        this._rotation = normalizedAngle(rotation);
        // 當相機旋轉角度真的有改變時，跟觀察者說我已經更新了
        this._cameraObserver.notifyRotate(origin, this._rotation, {position: {...this._position}, zoomLevel: this._zoomLevel, rotation: this._rotation});
    }

    // 略
}
```

接下來我們開個 getter 給 `_cameraObserver` 因為我們在 constructor 就把 `CameraObserver` 建立起來了，所以沒有留給外面有機會可以訂閱。

當然你也可以在 `Camera` 裡面直接給一個把 `CameraObserver` 的 `on` 包起來的 `on` ，這邊就留給大家自己決定。

`camera.ts`
```typescript
class Camera {
    // 略
    get cameraObserver(): CameraObserver {
        return this._cameraObserver;
    }
    // 略
}
```

這樣我們就可以在 `main.ts` 使用一下這個訂閱了。

我先用簡單的 handler 示範一下。

`main.ts`
```typescript
// 略

camera.Observer.on("pan", (event, cameraState)=>{
    const diff = {x: event.destination.x - event.origin.x, y: event.destination.y - event.origin.x};
    console.log("Panned Distance:", diff);
    console.log("Camera State:", cameraState);
});

// 略
```

就有點像是 `addEventListener` 的感覺。

接下來我們就可以把 `requestAnimationFrame` 替換掉。

我們把 `main.ts` 的所有 `window.requestAnimationFrame(step)` 都拿掉。

接下來用一樣的方式訂閱一下相機的動靜。

在相機有動靜的時候重繪。呼叫 `step` 這個 function 。

不過這樣就不會有需要去計算重繪之間的時間差，因為時間差對我們來說就沒有用處了。所以我在 step 裡面傳 0 當作暫時的參數。

`main.ts`
```typescript
camera.Observer.on("pan", (event, cameraState)=>{
    step(0);
})
```

不過這樣就是只有平移有吃到重繪，剩下的縮放跟旋轉就交給大家自行去訂閱了。

今天的篇章主要是提供給大家另外一個方法可以去實現無限畫布的重繪，讓大家探索一下不同的可能性，系列之後的文章會回到使用 `requestAnimationFrame`。

不過今天實作的 `CameraObserver` 這個部分因為可以有其他功用所以會持續留在 `Camera` 裡面。

今天的進度在[這裡](https://github.com/niuee/infinite-canvas-tutorial/tree/Day18)

那今天就到這邊！我們明天見。

