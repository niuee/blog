---
title: "Day 20 | 等等，不行這樣！"
published: 2024-10-04
author: vee
seriesOrder: 22
---

<img src="day20-banner.png" alt="day 20 banner" class="image-shadow image-rounded" style="max-width: 100%; height: auto;" />

今天應該是我最後一篇直接對無限畫布新增功能的開發。

之後真的都會比較偏向應用方面的文章，還有重構拉哈哈哈...哈..哈（小聲

今天的主題是限制！

什麼是限制呢？

就是有某些動作，或是某些地方是我們不想要讓使用者跑過去的。

但是只是口頭說是沒有用的，我們必須施加更強制的制約，不行就是不行！

前面我們已經針對平移、縮放、旋轉有施加各種範圍邊界限制。也有強制實行！

但是有一些情況例如說，你只能橫著移動，或是你只能縮不能放之類的，這種情況邊界限制就無能為力了。

為了不要讓篇幅太長，我會先實作以下功能：

1. 限制只能水平方向平移
2. 限制只能垂直方向平移
3. 限制只能相對的水平方向平移
4. 限制只能相對的垂直方向平移

縮放跟旋轉就留給之後如果有空再補充，但是大家也可以思考看看要怎麼實作～

這篇算是比較像拋磚引玉的概念。

我們先來 `camera.ts` 裡面新加一個 `restrictXTranslation` 

`camera.ts`
```typescript
function restrictXTranslation(delta: Point): Point {

}
```

要限制絕對的水平方向位移很簡單，我們只需要把 x 方向的位移拔掉就好。

`camera.ts`
```typescript
function restrictXTranslation(delta: Point): Point {
    return {x: 0, y: delta.y};
}
```

就是這麼簡單。

要限制絕對的垂直方向位移也很簡單，我們只需要把 y 方向的位移拔掉就好。

`camera.ts`
```typescript
function restrictYTranslation(delta: Point): Point {
    return {x: delta.x, y: 0};
}
```

相對方向的 x 跟 y 就比較棘手一點了。

我們就是要把移動的向量投射到視窗的垂直或是水平方向。

要記得 import `dotProduct` 進來。

我們先限制相對的水平方向位移。

`camera.ts`
```typescript
function restrictRelativeXTranslation(delta: Point, cameraRotation: number): Point {
    let verticalDirection = rotateVector({x: 0, y: 1}, cameraRotation);
    const magnitude = dotProduct(delta, verticalDirection);
    return multiplyByScalar(verticalDirection, magnitude);
}
```

限制相對的垂直方向也是差不多的操作。

`camera.ts`
```typescript
function restrictRelativeYTranslation(delta: Point, cameraRotation: number): Point {
    let horizontalDirection = rotateVector({x: 1, y: 0}, cameraRotation);
    const magnitude = dotProduct(delta, horizontalDirection);
    return multiplyByScalar(horizontalDirection, magnitude);
}
```

接下來就是要把它們運用在各種 input 裡面。

但我今天的實作會停在這邊，因為後續我會開始講其中一種重構的可行方向，如果我現在加進去 input 裡面馬上就會被重構掉去其他地方。

所以這邊就是留給大家的回家作業？

我大概講解一下需要做的事情就好。

1. 把各種 input 的類別裡面需要平移的 delta
2. 用某種方式判斷現在要用什麼樣子的限制，根據不同的限制把 delta 傳去給 `restrictXTranslation`、`restrictYTranslation`、`restrictRelativeXTranslation`、`restrictRelativeYTranslation`。

今天的內容就到這裡～

進度在[這裡](https://github.com/niuee/infinite-canvas-tutorial/tree/Day20)

看來我的篇幅每天分配的有點不平均。QAQ

我們明天見。


