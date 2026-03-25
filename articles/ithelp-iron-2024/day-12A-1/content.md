---
title: "無限畫布附錄： Day 12A-1 | 兩線段交點"
published: 2024-09-26
author: vee
seriesOrder: 13
---

<img src="day12a1-banner.png" alt="day 12a-1 banner" class="image-shadow image-rounded" style="max-width: 100%; height: auto;" />

這個算是番外篇，因為篇幅真的很長，從主要的鐵人賽文章裡面分出來的，主要是要箝制畫布平移的功能，在比較複雜的限制下會需要計算兩個線段的交點。有些說明圖我之後會補上來，不過因為沒有實作這部分不會影響到主要的功能，所以優先程度可能就不會那麼高。

算是可以跳過的支線，所以大家就斟酌看~ 

我們直接進入正題！

首先我們需要可以判斷兩條直線線段是否有交集，如果有的話，那個交集點在哪裡？

詳細可以參考這個[影片](https://www.youtube.com/watch?v=fHOLQJo0FjQ&t=1823s&ab_channel=RaduMariescu-Istodor)

這篇某些部分是參考這個影片的，但是因為有一些例外需要處理，所以會變得不太一樣。

不過下面我也會盡我所能的詳細解釋這中間的原理。

首先我們需要在 `vector.ts` 這個檔案裡面先加上一個新的 function  `getLineSegmentIntersection`。

`vector.ts`
```typescript
export function getLineSegmentIntersection(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint2: Point) {
}
```

接下來我們需要決定一下這個 function 的 return type。

兩條線有沒有交集就有幾種結果：有交集（有一個交集點、有部分區段完全重疊）、沒有交集（沒有交集又有細分成：完全沒有交集、兩條線段互為平行並且不重疊、兩條線段互相延伸可以連起來但是目前它們並不重疊）

目前我們需要關注的結果是以下：

- 有交集
    - 一個交集點
    - 區段重疊
- 沒有交集

總共有三種情況。

我會使用一些 TypeScript 的語法，如果你是用純 JavaScript 應該也是可以做到一樣的事情。

首先我們先處理有交集的情況。

第一個是只有一個交集點的情況， `PointIntersection`。

`vector.ts`
```typescript
export type PointIntersection = {
    intersectionType: "point";
    intersectionPoint: Point;
    ratio: number;
}
```

這個 `ratio` 主要是為了方便知道交集點是在關注線段的哪個區段。

`ratio` 的值會從 0 到 1 之間的小數。

[插入 ratio 的圖]

再來是有區段重疊的部分，`IntervalIntersection`。

`vector.ts`
```typescript
export type IntervalIntersection = {
    intersectionType: "interval";
    intervalStartPoint: Point;
    intervalEndPoint: Point;
    startRatio: number;
    endRatio: number;
}
```

然後我們定義一下有交集點的結果。

`vector.ts`
```typescript
export type IntersectionPositive = {
    intersects: true;
    intersections: IntervalIntersection | PointIntersection;
}
```

接下來我們定義一下沒有交集點的結果。

`vector.ts`
```typescript
export type IntersectionNegative = {
    intersects: false;
}
```

然後最後我們把它集成起來。

`vector.ts`
```typescript
export type IntersectionResult = IntersectionPositive | IntersectionNegative;
```

這樣的語法可以參考[這個影片](https://www.youtube.com/watch?v=xsfdypZCLQ8&t=87s&ab_channel=WebDevSimplified)

或是 google TypeScript Discriminated Union。

這樣用的好處是我們可以根據結果直接去取值，IDE 也會根據結果有正確的提示。

假設如果是 `intersects` 為 `false` 的 `IntersectionResult` IDE 不會給你 `intersection` 的 autocomplete。

然後如果是 `intersectionType` 是 `"point"` 的就不會提示你 `intervalStartPoint` 等等不屬於 `"point"` 的屬性。

算是 TypeScript 一個蠻好用的小技巧，就不會根據不同情況有不同的 optional 然後每個地方都要做一堆檢查。

接下來我們就可以來看看 `getLineSegmentIntersection` 這個 function 的實作跟原理了。

我們先加上 `getLineSegmentIntersection` 的 return type。

`vector.ts`
```typescript
export function getLineSegmentIntersection(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint: Point): IntersectionResult {
    
}
```

在講解線段交集的原理之前，我覺得有必要先理 linear interpolation (線性插值，這個中文是我去查的如果有錯再跟我說)。

線性插值基本上就是在線段中間找出起點跟終點中間，如果給定一個在起點的 x 值以及終點的 x 值中間的一個 x 值，我們需要找出相對應 y 值。

[線性插值的示意圖]

這邊我們稍微改變一下，假設起點跟終點是一個進度條，在起點的時候是 0 在終點的時候是 1。那我們給定一個 0 到 1 之間的值，我們要可以計算出這個比例在起點到終點這個線段上面的座標。

[線性插值比例版示意圖]

這個比例就是上面有稍微提到過的 `offset` 。

計算的方法很簡單，我們只需要以終點的座標減掉起點的座標，然後乘上我們需要的比例。再加上起點的座標，就可以得到我們想要的座標。

[插入比例計算的公式]
x1 + (x2 - x1) * ratio = xlerp

這邊可以用向量計算，也可以 x 跟 y 分開計算。

那如果兩個線段有一個交集點，兩個線段都會可以以線性插值的方式去得到這個座標。

假設這個交點的座標是 (xi, yi) 的話，那我們可以用第一個線段的線性插值去表示這個 xi 跟 yi。

xi = (xe - xs) * ratio + xs

yi = (ye - ys) * ratio + ys

這邊的 xs 跟 xe 還有 ys 跟 ye 分別代表第一個線段的起點(start)跟終點(end)，而 ratio 是交點在第一個線段的比例。 

起點跟終點的順序只會影響 ratio 的不同。之間的轉換會是 (1 - ratio)

然後再用第二個線段的線性插值去表示 xi 跟 yi 。

xi = (xe2 - xs2) * ratio2 + xs2

yi = (ye2 - ys2) * ratio2 + ys2

這邊的 xs2 跟 xe2 還有 ys2 跟 ye2 分別代表第二個線段的起點跟終點，而 ratio2 是交點在第二個線段的比例。

兩邊的 xi 以及 yi 都必須要相等才會是有交集的兩個線段。

因此我們可以把等式寫成

(xe - xs) * ratio + xs = (xe2 - xs2) * ratio2 + xs2

(ye - ys) * ratio + ys = (ye2 - ys2) * ratio2 + ys2

然後我們簡化一下，讓第一個等式的 ratio2 變成是自己在等式的一邊。

((xe - xs) * ratio + xs - xs2) / (xe2 - xs2) = ratio2

接著要把 ratio2 帶進去第二個等式。

(ye - ys) * ratio + ys = (ye2 - ys2) * (((xe - xs) * ratio + xs - xs2) / (xe2 - xs2)) + ys2

接著我們要解 ratio 這個唯一的未知數。

把等式排列一下會變成（如果你想要看中間所有的過程再跟我說，我可以再貼上來，但是為了篇幅著想我先省略中間的步驟）

ratio = ((xe2 - xs2) * (ys - ys2) - (ye2 - ys2) * (xs - xs2)) / ((ye2 - ys2) * (xe - xs) - (xe2 - xs2) * (ye - ys))

因為 xs, xe, xs2, xe2, ys, ye, ys2, ye2 這八個都是已知的，所以我們可以計算出 ratio 。

咦？ 如果給定兩個線段，有兩個線段各自的起迄點座標，那 ratio 看起來都可以計算出來吧？那不就代表一定可以計算出交點嗎？

這樣說好像蠻有道理的，但是但是如果你仔細看一下 ratio 的計算，它是有一個除法的步驟！如果你曾經被 nan 弄過，那你的除零雷達應該已經在大響了。

沒錯，如果分數的分母是 0 的話這個分數在電腦計算 (至少在 JavaScript 裡面) 會變成 nan 。 那這樣的話就是代表這兩個線段是有可能沒有相交的。

所以我們可以在 ratio 計算的時候先分開計算分子以及分母的部分，然後看分母它是不是 0。如果是代表有可能沒有交點。

那我們先把這段寫進 `getLineSegmentIntersection` 裡吧！

`vector.ts`
```typescript
export function getLineSegmentIntersection(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint: Point): IntersectionResult {

    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);


}
```

我們在拉回來一下理論的部分，為什麼分母會是 0 呢？

那為什麼分母是 0 的時候就是沒有相交？是因為單純算不出來所以你才說沒有相交的吧？

這時候我們可以從另外一個方向推導，可能要大家回想國中的數學～

平行的兩條線它們會有什麼特性？

沒錯！就是它們的斜率會是相同的！

那斜率怎麼計算呢？

來來來，有一個很好記的口訣？或是你其實已經知道怎麼算的也沒關係，就聽我廢話一下：rise over run 

簡而言之就是 y 方向的差除以 x 方向的差。

[插入斜率公式圖]

我們可以以線段的起迄點去計算兩個線段的斜率。

第一個線段： (ye - ys) / (xe - xs) = m1

第二個線段： (ye2 - ys2) / (xe2 - xs2) = m2

那如果當兩個斜率相等的話（也就是兩線段是平行的），我們可以寫成等式

m1 = m2

(ye - ys) / (xe - xs) = (ye2 - ys2) / (xe2 - xs2)

然後交叉相乘變成：

(ye - ys) * (xe2 - xs2) = (ye2 - ys2) * (xe - xs)

然後搬運一下：

(ye2 - ys2) * (xe - xs) - (ye - ys) * (xe2 - xs2) = 0

如果我把剛剛 function 裡面的 variable name 帶進來的話

(endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y) = 0

是不是跟 `denominator` 是一模一樣的！ 

然後它是等於 0 ，這樣代表說如果 `denominator` 為 0 的話就是兩線段的斜率相等，然後兩線段是平行的。

兩個直線段是平行的“有可能”代表兩直線段是沒有相交的，但是還有一個可能，就是兩個線段是有重疊的，它們實際上如果寫成直線方程式的話會是一樣的。

兩個線段如果直線方程是一樣的也不一定代表兩個線段有重疊，這些都是需要去個別確認的。

這樣看來我們只檢查分母是不是 0 好像不太夠。

denominator 是 0 只代表兩個線段的斜率是相同的。

不過我們一步一步來！

`vector.ts`
```typescript
export function getLineSegmentIntersection(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint: Point): IntersectionResult {

    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);
    
    if(denominator == 0){

    }


}
```

接下來我們整理一下，斜率相同是有 3 種可能的：
- 兩個線段是同一個直線方程式，但是兩個線段沒有任何重疊，因此沒有相交
- 兩個線段是同一個直線方程式，且兩線段有部分區段重疊
- 兩個線段是兩段平行的線段，沒有相交

我們可以先檢查沒有相交的部分，讓這個情況可以提早 return

沒有相交的話就是兩個線段是兩個平行的直線方程，而且也不是一樣的直線方程。

複習一下直線方程式。

y = mx + b 

在這邊 m 是斜率，然後 b 是 offset 這裏的 offset 比較像是一個斜線的直線方程如果沒有通過原點的話，那在通過 x = 0 的地方 y 的座標是多少的概念。

詳細可以去看一下國中的直線方程式的章節。我再看看有沒有比較好的說明。

在這邊我們先寫幾個 helper function。

第一個是計算斜率的

也是寫在 `vector.ts` 裡面。

`vector.ts`
```typescript
export function slopeOf(startPoint: Point, endPoint: Point): number {
    return (endPoint.y - startPoint.y) / (endPoint.x - startPoint.x);
}
```

再來是 `offset` 

`vector.ts`
```typescript
export function offsetOf(startPoint: Point, endPoint: Point): number {
    return startPoint.y - slopeOf(startPoint, endPoint) * startPoint.x;
}
```

接下來我們在 `if` 裡面加上一些額外的檢查條件，讓我們可以讓沒有相交的情況提早 return。

有 2 個情況會需要檢查。
- 非垂直線，offset 相同
- 垂直線，x 座標相同

`vector.ts`
```typescript
export function getLineSegmentIntersection(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint2: Point): IntersectionResult {

    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);

    if(denominator == 0 && ((endPoint.x !== startPoint.x && offsetOf(startPoint, endPoint) !== offsetOf(startPoint2, endPoint2)) || (endPoint.x === startPoint.x && endPoint.x !== endPoint2.x))){
        return { intersects: false };
    }

    if(denominator == 0){

    }
}
```

剩下的都是有可能有交集的線段。

接下來斜率相同的兩個線段都會是同樣的直線方程式或是同樣的鉛直線。

我們會需要檢查的是兩個線段是否會重疊。

我們先檢查最簡單的就是如果兩個線段是完全一模一樣的線段，那就是整個線段重疊。

這個檢查甚至可以加在 function 的最上面。

我們先加上一個比較 `Point` 的 helper function。

`vector.ts`
```typescript
export function pointsAreEqual(point: Point, point2: Point): boolean {
    return point.x === point2.x && point.y === point2.y;
}
```

然後再 `getLineSegmentIntersection` 裡面加上。

`vector.ts`
```typescript
export function getLineSegmentIntersection(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint2: Point): IntersectionResult {

    if((pointsAreEqual(startPoint, startPoint2) && pointsAreEqual(endPoint, endPoint2)) || (pointsAreEqual(startPoint, endPoint2) && pointsAreEqual(endPoint, startPoint2))){
        return { 
            intersects: true, 
            intersections: {
                intersectionType: "interval",
                intervalStartPoint: startPoint,
                intervalEndPoint: endPoint,
                startRatio: 0,
                endRatio: 1,
            }
        }
    }

    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);

    if(denominator == 0 && ((endPoint.x !== startPoint.x && offsetOf(startPoint, endPoint) !== offsetOf(startPoint2, endPoint2)) || (endPoint.x === startPoint.x && endPoint.x !== endPoint2.x))){
        return { intersects: false };
    }

    if(denominator == 0){

    }
}
```

接下來第二簡單的！就是頭接尾、頭接頭、尾街尾、尾接頭的場合。

這個也可以在 `getLineSegmentIntersection` 的上面做。

`vector.ts`
```typescript
export function getLineSegmentIntersection(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint2: Point): IntersectionResult {

    // complete overlap
    if((pointsAreEqual(startPoint, startPoint2) && pointsAreEqual(endPoint, endPoint2)) || (pointsAreEqual(startPoint, endPoint2) && pointsAreEqual(endPoint, startPoint2))){
        return { 
            intersects: true, 
            intersections: {
                intersectionType: "interval",
                intervalStartPoint: startPoint,
                intervalEndPoint: endPoint,
                startRatio: 0,
                endRatio: 1,
            }
        }
    }

    // point overlap
    if(pointsAreEqual(startPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(startPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(endPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }

    if(pointsAreEqual(endPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }

    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);

    if(denominator == 0 && ((endPoint.x !== startPoint.x && offsetOf(startPoint, endPoint) !== offsetOf(startPoint2, endPoint2)) || (endPoint.x === startPoint.x && endPoint.x !== endPoint2.x))){
        return { intersects: false };
    }

    if(denominator == 0){

    }
}
```

接下來的情況就會運用到向量計算的內積了。

之前有講過內積可以用在向量投射上面。

這邊先簡單解釋一下內積是什麼。（前面的向量計算的介紹就有蠻詳細的說明）

內積可以想像成把一個向量垂直投射到另外一個向量上面，他在那個向量上的長度會是多少。

[插入內積向量示意圖]

要看兩個線段有沒有交疊，我們要把這個問題變成一個一維的問題。

首先我們先計算起訖點的單位向量，拿哪一個線段都沒有問題，因為在這個階段斜率一樣時，這兩個線段基本上可以連成同一條線。

`vector.ts`
```typescript
export function getLineSegmentIntersection(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint2: Point): IntersectionResult {

    // complete overlap
    if((pointsAreEqual(startPoint, startPoint2) && pointsAreEqual(endPoint, endPoint2)) || (pointsAreEqual(startPoint, endPoint2) && pointsAreEqual(endPoint, startPoint2))){
        return { 
            intersects: true, 
            intersections: {
                intersectionType: "interval",
                intervalStartPoint: startPoint,
                intervalEndPoint: endPoint,
                startRatio: 0,
                endRatio: 1,
            }
        }
    }

    // point overlap
    if(pointsAreEqual(startPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(startPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(endPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }

    if(pointsAreEqual(endPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }

    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);

    if(denominator == 0 && ((endPoint.x !== startPoint.x && offsetOf(startPoint, endPoint) !== offsetOf(startPoint2, endPoint2)) || (endPoint.x === startPoint.x && endPoint.x !== endPoint2.x))){
        return { intersects: false };
    }

    if(denominator == 0){
        const unit = unitVector(vectorSubtraction(endPoint, startPoint));
    }
}
```

有了單位向量之後，我們把兩個線段的起迄點都跟這個單位向量做內積。

`vector.ts`
```typescript
export function getLineSegmentIntersection(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint2: Point): IntersectionResult {

    // complete overlap
    if((pointsAreEqual(startPoint, startPoint2) && pointsAreEqual(endPoint, endPoint2)) || (pointsAreEqual(startPoint, endPoint2) && pointsAreEqual(endPoint, startPoint2))){
        return { 
            intersects: true, 
            intersections: {
                intersectionType: "interval",
                intervalStartPoint: startPoint,
                intervalEndPoint: endPoint,
                startRatio: 0,
                endRatio: 1,
            }
        }
    }

    // point overlap
    if(pointsAreEqual(startPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(startPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(endPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }

    if(pointsAreEqual(endPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }

    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);

    if(denominator == 0 && ((endPoint.x !== startPoint.x && offsetOf(startPoint, endPoint) !== offsetOf(startPoint2, endPoint2)) || (endPoint.x === startPoint.x && endPoint.x !== endPoint2.x))){
        return { intersects: false };
    }

    if(denominator == 0){
        const unit = unitVector(vectorSubtraction(endPoint, startPoint));

        const start = dotProduct(unit, startPoint);
        const end = dotProduct(unit, endPoint);

        const start2 = dotProduct(unit, startPoint2);
        const end2 = dotProduct(unit, endPoint2);
    }
}
```

要用單位向量是因為我們要避免不必要的伸展。

如果不是用單位向量的話會把那個向量的長度也計算進去，這樣會造成我們判斷區間有沒有重疊時會被影響到。

我們現在就有 4 個值 start, end, start2, end2。

接下來就變成很典型的 interval 問題了！

沒想到！在 leetcode 上面刷的題有一天也會派上用場！

我們寫一個簡單的判斷 interval 有沒有重疊的 helper function

這邊還有一個小問題需要處理，就是 start 其實是有可能比 end 還要大的。

在檢查重疊時我們要先排序一下。

`vector.ts`
```typescript
export function intervalsOverlap(interval1: {start: number, end: number}, interval2: {start: number, end: number}): boolean {
    const transformedInterval1 = interval1.start > interval1.end ? {start: interval1.end, end: interval1.start} : interval1;
    const transformedInterval2 = interval2.start > interval2.end ? {start: interval2.end, end: interval2.start} : interval2;
    return transformedInterval1.start <= transformedInterval2.end && transformedInterval2.start <= transformedInterval1.end;
}
```

然後實際應用在 `getLineSegmentIntersection` 裡面。

`vector.ts`
```typescript
export function getLineSegmentIntersction(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint2: Point): IntersectionResult {

    // complete overlap
    if((pointsAreEqual(startPoint, startPoint2) && pointsAreEqual(endPoint, endPoint2)) || (pointsAreEqual(startPoint, endPoint2) && pointsAreEqual(endPoint, startPoint2))){
        return { 
            intersects: true, 
            intersections: {
                intersectionType: "interval",
                intervalStartPoint: startPoint,
                intervalEndPoint: endPoint,
                startRatio: 0,
                endRatio: 1,
            }
        }
    }

    // point overlap
    if(pointsAreEqual(startPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(startPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(endPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }

    if(pointsAreEqual(endPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }

    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);

    if(denominator == 0 && ((endPoint.x !== startPoint.x && offsetOf(startPoint, endPoint) !== offsetOf(startPoint2, endPoint2)) || (endPoint.x === startPoint.x && endPoint.x !== endPoint2.x))){
        return { intersects: false };
    }

    if(denominator == 0){
        const unit = unitVector(vectorSubtraction(endPoint, startPoint));

        const start = dotProduct(unit, startPoint);
        const end = dotProduct(unit, endPoint);

        const start2 = dotProduct(unit, startPoint2);
        const end2 = dotProduct(unit, endPoint2);

        if (intervalsOverlap({start, end}, {start: start2, end: end2})){

        }
    }
}
```

有重疊的話我們就要計算重疊的區間，不過這裡可以偷吃步一點。

我們可以只算兩個區段比較小的 end 以及比較大的 start。

不過這個是建立在 start 都比 end 小的情況下。因此這邊我們也是要做一下排序的處理。

我們一樣先寫個 helper function 好了

`vector.ts`
```typescript
export type PositiveOverlapInterval = {
    overlaps: true;
    start: number;
    end: number;
}

export type NegativeOverlapInterval = {
    overlaps: false;
}

export type OverlapIntervalResult = PositiveOverlapInterval | NegativeOverlapInterval;

export function getOverlapStartAndEnd(interval1: {start: number, end: number}, interval2: {start: number, end: number}): OverlapIntervalResult{
    const transformedInterval1 = interval1.start > interval1.end ? {start: interval1.end, end: interval1.start} : interval1;
    const transformedInterval2 = interval2.start > interval2.end ? {start: interval2.end, end: interval2.start} : interval2;
    if(!intervalsOverlap(transformedInterval1, transformedInterval2)) {
        return {
            overlaps: false,
        }
    }
    return {overlaps: true, start: Math.max(transformedInterval1.start, transformedInterval2.start), end: Math.min(transformedInterval1.end, transformedInterval2.end)};
}
```

接下來用在 `getLineSegmentIntersection`

有了 `res.start` 跟 `res.end` 之後我們可以把它們乘上單位向量就可以得到重疊區間的起迄點。

`vector.ts`
```typescript
export function getLineSegmentIntersction(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint2: Point): IntersectionResult {

    // complete overlap
    if((pointsAreEqual(startPoint, startPoint2) && pointsAreEqual(endPoint, endPoint2)) || (pointsAreEqual(startPoint, endPoint2) && pointsAreEqual(endPoint, startPoint2))){
        return { 
            intersects: true, 
            intersections: {
                intersectionType: "interval",
                intervalStartPoint: startPoint,
                intervalEndPoint: endPoint,
                startRatio: 0,
                endRatio: 1,
            }
        }
    }

    // point overlap
    if(pointsAreEqual(startPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(startPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(endPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }

    if(pointsAreEqual(endPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }
    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);

    if(denominator == 0 && ((endPoint.x !== startPoint.x && offsetOf(startPoint, endPoint) !== offsetOf(startPoint2, endPoint2)) || (endPoint.x === startPoint.x && endPoint.x !== endPoint2.x))){
        return { intersects: false };
    }

    if(denominator == 0){
        const unit = unitVector(vectorSubtraction(endPoint, startPoint));

        const start = dotProduct(unit, startPoint);
        const end = dotProduct(unit, endPoint);

        const start2 = dotProduct(unit, startPoint2);
        const end2 = dotProduct(unit, endPoint2);

        const res = getOverlapStartAndEnd({start, end}, {start: start2, end: end2});
        if(res.overlaps){
            const intervalStartPoint = multiplyByScalar(unit, res.start);
            const intervalEndPoint = multiplyByScalar(unit, res.end);            
        }
    }
}
```

接下來我們要計算區間的 ratio。

`vector.ts`
```typescript
export function getLineSegmentIntersction(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint2: Point): IntersectionResult {

    // complete overlap
    if((pointsAreEqual(startPoint, startPoint2) && pointsAreEqual(endPoint, endPoint2)) || (pointsAreEqual(startPoint, endPoint2) && pointsAreEqual(endPoint, startPoint2))){
        return { 
            intersects: true, 
            intersections: {
                intersectionType: "interval",
                intervalStartPoint: startPoint,
                intervalEndPoint: endPoint,
                startRatio: 0,
                endRatio: 1,
            }
        }
    }

    // point overlap
    if(pointsAreEqual(startPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(startPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(endPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }

    if(pointsAreEqual(endPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }
    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);

    if(denominator == 0 && ((endPoint.x !== startPoint.x && offsetOf(startPoint, endPoint) !== offsetOf(startPoint2, endPoint2)) || (endPoint.x === startPoint.x && endPoint.x !== endPoint2.x))){
        return { intersects: false };
    }

    if(denominator == 0){
        const unit = unitVector(vectorSubtraction(endPoint, startPoint));

        const start = dotProduct(unit, startPoint);
        const end = dotProduct(unit, endPoint);

        const start2 = dotProduct(unit, startPoint2);
        const end2 = dotProduct(unit, endPoint2);

        const res = getOverlapStartAndEnd({start, end}, {start: start2, end: end2});
        if(res.overlaps){
            const intervalStartPoint = multiplyByScalar(unit, res.start);
            const intervalEndPoint = multiplyByScalar(unit, res.end);
            const startRatio = (res.start - start) / (end - start);
            const endRatio = (res.end - start) / (end - start);
            
        }
    }
}
```

在返回之前，我們需要檢查一下，如果第一個線段的起迄點是反方向的，那我們需要把回傳的值也都調換過來。

`vector.ts`
```typescript
export function getLineSegmentIntersction(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint2: Point): IntersectionResult {

    // complete overlap
    if((pointsAreEqual(startPoint, startPoint2) && pointsAreEqual(endPoint, endPoint2)) || (pointsAreEqual(startPoint, endPoint2) && pointsAreEqual(endPoint, startPoint2))){
        return { 
            intersects: true, 
            intersections: {
                intersectionType: "interval",
                intervalStartPoint: startPoint,
                intervalEndPoint: endPoint,
                startRatio: 0,
                endRatio: 1,
            }
        }
    }

    // point overlap
    if(pointsAreEqual(startPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(startPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(endPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }

    if(pointsAreEqual(endPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }
    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);

    if(denominator == 0 && ((endPoint.x !== startPoint.x && offsetOf(startPoint, endPoint) !== offsetOf(startPoint2, endPoint2)) || (endPoint.x === startPoint.x && endPoint.x !== endPoint2.x))){
        return { intersects: false };
    }

    if(denominator == 0){
        const unit = unitVector(vectorSubtraction(endPoint, startPoint));

        const start = dotProduct(unit, startPoint);
        const end = dotProduct(unit, endPoint);

        const start2 = dotProduct(unit, startPoint2);
        const end2 = dotProduct(unit, endPoint2);

        const res = getOverlapStartAndEnd({start, end}, {start: start2, end: end2});
        if(res.overlaps){
            const intervalStartPoint = multiplyByScalar(unit, res.start);
            const intervalEndPoint = multiplyByScalar(unit, res.end);
            const startRatio = (res.start - start) / (end - start);
            const endRatio = (res.end - start) / (end - start);
            return start > end ? {
                intersects: true, 
                intersections: {
                    intersectionType: "interval",
                    intervalStartPoint: intervalEndPoint,
                    intervalEndPoint: intervalStartPoint,
                    startRatio: endRatio,
                    endRatio: startRatio,
                }
            } : {
                intersects: true, 
                intersections: {
                    intersectionType: "interval",
                    intervalStartPoint: intervalStartPoint,
                    intervalEndPoint: intervalEndPoint,
                    startRatio: startRatio,
                    endRatio: endRatio,
                }
            }
        }
    }
}
```

接下來我們需要處理沒有重疊的部分，沒有重疊的話就代表兩個線段沒有相交。

`vector.ts`
```typescript
export function getLineSegmentIntersction(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint2: Point): IntersectionResult {

    // complete overlap
    if((pointsAreEqual(startPoint, startPoint2) && pointsAreEqual(endPoint, endPoint2)) || (pointsAreEqual(startPoint, endPoint2) && pointsAreEqual(endPoint, startPoint2))){
        return { 
            intersects: true, 
            intersections: {
                intersectionType: "interval",
                intervalStartPoint: startPoint,
                intervalEndPoint: endPoint,
                startRatio: 0,
                endRatio: 1,
            }
        }
    }

    // point overlap
    if(pointsAreEqual(startPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(startPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(endPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }

    if(pointsAreEqual(endPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }
    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);

    if(denominator == 0 && ((endPoint.x !== startPoint.x && offsetOf(startPoint, endPoint) !== offsetOf(startPoint2, endPoint2)) || (endPoint.x === startPoint.x && endPoint.x !== endPoint2.x))){
        return { intersects: false };
    }

    if(denominator == 0){
        const unit = unitVector(vectorSubtraction(endPoint, startPoint));

        const start = dotProduct(unit, startPoint);
        const end = dotProduct(unit, endPoint);

        const start2 = dotProduct(unit, startPoint2);
        const end2 = dotProduct(unit, endPoint2);

        const res = getOverlapStartAndEnd({start, end}, {start: start2, end: end2});
        if(res.overlaps){
            const intervalStartPoint = multiplyByScalar(unit, res.start);
            const intervalEndPoint = multiplyByScalar(unit, res.end);
            const startRatio = (res.start - start) / (end - start);
            const endRatio = (res.end - start) / (end - start);
            return start > end ? {
                intersects: true, 
                intersections: {
                    intersectionType: "interval",
                    intervalStartPoint: intervalEndPoint,
                    intervalEndPoint: intervalStartPoint,
                    startRatio: endRatio,
                    endRatio: startRatio,
                }
            } : {
                intersects: true, 
                intersections: {
                    intersectionType: "interval",
                    intervalStartPoint: intervalStartPoint,
                    intervalEndPoint: intervalEndPoint,
                    startRatio: startRatio,
                    endRatio: endRatio,
                }
            };
        } else {
            return { intersects: false };
        }
    }
}
```

最後一個需要處理的就是可以用 ratio 去決定有沒有相交的情況。

當這個 ratio 計算出來之後是超出 0 到 1 這個範圍時，就代表兩個線段是有交集點的，但是這個交集點超出兩個線段的起迄點，是在線段外面的交點。

所以就可以回傳沒有相交。

`vector.ts`
```typescript
export function getLineSegmentIntersction(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint2: Point): IntersectionResult {

    // complete overlap
    if((pointsAreEqual(startPoint, startPoint2) && pointsAreEqual(endPoint, endPoint2)) || (pointsAreEqual(startPoint, endPoint2) && pointsAreEqual(endPoint, startPoint2))){
        return { 
            intersects: true, 
            intersections: {
                intersectionType: "interval",
                intervalStartPoint: startPoint,
                intervalEndPoint: endPoint,
                startRatio: 0,
                endRatio: 1,
            }
        }
    }

    // point overlap
    if(pointsAreEqual(startPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(startPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(endPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }

    if(pointsAreEqual(endPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }
    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);

    if(denominator == 0 && ((endPoint.x !== startPoint.x && offsetOf(startPoint, endPoint) !== offsetOf(startPoint2, endPoint2)) || (endPoint.x === startPoint.x && endPoint.x !== endPoint2.x))){
        return { intersects: false };
    }

    if(denominator == 0){
        const unit = unitVector(vectorSubtraction(endPoint, startPoint));

        const start = dotProduct(unit, startPoint);
        const end = dotProduct(unit, endPoint);

        const start2 = dotProduct(unit, startPoint2);
        const end2 = dotProduct(unit, endPoint2);

        const res = getOverlapStartAndEnd({start, end}, {start: start2, end: end2});
        if(res.overlaps){
            const intervalStartPoint = multiplyByScalar(unit, res.start);
            const intervalEndPoint = multiplyByScalar(unit, res.end);
            const startRatio = (res.start - start) / (end - start);
            const endRatio = (res.end - start) / (end - start);
            return start > end ? {
                intersects: true, 
                intersections: {
                    intersectionType: "interval",
                    intervalStartPoint: intervalEndPoint,
                    intervalEndPoint: intervalStartPoint,
                    startRatio: endRatio,
                    endRatio: startRatio,
                }
            } : {
                intersects: true, 
                intersections: {
                    intersectionType: "interval",
                    intervalStartPoint: intervalStartPoint,
                    intervalEndPoint: intervalEndPoint,
                    startRatio: startRatio,
                    endRatio: endRatio,
                }
            };
        } else {
            return { intersects: false };
        }
    }
    const ratio = numerator / denominator;
    if (ratio >= 0 && ratio <= 1){

    }

    return {
        intersects: false,
    }

}
```

最後一個要處理，真的是最後了！

我們要計算一下如果有交點的話那個交點在哪裡。

這時候我們先寫一個 `linearInterpolation` 的 helper function

`vector.ts`
```typescript
export function linearInterpolation(startPoint: Point, endPoint: Point, ratio: number): Point {
    return {x: startPoint.x + (endPoint.x - startPoint.x) * ratio, y: startPoint.y + (endPoint.y - startPoint.y) * ratio};
}
```

然後把它加進去 `getLineSegmentIntersection` 裡面。

`vector.ts`
```typescript
export function getLineSegmentIntersction(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint2: Point): IntersectionResult {

    // complete overlap
    if((pointsAreEqual(startPoint, startPoint2) && pointsAreEqual(endPoint, endPoint2)) || (pointsAreEqual(startPoint, endPoint2) && pointsAreEqual(endPoint, startPoint2))){
        return { 
            intersects: true, 
            intersections: {
                intersectionType: "interval",
                intervalStartPoint: startPoint,
                intervalEndPoint: endPoint,
                startRatio: 0,
                endRatio: 1,
            }
        }
    }

    // point overlap
    if(pointsAreEqual(startPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(startPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(endPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }

    if(pointsAreEqual(endPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }
    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);

    if(denominator == 0 && ((endPoint.x !== startPoint.x && offsetOf(startPoint, endPoint) !== offsetOf(startPoint2, endPoint2)) || (endPoint.x === startPoint.x && endPoint.x !== endPoint2.x))){
        return { intersects: false };
    }

    if(denominator == 0){
        const unit = unitVector(vectorSubtraction(endPoint, startPoint));

        const start = dotProduct(unit, startPoint);
        const end = dotProduct(unit, endPoint);

        const start2 = dotProduct(unit, startPoint2);
        const end2 = dotProduct(unit, endPoint2);

        const res = getOverlapStartAndEnd({start, end}, {start: start2, end: end2});
        if(res.overlaps){
            const intervalStartPoint = multiplyByScalar(unit, res.start);
            const intervalEndPoint = multiplyByScalar(unit, res.end);
            const startRatio = (res.start - start) / (end - start);
            const endRatio = (res.end - start) / (end - start);
            return start > end ? {
                intersects: true, 
                intersections: {
                    intersectionType: "interval",
                    intervalStartPoint: intervalEndPoint,
                    intervalEndPoint: intervalStartPoint,
                    startRatio: endRatio,
                    endRatio: startRatio,
                }
            } : {
                intersects: true, 
                intersections: {
                    intersectionType: "interval",
                    intervalStartPoint: intervalStartPoint,
                    intervalEndPoint: intervalEndPoint,
                    startRatio: startRatio,
                    endRatio: endRatio,
                }
            };
        } else {
            return { intersects: false };
        }
    }
    const ratio = numerator / denominator;
    if (ratio >= 0 && ratio <= 1){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: linearInterpolation(startPoint, endPoint, ratio),
                ratio: ratio, 
            }
        }
    }

    return {
        intersects: false,
    }
}
```

辛苦各位了！其實到這邊就差不多了，不過因為光是這個 `getLineSegmentIntersection` function 功能就很複雜了，所以我覺得還是寫一些測試會比較好。

因為篇幅實在是太長了，所以我這邊的測試搬到另外一篇 [Day 12A-2]() 的文章裡面，可以直接連過去或是去 GitHub repo 裡面複製。

你以為結束了嗎？還沒！

我對不起各位，因為我想起來還有一個例外需要處理。就是線段其實不是線段，它只是一個點，它的起迄點是同一個點。

是一個點的情況有 2 種：
- 兩個線段都是點。（如果是同一個點就是有一個交點）
- 其中一個線段是點。（如果點是在另外一個線上，那就是一個交點）

第一種情況很好解。就直接檢查 x 跟 y 是不是相等。

第二種情況稍微複雜一點。

我們要怎麼判斷點是不是在線段之內呢？

我們可以先判斷這個點是不是在這個線段上面，我們可以用座標找三角形面積的公式。

[三角形面積公式]

如果三個點是連成一條線的話，他的面積會是 0。

所以我們可以先檢查這個。如果點是在線上的話，我們還需要檢查點是不是在線段的起迄點中間。

如果寫成一個 helper function 的話

`vector.ts`
```typescript
export function pointLiesOnSegment(point: Point, startPoint: Point, endPoint: Point): boolean {
    const areaCheck = startPoint.x * (endPoint.y - point.y) + endPoint.x * (point.y - startPoint.y) + point.x * (startPoint.y - endPoint.y);
    if(areaCheck !== 0) {
        return false;
    }
    let xInRange = Math.min(endPoint.x, startPoint.x) <= point.x;
    xInRange = Math.max(endPoint.x, startPoint.x) >= point.x;
    let yInRange = Math.min(endPoint.y, startPoint.y) <= point.y;
    yInRange = Math.max(endPoint.y, startPoint.y) >= point.y;

    return xInRange && yInRange;
}
```

接下來我們可以在 `getLineSegment` 裡面加上點的檢查。

我選擇把它加在 function 的最前面。
接下來我們可以在 `getLineSegment` 裡面加上點的檢查。

我選擇把它加在 function 的最前面。

`vector.ts`
```typescript
export function getLineSegmentIntersection(startPoint: Point, endPoint: Point, startPoint2: Point, endPoint2: Point): IntersectionResult {

    if(pointsAreEqual(startPoint, endPoint) && pointsAreEqual(startPoint2, endPoint2)){
        // 兩個線段皆為點，我們只需要檢查兩點是不是一樣的即可
        if(!pointsAreEqual(startPoint, startPoint2)) {
            return {
                intersects: false
            };
        }
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(startPoint, endPoint)){
        // 第一個線段是個點
        if(!pointLiesOnSegment(startPoint, startPoint2, endPoint2)){
            return {
                intersects: false,
            };
        }
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(startPoint2, endPoint2)){
        // 第二個線段是個點
        if(!pointLiesOnSegment(startPoint2, startPoint, endPoint)){
            return {
                intersects: false,
            };
        }
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint2,
                ratio: (startPoint2.x - startPoint.x) / (endPoint.x - startPoint.x),
            }
        }
    }

    // complete overlap
    if((pointsAreEqual(startPoint, startPoint2) && pointsAreEqual(endPoint, endPoint2)) || (pointsAreEqual(startPoint, endPoint2) && pointsAreEqual(endPoint, startPoint2))){
        return { 
            intersects: true, 
            intersections: {
                intersectionType: "interval",
                intervalStartPoint: startPoint,
                intervalEndPoint: endPoint,
                startRatio: 0,
                endRatio: 1,
            }
        }
    }

    // point overlap
    if(pointsAreEqual(startPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(startPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: startPoint,
                ratio: 0,
            }
        }
    }

    if(pointsAreEqual(endPoint, startPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }

    if(pointsAreEqual(endPoint, endPoint2)){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: endPoint,
                ratio: 1,
            }
        }
    }
    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);

    if(denominator == 0 && ((endPoint.x !== startPoint.x && offsetOf(startPoint, endPoint) !== offsetOf(startPoint2, endPoint2)) || (endPoint.x === startPoint.x && endPoint.x !== endPoint2.x))){
        return { intersects: false };
    }

    if(denominator == 0){
        const unit = unitVector(vectorSubtraction(endPoint, startPoint));

        const start = dotProduct(unit, startPoint);
        const end = dotProduct(unit, endPoint);

        const start2 = dotProduct(unit, startPoint2);
        const end2 = dotProduct(unit, endPoint2);

        const res = getOverlapStartAndEnd({start, end}, {start: start2, end: end2});
        if(res.overlaps){
            const intervalStartPoint = multiplyByScalar(unit, res.start);
            const intervalEndPoint = multiplyByScalar(unit, res.end);
            const startRatio = (res.start - start) / (end - start);
            const endRatio = (res.end - start) / (end - start);
            return start > end ? {
                intersects: true, 
                intersections: {
                    intersectionType: "interval",
                    intervalStartPoint: intervalEndPoint,
                    intervalEndPoint: intervalStartPoint,
                    startRatio: endRatio,
                    endRatio: startRatio,
                }
            } : {
                intersects: true, 
                intersections: {
                    intersectionType: "interval",
                    intervalStartPoint: intervalStartPoint,
                    intervalEndPoint: intervalEndPoint,
                    startRatio: startRatio,
                    endRatio: endRatio,
                }
            };
        } else {
            return { intersects: false };
        }
    }
    const ratio = numerator / denominator;
    if (ratio >= 0 && ratio <= 1){
        return {
            intersects: true,
            intersections: {
                intersectionType: "point",
                intersectionPoint: linearInterpolation(startPoint, endPoint, ratio),
                ratio: ratio, 
            }
        }
    }

    return {
        intersects: false,
    }
}
```

好了這次是真的結束了！
