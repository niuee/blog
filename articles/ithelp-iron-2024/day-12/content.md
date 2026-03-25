---
title: "Day 12 | 鉗制平移"
published: 2024-09-26
author: vee
seriesOrder: 12
---

<img src="day12-banner.png" alt="day 12 banner" class="image-shadow image-rounded" style="max-width: 100%; height: auto;" />

在 Day 06 的時候有提到，我們在實作的 "無限畫布" 實際上並不是真的無限，而是很大很～大的畫布而已。

既然畫布不是真的無限，那相機應該也不可能無限制的平移吧？

沒錯！所以我們今天會在相機身上加上一個平移位置的限制。讓相機平移到一定的程度之後，再下去的平移也不會對相機造成影響。

這裡我們需要一個新增一個 `positionBoundary` 的 class variable 在 `Camera` 上面。

首先我們先定義一個 type `PositionBoundary`。

在 `camera.ts` 裡面，或是你想要自己開新的檔案也都可以。

`camera.ts`
```typescript
export type PositionBoundary = {
    min: Point;
    max: Point;
}
```

接下來我們在 `Camera` 裡面新加入一個 variable `positionBoundary` 。

我們在 `Camera` 的建構子裡面提供一個預設值給 `positionBoundary`。

`camera.ts`
```typescript
class Camera {

    // 略
    private _positionBoundary: PositionBoundary;

    constructor(positionBoundary: PositionBoundary = {min: {x: -1000, y: -1000}, max: {x: 1000, y: 1000}}){
        this._position = {x: 0, y: 0};
        this._rotation = 0;
        this._zoomLevel = 1;
        this._positionBoundary = positionBoundary;
    }

    // 略
}
```

接下來我們要在 `setPosition` 這個 `Camera` 的 method 裡面加上檢查目的地是否在目前設置的範圍內。

我們可以先在外面寫一個 helper function `withinPositionBoundary`。

`camera.ts`
```typescript
function withinPositionBoundary(destination: Point, positionBoundary: PositionBoundary): boolean {
    if(destination.x > positionBoundary.max.x || destination.x < positionBoundary.min.x){
        return false;
    }
    if(destination.y > positionBoundary.max.y || destination.y < positionBoundary.min.y){
        return false;
    }
    return true;
}
```

然後我們可以加進去 `setPosition` 裡面，如果 `destination` 超過相機允許的範圍就不移動到 `destination` 直接 return。

`camera.ts`
```typescript
class Camera {

    // 略
    setPosition(destination: Point){
        if(!withinPositionBoundary(destination, this._positionBoundary)){
            return;
        }
        this._position = destination;
    }
    // 略
}
```

這樣子相機基本上就不會被平移超出訂下的範圍。

不過這個限制只有施加在相機的位置，準確來說是相機視窗的中心點，相機的視窗如果有其他角落或是範圍是落在限制範圍外的，這個檢查並不會檢查到。

今天的前半部會專注在限制相機視窗的中心點，後半部會專注在限制整個相機視窗。

那我們開始吧！

### 限制相機中心
因為我們目前的實作都是給定一個差距，然後跟相機說，欸你就朝這個方向移動這麼多喔。

如果這個差距是會讓相機移動到範圍外，那這個操作就會被忽略掉。

在短距離的差距情況下可能影響還不會很大，但是如果是長距離的移動那就會差很多了。

想像一下當你在相機還是原點的時候，你手指咻一下，一次滑了很長的距離，但是畫面上看起來根本什麼都沒有變，於是你瘋狂再次移動，但是畫面還是都沒變。

壞了，不玩了。大概會有這種反應吧。

通常，通常啦，使用者的期望應該會比較像是，我有滑了，所以你應該要動，如果我有滑超過範圍的距離，你就自己到界限的時候停下來就好。

所以我們這個實作還差一部分，就是判斷使用者期望的 delta 有多少會是有效的移動距離，我們只讓相機移動那麼多就好，剩下的就捨棄。

這聽起來很像 clamping 對吧！沒錯，我們就是要實作 clamping。

如上圖所示，我們就是要讓相機可以移動到被邊界限制切掉的那個點，我們要到極限！

那就來吧！

判斷交集點的篇幅因為真的太長了，我把它放在它新的文章 Day 12a | 判斷交集點。

這邊會接著下去沿用交集點的結果，各位也可以跳過 Day 12a 然後直接去 Day 12a 的後面拿成果。

