---
title: "Day 24 | 撞到牆壁會怎樣？"
published: 2024-10-08
author: vee
seriesOrder: 26
---


<img src="day24-banner.png" alt="day 24 banner" class="image-shadow image-rounded" style="max-width: 100%; height: auto;" />

今天跟接下來的篇幅會著重在無限畫布的應用，會以展示為主要目的，所以不會帶太多實作上面的細節。

其實無限畫布因為你想要畫什麼都沒有問題，所以在應用方面應該是百百種。

為了讓大家先有一些起頭的方向，我在這個系列裡先列出幾個，讓大家可以自己發揮想像力去延伸各種其他的應用。

今天的主題會是簡單的物理模擬！(所以標題才會寫撞到牆壁，畢竟最基本的物理模擬應該是撞到牆壁的彈力球？)

之前為了個人專案去研究了一下物理模擬相關的實作，自己簡單地做了一個小 library `@niuee/bolt`。

今天我會來配合這個 library 在無限畫布上面運用一下！

首先我先簡單介紹一下要怎麼用 `@niuee/bolt` 這個 library 。

裡面會有一個物理模擬的“世界” `World` 這個類別。然後它有一個 `step` function 就是用來在每幀之間計算物體之間的變化。它會吃進一個參數是 `deltaTime` 也就是它需要前進的時間。（目前我寫的是時間差單位是秒，之後可能改成毫秒）

再來就是在世界裡面的物體 `RigidBody` ，目前我只有實作兩種物體分別是多邊形跟圓型的物體。

因為這個物理模擬是可以完全沒有 UI 去跑的，所以 UI 的部分是另外包一層 `VisualRigidBody` 去在 canvas 上面畫出來。

接下來就邊實作我邊解釋吧！

你可以沿用之前實作的成果，直接在你的 dev server 進行開發。
不過如果要跟著實作最方便的方法還是開啟一個新的專案然後直接用 board 跟其他我會用到 library。

每個應用我能分配的篇幅只有一點點，所以我大多會使用 `@niuee/board` 跟其他外加功能的 library 去做示範實作，有可能會用到一點我們這個系列還沒有實作過的功能。

因為接下來這個系列的文章都會是以展示應用為主要目的，怎麼實作這些應用就比較不會放太多篇幅在上面。

但是我會把每種應用的原始碼都放在 GitHub 上面，這樣大家如果有興趣也可以自己 clone 回去玩玩看。

另外我也會把每個應用都部署出去，所以大家也可以看到實際上是長怎樣。

## 實作時間

這邊我就是大概簡單講一下 `@niuee/bolt` 要怎麼使用，至於我做了甚麽應用我會在後面比較詳細的介紹。

我們先創造一個 `physics.ts` 的檔案，主要就是要把物理模擬的基礎架設起來。

首先我們需要先初始化一個“世界”。

```typescript
import { World } from "@niuee/bolt";

const world = new World(1000, 1000);
```

給 `World` 類別建構的參數是這個世界的寬高，有這個寬高主要是方便 Quadtree 的初始化。

建議可以給一模一樣的尺寸給無邊際畫布的邊界範圍。

再來我們先初始化一個 `RigidBody` 來加進去模擬世界裡面。

```typescript
import { World, VisualPolygonBody } from "@niuee/bolt";

const world = new World(1000, 1000);
const rigidBody = new VisualPolygonBody({x: 0, y: 0}, [{x: 20, y: 10}, {x: -20, y: 10}, {x: -20, y: -10}, {x: 20, y: -10}], context, 0, 50, false);
```

`VisualPolygonBody` 的初始化參數是 中心點在世界的位置、多邊形的頂點（相對於中心點的座標）、用來畫出多邊形的 context (基本上就是 canvas 的 context)、旋轉角度、質量、是否是固定的物體。

其實後面還有蠻多非必填的參數，但是我就不一一解釋了。現在我們把這個 rigidBody 加到世界裡。

```typescript
import { World, VisualPolygonBody } from "@niuee/bolt";

const world = new World(1000, 1000);
const rigidBody = new VisualPolygonBody({x: 0, y: 0}, [{x: 20, y: 10}, {x: -20, y: 10}, {x: -20, y: -10}, {x: 20, y: -10}], context, 0, 50, false);
world.addRigidBody('main', rigidBody);
```

`addRigidBody` 第一個參數是這個 rigidBody 的名字(目前好像沒什麼用，有點忘記當初為什麼把它加進去了 xD)

因為 `@niuee/bolt` 本身就已經把畫圖本身處理好了，你只需要在 `step` 裡面呼叫 world 的 `step` 就好，詳細怎麼在無限畫布上面作畫可以參考 Day 24 的文章


這樣畫面上就會有一個長方形出現。

我們可以用一樣的方式去增加其他的 RigidBody，因為這個 library 還是在初淺的開發階段，沒有太多文件，可能要翻一下原始碼才能知道怎麼確切使用，如果有問題也可以留言問我，或是等我補上文件 QAQ （事情太多做不完）或是也可以直接去用其他的物理模擬 library 。


## Demo 時間

既然都說是物理模擬了，只做點彈跳球撞牆壁好像有點太基本？所以我們進階一點，讓物理模擬是有發揮作用的，不然我們其實直接用動畫可能畫面的呈現還會比較好。（就是很軟Q的彈力球，會比用物理模擬的彈力球還要吸引人對吧？在視覺上啦）。

所以我決定做一個模擬直線運動機構(Roberts Linkage)的東西，其實我不確定它中文叫什麼。

但它就是一個可以在一定距離內畫出近直線的機構。[維基百科連結](https://zh.wikipedia.org/zh-tw/%E7%9B%B4%E7%B7%9A%E9%81%8B%E5%8B%95%E6%A9%9F%E6%A7%8B)

用 E 鍵會讓左邊的 link 往逆時針方向旋轉，並且帶動整個機構

用 R 鍵會讓左邊的 link 往順時針方向旋轉，並且帶動整個機構

三角形下面的那個頂點移動的軌跡在一定的距離內會是近直線（雖然我的物理模擬 library 還有很多最佳化空間，但是還是勉強可以模擬出來）

[Demo 連結在這裡](https://board.vntchang.dev/physics) 

[GitHub 連結在這裡](https://github.com/niuee/board-example)

好的，廢廢的 Demo 就是這樣，其實我本來是想做一個可以開戰車的小遊戲，但是無奈時間不太夠。
如果之後有做完再來更新～

希望這個 Demo 可以啟發大家更多的創意，可以想到光是物理模擬就有更多應用？

那我們明天見！

