---
title: How I Built an Infinite Canvas: the why
published: 2025-11-05
author: vee
---

<div class="remark">This is going to be a series of articles on disecting the source code and the design decisions of the infinite canvas tool kit library <a target="_blank" href="https://www.npmjs.com/package/@ue-too/board">@ue-too/board</a>.</div>

# How I Built an Infinite Canvas

## What is an Infinite Canvas?

Web applications like [figma](https://www.figma.com/), [miro](https://miro.com/), [whimsical](https://whimsical.com/), [excalidraw](https://excalidraw.com/), [tldraw](https://www.tldraw.com/), and [team one](https://teamone.viewsonic.com) are all using infinite canvases. If you've used any of these tools, you've probably seen the infinite canvas in action. Infinite canvas allows user to zoom in and out and pan around the canvas. It is not bounded by the traditional way of 1 axis scrolling. It's like a giant drawing board that you can scatter ideas on and move them around. The [Infinite Canvas](https://infinitecanvas.tools/) website has a great explanation of the concept. Seeing the star growing rate of the excalidraw and tldraw, we can see that the concept gained more traction since the pandemic.

## Doesn't HTML canvas support this out of the box?

Unfortunately, the HTML canvas element does not support this out of the box. Every application mentioned above has their own implementation of the infinite canvas. Let me show you a bare minimal example of turning a canvas element into an infinite canvas. I'll use the canvas elemenet example from the [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) documentation. It's a simple example of drawing a green rectangle on the canvas.

```html
<canvas id="canvas"></canvas>
```

```javascript
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

ctx.fillStyle = "green";
ctx.fillRect(10, 10, 150, 100);
```

<canvas id="canvas" class="example-canvas">Your browser does not support the canvas element.</canvas>
<p class="image-caption">This is an actual canvas element not a screenshot</p>

<script>
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    // canvas.style.width = canvas.offsetWidth;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.fillStyle = "green";
    ctx.fillRect(10, 10, 150, 100);
</script>

You can see that the rectangle is drawn on the canvas. But it's just like a static image. There's no way to interact with the elements on the canvas. This is what canvas is essentially is, a static image.

Canvas element transformed into an infinite canvas would be like this:
<canvas id="graph" class="example-canvas">Your browser does not support the canvas element.</canvas>
<p class="image-caption">The canvas is now interactive.</p>

You can pan the canvas using:
- keyboard and mouse: middle mouse button or left mouse button while holding down the spacebar
- trackpad: two finger swipe
- touch screen: two finger swipe

You can zoom in and out using:
- keyboard and mouse: scroll wheel + ctrl key
- trackpad: two finger pinch
- touch screen: two finger pinch

You can easily see how the canvas is much more interactive now. There are many more features that can be added to the canvas. But this is a good starting point.

## Why Bother Building One from Scratch?

Given the popularity of infinite canvas applications, there are many libraries that can help on building an infinite canvas. So why did I decide to build one from scratch? 

At the time I was working on a horse racing simulation game as a side project. I needed a way to model out the race tracks in real life in order to run the simulation. I tried building an online 2D bezier curve editor. I wasn't familiar with the concept of infinite canvas at the time, but I did manage to find an example using the keywords: "html", "canvas", "pan". This is the [codepen](https://codepen.io/chengarda/pen/wRxoyB) that I found and it was a great starting point. 

Only after I already had the early version of the @ue-too/board library, I realized that I was actually building an infinite canvas library. That's when I also started to survey the landscape of the infinite canvas libraries and found that none of them satisfies my requirements.

I was looking for four main things:

- __Independent of any framework__: not just frontend framework but also the canvas framework; it should be able to work with any canvas framework but not tied to any specific one.
- __Easy to use__: since there are some maths involved, I want it to have intuitive API.
- __Customizable__: a some sort of plugin system to allow users to customize the behavior of the infinite canvas.
- __Flexible__: I was planning to have an offscreen canvas in the worker thread. I need the library to also be able to handle the offscreen canvas.

I'll list out some of the libraries that I've surveyed and why I didn't choose them. Maybe some of them are exactly what you're looking for.

- [pixi-viewport](https://github.com/pixijs-userland/pixi-viewport): it's a great library and it's the closest to what I want. But it's tied to the pixi.js framework; the plugin system is exactly what I initially planned for @ue-too/board but then I realized that I needed to have a more flexible plugin system. pixi-viewport's plugin is tied to the event handlers but not all behaviors are directly related to those.
- [infinite-canvas](https://infinite-canvas.org/): it wraps around the canvas 2D rendering context and provides a way to actually draw lines or geometries on the canvas that extends to infinity. Although it does come with some viewport management features, there are too many other features that I don't need. 
- [scroller](https://github.com/pbakaus/scroller): it's a standalone library that is independent of any framework but when I surveyed the library it not was being activly maintained. But seems like the author is making new updates recently.

In the next article, I'll start to dissect the source code of @ue-too/board.