好的，那我先講解一個更簡單的 clamping 方式。就是“沒超過的我全拿，超過的就拿最大（或最小）”。

這是一個比較直覺的也比較容易計算的 clamping 方式。大部分的場景都可以適用，有些很極端的例子會讓使用者操作體驗有一些不同。

那我們就直接來吧！

在 `camera.ts` 裡面加入一個新的 function。

`camera.ts`
```typescript
export function simpleClamping(destination: Point, positionBoundary: PositionBoundary): Point {
    if(withinPositionBoundary(destination, positionBoundary)){
        return destination;
    }

    const res = {...destination};

    res.x = Math.min(res.x, positionBoundary.max.x);
    res.x = Math.max(res.x, positionBoundary.min.x);

    res.y = Math.min(res.y, positionBoundary.max.y);
    res.y = Math.max(res.y, positionBoundary.min.y);

    return res;
}
```

沒錯，就是這麼簡單。

可以直接套用在 `Camera` 類別裡面。

注意！是 `setPositionBy` 不是 `setPosition` 喔。因為我們在 setPosition 如果超過相機的許可邊界會直接回傳動都不會動，算是最後一道 validation 防線，目前我不希望去動到它。

`camera.ts`
```typescript
class Camera {

    // 略
    setPositionBy(offset: Point){
        const destination = vectorAddition(this._position, offset);
        const clampedDestination = simpleClamping(destination, this._positionBoundary);
        this.setPosition(clampedDestination);
    }
    // 略
}
```

這樣就完成非常簡單的 clamping 了。

使用者就可以移動到極限了。

接下來是使用 Day 12a 的兩線段交點來實作複雜一點的 clamping。(我發現 12a 一篇文章根本放不下，所以我把 12a 的內容另外搬出來了，另外大家也可以直接去看 github Day 12 的原始碼，因為我發現那個東西應該很少人會真的去看 xD 。)

首先我們也是來把原本就在範圍內的目的地返回。

`camera.ts`
```typescript
export function clampingV2(origin: Point, destination: Point, positionBoundary: PositionBoundary): Point {
    if (withinPositionBoundary(destination, positionBoundary)){
        return destination;
    }
}
```

接下來，我們把邊界拉出來變成四個角落。

`camera.ts`
```typescript
export function clampingV2(origin: Point, destination: Point, positionBoundary: PositionBoundary): Point {
    if (withinPositionBoundary(destination, positionBoundary)){
        return destination;
    }

    const topRight = {x: positionBoundary.max.x, y: positionBoundary.max.y};
    const bottomRight = {x: positionBoundary.max.x, y: positionBoundary.min.y};
    const topLeft = {x: positionBoundary.min.x, y: positionBoundary.max.y};
    const bottomLeft = {x: positionBoundary.min.x, y: positionBoundary.min.y};

}
```

接著我們來比較一下目的地在邊界的哪裡會有超過的現象。

`camera.ts`
```typescript
export function clampingV2(origin: Point, destination: Point, positionBoundary: PositionBoundary): Point {
    if (withinPositionBoundary(destination, positionBoundary)){
        return destination;
    }

    const topRight = {x: boundaries.max.x, y: boundaries.max.y};
    const bottomRight = {x: boundaries.max.x, y: boundaries.min.y};
    const topLeft = {x: boundaries.min.x, y: boundaries.max.y};
    const bottomLeft = {x: boundaries.min.x, y: boundaries.min.y};

    const surpassedTop = destination.y > topLeft.y;
    const surpassedRight = destination.x > topRight.x;
    const surpassedBottom = destination.y < bottomRight.y;
    const surpassedLeft = destination.x < bottomLeft.x;
}

```

再來我們把 `destination` 展開給 `manipulatePoint`。

`camera.ts`
```typescript
export function clampingV2(origin: Point, destination: Point, positionBoundary: PositionBoundary): Point {
    if (withinPositionBoundary(destination, positionBoundary)){
        return destination;
    }

    const topRight = {x: boundaries.max.x, y: boundaries.max.y};
    const bottomRight = {x: boundaries.max.x, y: boundaries.min.y};
    const topLeft = {x: boundaries.min.x, y: boundaries.max.y};
    const bottomLeft = {x: boundaries.min.x, y: boundaries.min.y};

    const surpassedTop = destination.y > topRight.y;
    const surpassedRight = destination.x > topRight.x;
    const surpassedBottom = destination.y < bottomRight.y;
    const surpassedLeft = destination.x < bottomLeft.x;

    let manipulatePoint = {...destination};
}
```

然後我們先處理四個端點的場合。

`camera.ts`
```typescript
export function clampingV2(origin: Point, destination: Point, positionBoundary: PositionBoundary): Point {
    if (withinPositionBoundary(destination, positionBoundary)){
        return destination;
    }

    const topRight = {x: boundaries.max.x, y: boundaries.max.y};
    const bottomRight = {x: boundaries.max.x, y: boundaries.min.y};
    const topLeft = {x: boundaries.min.x, y: boundaries.max.y};
    const bottomLeft = {x: boundaries.min.x, y: boundaries.min.y};

    const surpassedTop = destination.y > topRight.y;
    const surpassedRight = destination.x > topRight.x;
    const surpassedBottom = destination.y < bottomRight.y;
    const surpassedLeft = destination.x < bottomLeft.x;

    let manipulatePoint = {x: destination.x, y: destination.y};

    if(surpassedTop && surpassedRight){
        console.log("top right");
        return topRight;
    }
    if(surpassedTop && surpassedLeft){
        console.log("top left");
        return topLeft;
    }
    if(surpassedBottom && surpassedRight){
        console.log("bottom right");
        return bottomRight;
    }
    if(surpassedBottom && surpassedLeft){
        console.log("bottom left");
        return bottomLeft;
    }
}
```

接下來我們就可以處理 `origin` 連到 `destination` 會跟邊界交叉的場合。

我們先定義兩個 variable `boundaryStart` 跟 `boundaryEnd`。並且用右邊的邊界去做初始值。

然後根據不同的場合去更新 `boundaryStart` 與 `boundaryEnd`。

`camera.ts`
```typescript
export function clampingV2(origin: Point, destination: Point, positionBoundary: PositionBoundary): Point {
    if (withinPositionBoundary(destination, positionBoundary)){
        return destination;
    }

    const topRight = {x: boundaries.max.x, y: boundaries.max.y};
    const bottomRight = {x: boundaries.max.x, y: boundaries.min.y};
    const topLeft = {x: boundaries.min.x, y: boundaries.max.y};
    const bottomLeft = {x: boundaries.min.x, y: boundaries.min.y};

    const surpassedTop = destination.y > topRight.y;
    const surpassedRight = destination.x > topRight.x;
    const surpassedBottom = destination.y < bottomRight.y;
    const surpassedLeft = destination.x < bottomLeft.x;

    let manipulatePoint = {x: destination.x, y: destination.y};

    if(surpassedTop && surpassedRight){
        console.log("top right");
        return topRight;
    }
    if(surpassedTop && surpassedLeft){
        console.log("top left");
        return topLeft;
    }
    if(surpassedBottom && surpassedRight){
        console.log("bottom right");
        return bottomRight;
    }
    if(surpassedBottom && surpassedLeft){
        console.log("bottom left");
        return bottomLeft;
    }
    let boundaryStart = bottomRight;
    let boundaryEnd = topRight;
    
    if(surpassedTop){
        boundaryStart = topLeft;
        boundaryEnd = topRight;
    } else if(surpassedBottom){
        boundaryStart = bottomLeft;
        boundaryEnd = bottomRight;
    } else if(surpassedLeft){
        boundaryStart = bottomLeft;
        boundaryEnd = topLeft;
    }
}
```

然後我們就可以去判斷交叉並且根據交叉點的結果去取結果。

記得要先去 import `getLineSegmentIntersection`。(這個 function 要在[另外一篇文章](https://ithelp.ithome.com.tw/articles/10342981)找到，不過可以去 [GitHub `vector.ts`](https://github.com/niuee/infinite-canvas-tutorial/blob/Day12/src/vector.ts) 直接從第 39 行開始直接複製全部。)

`camera.ts`
```typescript
import { Point, multiplyByScalar, rotateVector, vectorAddition, vectorSubtraction, getLineSegmentIntersection } from "./vector";
```

`camera.ts`
```typescript
export function clampingV2(origin: Point, destination: Point, positionBoundary: PositionBoundary): Point {
    if (withinPositionBoundary(destination, positionBoundary)){
        return destination;
    }

    const topRight = {x: boundaries.max.x, y: boundaries.max.y};
    const bottomRight = {x: boundaries.max.x, y: boundaries.min.y};
    const topLeft = {x: boundaries.min.x, y: boundaries.max.y};
    const bottomLeft = {x: boundaries.min.x, y: boundaries.min.y};

    const surpassedTop = destination.y > topRight.y;
    const surpassedRight = destination.x > topRight.x;
    const surpassedBottom = destination.y < bottomRight.y;
    const surpassedLeft = destination.x < bottomLeft.x;

    let manipulatePoint = {x: destination.x, y: destination.y};

    if(surpassedTop && surpassedRight){
        console.log("top right");
        return topRight;
    }
    if(surpassedTop && surpassedLeft){
        console.log("top left");
        return topLeft;
    }
    if(surpassedBottom && surpassedRight){
        console.log("bottom right");
        return bottomRight;
    }
    if(surpassedBottom && surpassedLeft){
        console.log("bottom left");
        return bottomLeft;
    }
    let boundaryStart = bottomRight;
    let boundaryEnd = topRight;
    
    if(surpassedTop){
        boundaryStart = topLeft;
        boundaryEnd = topRight;
    } else if(surpassedBottom){
        boundaryStart = bottomLeft;
        boundaryEnd = bottomRight;
    } else if(surpassedLeft){
        boundaryStart = bottomLeft;
        boundaryEnd = topLeft;
    }

    const res = getLineSegmentIntersection(origin, destination, boundaryStart, boundaryEnd);
    if(!res.intersects){
        throw new Error("should have intersection but cannot calculate one");
    }
    switch(res.intersections.intersectionType){
    case "point":
        manipulatePoint = {...res.intersections.intersectionPoint};
        break;
    case "interval":
        manipulatePoint = {...res.intersections.intervalEndPoint};
        break;
    default:
        throw new Error("with intersections but the type is unknown");
    }
    return manipulatePoint;
}
```

接下來我們可以去 `Camera` 類別把 `setPositionBy` 的 clamp 換成新的。

`camera.ts`
```typescript
class Camera {

    // 略
    setPositionBy(offset: Point){
        const destination = vectorAddition(this._position, offset);
        const clampedDestination = clampingV2(this._position, destination, this._positionBoundary);
        this.setPosition(clampedDestination);
    }
    // 略
}
```

你可以選擇兩個裡面你覺得比較適合的 clamping 方法，或是也可以根據自己的理解跟想像去實作符合你的操作邏輯與體驗的 clamping！

### 限制整個相機視窗

要限制整個相機視窗就是要確保相機視窗的四個角落都不會落在邊界外面。

這邊就需要用到我們前幾天講到的座標系的轉換。

首先要限制整個視窗我們就必須要有整個視窗。（好像廢話 xD）

所以我們要先定義一個相機的視窗大小，我們先去 `Camera` 類別加上 `viewPortWidth` 跟 `viewPortHeight` 兩個 variable。

`camera.ts`
```typescript
class Camera {
    // 略
    public viewPortWidth: number;
    public viewPortHeight: number;

    constructor(viewPortWidth: number = 500, viewPortHeight: number = 500, positionBoundary: PositionBoundary = {min: {x: -1000, y: -1000}, max: {x: 1000, y: 1000}}){
        this._position = {x: 0, y: 0};
        this._rotation = 0;
        this._zoomLevel = 1;
        this._positionBoundary = positionBoundary;
        this.viewPortWidth = viewPortWidth;
        this.viewPortHeight = viewPortHeight;
    }

    // 略

}
```

再來我們先把 `transformViewPort2WorldSpace` 的邏輯拉出來 `Camera` 之外。

把這個拉出來的 function 叫做 `transformViewPort2WorldSpaceWithCameraAttributes`

`camera.ts`
```typescript
function transformViewPort2WorldSpaceWithCameraAttributes(point: Point, cameraPosition: Point, cameraZoomLevel: number, cameraRotation: number): Point{
    const scaledBack = multiplyByScalar(point, 1 / cameraZoomLevel);
    const rotatedBack = rotateVector(scaledBack, cameraRotation);
    const withOffset = vectorAddition(rotatedBack, cameraPosition);
    return withOffset;
}

class Camera {

    // 上略

    transformViewPort2WorldSpace(point: Point): Point {
        const scaledBack = multiplyByScalar(point, 1 / this._zoomLevel);
        const rotatedBack = rotateVector(scaledBack, this._rotation);
        const withOffset = vectorAddition(rotatedBack, this._position);
        return withOffset;
    }

    // 下略
}
```

然後把 `Camera` 類別裡面的 `transformViewPort2WorldSpace` 稍微改一下變成使用 `transformViewPort2WorldSpaceWithCameraAttributes`。

`camera.ts`
```typescript
function transformViewPort2WorldSpaceWithCameraAttributes(point: Point, cameraPosition: Point, cameraZoomLevel: number, cameraRotation: number): Point{
    const scaledBack = multiplyByScalar(point, 1 / cameraZoomLevel);
    const rotatedBack = rotateVector(scaledBack, cameraRotation);
    const withOffset = vectorAddition(rotatedBack, cameraPosition);
    return withOffset;
}

class Camera {

    // 上略

    transformViewPort2WorldSpace(point: Point): Point {
        return transformViewPort2WorldSpaceWithCameraAttributes(point, this._position, this._zoomLevel, this._rotation);
    }

    // 下略
}
```

這樣雖然多包了一層，但因為我們之後會用到兩三次所以我覺得是一個我可以接受的 trade off。

接下來我們來做視窗的角落檢查。

我們先在 `Camera` 類別外面新增一個 helper function `viewPortWithinPositionBoundary`。

`camera.ts`
```typescript
function viewPortWithinPositionBoundary(viewPortWidth: number, viewPortHeight: number, cameraPosition: Point, cameraZoomLevel: number, cameraRotation: number, positionBoundary: PositionBoundary): boolean {
    const topLeftCorner = {x: -viewPortWidth / 2, y: viewPortHeight / 2};
    const topRightCorner = {x: viewPortWidth / 2, y: viewPortHeight / 2};
    const bottomLeftCorner = {x: -viewPortWidth / 2, y: -viewPortHeight / 2};
    const bottomRightCorner = {x: viewPortWidth / 2, y: -viewPortHeight / 2};
    
    const topLeftCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(topLeftCorner, cameraPosition, cameraZoomLevel, cameraRotation);
    const topRightCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(topRightCorner, cameraPosition, cameraZoomLevel, cameraRotation);
    const bottomLeftCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(bottomLeftCorner, cameraPosition, cameraZoomLevel, cameraRotation);
    const bottomRightCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(bottomRightCorner, cameraPosition, cameraZoomLevel, cameraRotation);
    
    return withinPositionBoundary(topLeftCornerTransformed, positionBoundary) && withinPositionBoundary(topRightCornerTransformed, positionBoundary) && withinPositionBoundary(bottomLeftCornerTransformed, positionBoundary) && withinPositionBoundary(bottomRightCornerTransformed, positionBoundary);
}
```

接下來我們來加上一個簡單的 variable `limitEntireViewPort` 在 `Camera` 裡面。

`camera.ts`
```typescript
class Camera {
    // 上略

    public limitEntireViewPort: boolean;

    constructor(viewPortWidth: number = 500, viewPortHeight: number = 500, positionBoundary: PositionBoundary = {min: {x: -1000, y: -1000}, max: {x: 1000, y: 1000}}){
        this._position = {x: 0, y: 0};
        this._rotation = 0;
        this._zoomLevel = 1;
        this._positionBoundary = positionBoundary;
        this.viewPortWidth = viewPortWidth;
        this.viewPortHeight = viewPortHeight;
        this.limitEntireViewPort = false;
    }

    // 下略
}
```

然後在 `setPosition` 裡面加上判斷是否需要限制整個視窗還是只有相機的中心點而已。 

`camera.ts`
```typescript
class Camera {
    // 略

    setPosition(destination: Point){
        if(this.limitEntireViewPort && !viewPortWithinPositionBoundary(this.viewPortWidth, this.viewPortHeight, destination, this._zoomLevel, this._rotation, this._positionBoundary)){
            return;
        }
        if(!withinPositionBoundary(destination, this._positionBoundary)){
            return;
        }
        this._position = destination;
    }

    // 略
}
```

接下來，我們也要實作整個視窗的 `clamping`。

我們在 `Camera` 類別外面加上另外一個 `clampingEntireViewPort` 的 function

然後計算一下視窗的四個角落轉換成世界座標系。

接著我們檢查如果四個角落都沒有超出去邊界，如果都沒有超過邊界的話，我們就可以直接回傳 `targetCameraPosition` 。

`camera.ts`
```typescript
function clampingEntireViewPort(viewPortWidth: number, viewPortHeight: number, targetCameraPosition: Point, cameraRotation: number, cameraZoomLevel: number, positionBoundary: PositionBoundary): Point {
    const topLeftCorner = {x: -viewPortWidth / 2, y: viewPortHeight / 2};
    const topRightCorner = {x: viewPortWidth / 2, y: viewPortHeight / 2};
    const bottomLeftCorner = {x: -viewPortWidth / 2, y: -viewPortHeight / 2};
    const bottomRightCorner = {x: viewPortWidth / 2, y: -viewPortHeight / 2};
    
    const topLeftCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(topLeftCorner, targetCameraPosition, cameraZoomLevel, cameraRotation);
    const topRightCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(topRightCorner, targetCameraPosition, cameraZoomLevel, cameraRotation);
    const bottomLeftCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(bottomLeftCorner, targetCameraPosition, cameraZoomLevel, cameraRotation);
    const bottomRightCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(bottomRightCorner, targetCameraPosition, cameraZoomLevel, cameraRotation);
    
    if( withinPositionBoundary(topLeftCornerTransformed, positionBoundary) && withinPositionBoundary(topRightCornerTransformed, positionBoundary) && withinPositionBoundary(bottomLeftCornerTransformed, positionBoundary) && withinPositionBoundary(bottomRightCornerTransformed, positionBoundary)){
        return targetCameraPosition;
    }   
}
```

接下來我們要來箝制每個超過相機邊界的角落，這邊我們可以用之前寫的 `simpleClamping` 或是 `clampingV2` 都可以。如果是使用 `clampingV2` 就會需要再計算目前的相機位置視窗的四個角落在世界的哪裡然後再計算箝制前後的差距。

這邊我選擇用 `simpleClaming` ，如果你有需要我示範使用 `clamingV2` ，再留言跟我說～

`camera.ts`
```typescript
function clampingEntireViewPort(viewPortWidth: number, viewPortHeight: number, targetCameraPosition: Point, cameraRotation: number, cameraZoomLevel: number, positionBoundary: PositionBoundary): Point {
    const topLeftCorner = {x: -viewPortWidth / 2, y: viewPortHeight / 2};
    const topRightCorner = {x: viewPortWidth / 2, y: viewPortHeight / 2};
    const bottomLeftCorner = {x: -viewPortWidth / 2, y: -viewPortHeight / 2};
    const bottomRightCorner = {x: viewPortWidth / 2, y: -viewPortHeight / 2};
    
    const topLeftCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(topLeft, targetCameraPosition, cameraZoomLevel, cameraRotation);
    const topRightCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(topRight, targetCameraPosition, cameraZoomLevel, cameraRotation);
    const bottomLeftCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(bottomLeft, targetCameraPosition, cameraZoomLevel, cameraRotation);
    const bottomRightCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(bottomRight, targetCameraPosition, cameraZoomLevel, cameraRotation);
    
    if( withinPositionBoundary(topLeftCornerTransformed, positionBoundary) && withinPositionBoundary(topRightCornerTransformed, positionBoundary) && withinPositionBoundary(bottomLeftCornerTransformed, positionBoundary) && withinPositionBoundary(bottomRightCornerTransformed, positionBoundary)){
        return targetCameraPosition;
    }

    const topLeftCornerClamped = simpleClamping(topLeftCornerTransformed, positionBoundary);
    const topRightCornerClamped = simpleClamping(topRightCornerTransformed, positionBoundary);
    const bottomLeftCornerClamped = simpleClamping(bottomLeftCornerTransformed, positionBoundary);
    const bottomRightCornerClamped = simpleClamping(bottomRightCornerTransformed, positionBoundary);
    
}
```

接下來，就是要找到鉗制前跟鉗制後的差距是什麼。

然後在 x y 兩個方向分別找出各自的絕對值的最大值。

為什麼是 x y 分開找？

因為我們有四個角落，可以思考看看如果有兩個角落同時超出邊界，那我們要以哪個點為準，去彌補超出的偏移量？

如果只有找其中一個角落 x y 的最大值，可能會有其中一個方向的偏移量沒有被彌補到。

最後把這個彌補偏移量加上去 `targetCameraPosition` 。這個就是相機可以移動到的極限。

`camera.ts`
```typescript
function clampingEntireViewPort(viewPortWidth: number, viewPortHeight: number, targetCameraPosition: Point, cameraRotation: number, cameraZoomLevel: number, positionBoundary: PositionBoundary): Point {
    const topLeftCorner = {x: -viewPortWidth / 2, y: viewPortHeight / 2};
    const topRightCorner = {x: viewPortWidth / 2, y: viewPortHeight / 2};
    const bottomLeftCorner = {x: -viewPortWidth / 2, y: -viewPortHeight / 2};
    const bottomRightCorner = {x: viewPortWidth / 2, y: -viewPortHeight / 2};
    
    const topLeftCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(topLeft, targetCameraPosition, cameraZoomLevel, cameraRotation);
    const topRightCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(topRight, targetCameraPosition, cameraZoomLevel, cameraRotation);
    const bottomLeftCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(bottomLeft, targetCameraPosition, cameraZoomLevel, cameraRotation);
    const bottomRightCornerTransformed = transformViewPort2WorldSpaceWithCameraAttributes(bottomRight, targetCameraPosition, cameraZoomLevel, cameraRotation);
    
    if( withinPositionBoundary(topLeftCornerTransformed, positionBoundary) && withinPositionBoundary(topRightCornerTransformed, positionBoundary) && withinPositionBoundary(bottomLeftCornerTransformed, positionBoundary) && withinPositionBoundary(bottomRightCornerTransformed, positionBoundary)){
        return targetCameraPosition;
    }

    const topLeftCornerClamped = simpleClaming(topLeftCornerTransformed, positionBoundary);
    const topRightCornerClamped = simpleClamping(topRightCornerTransformed, positionBoundary);
    const bottomLeftCornerClamped = simpleClamping(bottomLeftCornerTransformed, positionBoundary);
    const bottomRightCornerClamped = simpleClamping(bottomRightCornerTransformed, positionBoundary);

    const topLeftCornerDelta = vectorSubtraction(topLeftCornerClamped, topLeftCornerTransformed);
    const topRightCornerDelta = vectorSubtraction(topRightCornerClamped, topRightCornerTransformed);
    const bottomLeftCornerDelta = vectorSubtraction(bottomLeftCornerClamped, bottomLeftCornerTransformed);
    const bottomRightCornerDelta = vectorSubtraction(bottomRightCornerClamped, bottomRightCornerTransformed);
    
    let diffs = [topLeftCornerDelta, topRightCornerDelta, bottomLeftCornerDelta, bottomRightCornerDelta];
    let maxXDiff = Math.abs(diffs[0].x);
    let maxYDiff = Math.abs(diffs[0].y);
    let delta = diffs[0];
    diffs.forEach((diff)=>{
        if(Math.abs(diff.x) > maxXDiff){
            maxXDiff = Math.abs(diff.x);
            delta.x = diff.x;
        }
        if(Math.abs(diff.y) > maxYDiff){
            maxYDiff = Math.abs(diff.y);
            delta.y = diff.y;
        }
    });

    return vectorAddition(delta, targetCameraPosition);
}
```

我們實作完 `clampingEntireViewPort` 之後我們可以把它用在 `setPositionBy` 裡面。

記得要檢查 `Camera` 的 `limitEntireViewPort` 的值

`camera.ts`
```typescript
class Camera {

    // 略
    setPositionBy(offset: Point){
        const destination = vectorAddition(this._position, offset);
        if(this.limitEntireViewPort){
            this.setPosition(clampingEntireViewPort(this.viewPortWidth, this.viewPortHeight, destination, this._rotation, this._zoomLevel, this._positionBoundary));
            return;
        }
        const clampedDestination = clampingv2(this._position, destination, this._positionBoundary);
        this.setPosition(clampedDestination);
    }
    // 略
}
```

大概就是這樣ㄌ，你可以試試看如果把 `limitEntireViewPort` 打開的話，整個視窗會不會被限制在邊界裡面。

今天的東西比較複雜一點，有些東西我會再繼續補充說明（補上輔助說明圖片之類的），不過今天的進度在[這裡](https://github.com/niuee/infinite-canvas-tutorial/tree/Day12)，大家可以先看原始碼去研究一下，如果有不懂的地方我盡量解答。

今天到這邊平移的部分就差不多了，明天開始會是縮放的章節！

那我們明天見！


