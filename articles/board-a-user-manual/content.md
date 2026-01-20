---
title: A User Manual on @ue-too/board
author: vee
published: 2026-01-13
tags: board, tutorial
---

## What is @ue-too/board?

Have you ever tried to build an infinite canvas on the web before?
If yes, you know the pain of hand rolling the coordinate conversion between the canvas and the browser window, or determining what kind of touch gesture would trigger a zooming effect. 

If you've never worked with HTML canvas, the element itself is straightforward, you tell the context of the element where and what to draw and that's pretty much it. The rest is up to you. Viewport navitation APIs are non existent. Panning or zooming? You're on your own. If you use canvas framework like fabric.js, pixi.js, or konva.js. They have tutorials on how to implement these basic viewport navigating operations you can easily follow. But if not planned carefully, the panning and zooming logic might be spread out across multiple event handlers which can be hard to main tain after a while. 

I present to you a new and possibly better choice! [@ue-too/board](https://www.npmjs.com/package/@ue-too/board) (I'm going to refer to it as board for brevity), this is a library that focus solely on camera/viewport management for canvas on web application. Whether it's just vanilla canvas, canvas frameworks, or even svg element, board can be of assistance. I am also working on integration with frontend frameworks/libraries: React, Vue, etc. (next in line is probably Svelte.) If any of the following features appeals to you, give it a try!

- Trying to keep it minimal and modular: You don't want to introduce a whole canvas framework just so you can let user to zoom in on a specific point on canvas. Board is designed to be modular take only what you need.
- Simplified math: Coordinate conversion is messing up the user interactions for your canvas. Board provides different viewport navigation APIs to do the heavy lifting for you.
- Versatile input support: You need support for touch, keyboard and mouse, and trackpad for all the navigating operations. Board got you covered. Pinch to zoom, check! Spacebar + drag to pan, check! Keyboard shortcuts, check! And more are on the way.
- A little bit of something different: You need rotation on the canvas (not just rotating an object in your scene but the whole scene.) Even though most of the infinite canvas application doesn't necessarily need this, board can handle it. The tutorials 

## What does @ue-too/board do?
Let me grab an example from MDN for the canvas element. [link for reference](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

It's just a demo on how to draw a rectangle on a canvas element.

```html
<canvas id="canvas"></canvas>
```

```javascript
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

ctx.fillStyle = "green";
ctx.fillRect(10, 10, 150, 100);
```
The result is as below. Inspect away! This is a real canvas not just a screen shot.

<canvas id="raw-canvas">Your browser does not support HTML canvas!</canvas>
<script module>
    const canvas = document.getElementById("raw-canvas");
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "green";
    ctx.fillRect(10, 10, 150, 100);
</script>


Now if we let board take control of the viewport, the canvas would look like this:

<canvas id="graph" class="example-canvas" style="width: 300px; height: 150px;">Your browser does not support HTML canvas!</canvas>
<p class="image-caption">Not much of a difference visually, but the canvas is now interactive.</p>
<script src="./main.ts" type="module"></script>

You can pan around and zoom in and out of the canvas now.

- Touch screen and trackpad: Pinch to zoom, swipe to pan.
- Keyboard and mouse: Spacebar + drag to pan, scroll wheel + the control key to zoom. (You can also use the middle mouse button to pan.)

You can also check out the [board demo page](https://ue-too.github.io/ue-too/) for more examples. The examples are all very minimalistic and only covers the basic features. (it says dev server on the top of the page but it's actually just a demo site. I forgot to change the title.) And this is basically what board is for, viewport management, simple yet a critical component for any infinite canvas application.

## How to get started? 

I want to first mention that there's a documentation site for board right [here](https://ue-too.github.io/documentation/). It has everthing just not as organized as this is a work in progress. The current version of the documentation is for the v0.14.0 of the library. Only the latest version is documented as I haven't figure out how to version the documentation in vitepress. If there's anything you cannot find, please let me know in the github issues and I'll get to it as soon as possible and update the documentation.

### Installation

You can install board via npm or yarn or which ever package manager you prefer.

```bash
npm install @ue-too/board # substitute yarn or pnpm for your preferred package manager
```

### Basic Usage

Board strives to be as fricitionless as possible for basic usage. There's a `Board` class that handles most of the setup. However, there's still some boilerplate code to write to get the board to work. Let's start with the example mentioned above. 

The original code from the MDN documentation is as follows:

```typescript
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

ctx.fillStyle = "green";
ctx.fillRect(10, 10, 150, 100);
```

To let board take control of the canvas' viewport, we need to create a `Board` instance and pass the canvas element to it.

```typescript
import { Board } from "@ue-too/board";

const board = new Board(canvas); // canvas element from the DOM
```

Now, since what's drawn on the canvas is there to stay, in order to create an 'illusion' of panning and zooming, we need to clear the canvas and redraw the scene with new viewport attributes(position, zoom level, etc.) You can do this when the viewport has been updated or just do this in a `requestAnimationFrame` loop. 

```typescript
function step(timestamp: number) {
    board.step(timestamp); // pass the timestamp to the board to update the viewport
}

requestAnimationFrame(step);

```

Done! Now board is taking control of the canvas viewport. But there's nothing on the canvas yet. So let's draw the green rectangle back but this time, we'll do it in the step function.

```typescript
function step(timestamp: number) {
    board.step(timestamp);
    // board context can be undefined so we need to check for that first
    if(board.context == undefined) {
        return;
    }

    board.context.fillStyle = 'green';
    board.context.fillRect(10, 10, 150, 100);

    requestAnimationFrame(step);
}
```

That's it! We basically recreated the example I showed above. 

## The Camera

The camera (or viewport) is the core concept of board. It determines what portion of your infinite canvas is visible to the user, at what zoom level, and from what angle. Board provides both default input handling for intuitive camera control and programmatic APIs for when you need more control.

### Default Camera Controls

When you create a `Board` instance, it automatically sets up camera controls that work across different input devices:

- **Panning:**
  - Mouse + Keyboard: Hold **Spacebar** and drag, or drag with the middle mouse button
  - Trackpad: Two-finger swipe
  - Touch: Two-finger swipe

- **Zooming:**
  - Mouse + Keyboard: Hold **Ctrl** (or **Cmd** on Mac) and scroll the wheel
  - Trackpad: Pinch gesture
  - Touch: Two-finger pinch

- **Rotation:**
  - Trackpad: Rotate gesture (two or three fingers depending on device)
  - Touch: Rotate gesture

These default controls are usually sufficient for most use cases. But if you need to programmatically control the camera, or customize the input behavior, board provides APIs for that.

### Programmatic Camera Control

Board exposes the camera through the `getCameraRig()` method. This gives you access to the camera's state and methods to control it programmatically.

#### Panning to a World Position

You can pan the camera to center on a specific point in your canvas world coordinates:

```typescript
const board = new Board(canvas);

// Pan to center the view on a specific world coordinate
board.getCameraRig().panToWorld({ x: 100, y: 200 });
```

This is useful when you want to focus on a specific object or region of your canvas. For example, you might want to center the view when a user clicks on an item, or when loading a saved view state.

#### Getting and Setting Camera Properties

The camera rig provides access to various camera properties:

```typescript
const cameraRig = board.getCameraRig();

// Get current camera position
const position = cameraRig.getPosition();
console.log(`Camera at: x=${position.x}, y=${position.y}`);

// Get current zoom level
const zoom = cameraRig.getZoom();
console.log(`Current zoom: ${zoom}`);

// Set zoom level
cameraRig.setZoom(2.0); // Zoom in 2x

// Set camera position
cameraRig.setPosition({ x: 50, y: 75 });
```

#### Zooming to a Specific Point

When you zoom, you often want to zoom towards a specific point on the canvas (like where the mouse cursor is). Board provides methods for this:

```typescript
// Zoom in/out towards a specific world coordinate
cameraRig.zoomToWorld({ x: 100, y: 200 }, 1.5); // Zoom to 1.5x at point (100, 200)

// Or zoom towards a screen coordinate (useful when responding to mouse position)
cameraRig.zoomToScreen({ x: 300, y: 200 }, 0.5); // Zoom out to 0.5x at screen point (300, 200)
```

#### Coordinate Conversion

One of the most common tasks when working with canvas viewports is converting between screen coordinates (where the user clicked) and world coordinates (where that point is in your canvas space). Board provides helper methods for this:

```typescript
// Convert screen coordinates to world coordinates
const worldPos = cameraRig.screenToWorld({ x: 300, y: 200 });
console.log(`Screen (300, 200) is at world (${worldPos.x}, ${worldPos.y})`);

// Convert world coordinates to screen coordinates
const screenPos = cameraRig.worldToScreen({ x: 100, y: 50 });
console.log(`World (100, 50) is at screen (${screenPos.x}, ${screenPos.y})`);
```

This is especially useful when handling click events - you get screen coordinates from the event, but you need world coordinates to determine what object the user clicked on.

#### Setting Zoom Bounds

You can restrict the zoom level to prevent users from zooming too far in or out:

```typescript
cameraRig.setZoomBounds({
  min: 0.1,  // Can't zoom out more than 10%
  max: 5.0   // Can't zoom in more than 5x
});
```

#### Resetting the Camera

If you want to reset the camera to its initial state:

```typescript
cameraRig.reset();
```

This will reset the camera position, zoom, and rotation to their default values.

### Camera in the Render Loop

Remember that camera transforms are applied when you call `board.step(timestamp)` in your render loop. Any drawing you do after that call will be transformed by the current camera state:

```typescript
function step(timestamp: number) {
    board.step(timestamp); // Camera transforms are applied here
    
    if (board.context == undefined) {
        return;
    }

    // All drawing after board.step() will be affected by the camera
    board.context.fillStyle = 'green';
    board.context.fillRect(10, 10, 150, 100);
    
    requestAnimationFrame(step);
}
```

### Example: Centering on an Object

Here's a practical example that combines several camera methods. Let's say you want to center the view on an object when the user clicks on it:

```typescript
const board = new Board(canvas);
const cameraRig = board.getCameraRig();

canvas.addEventListener('click', (event) => {
    // Get the click position in screen coordinates
    const screenPos = { x: event.clientX, y: event.clientY };
    
    // Convert to world coordinates
    const worldPos = cameraRig.screenToWorld(screenPos);
    
    // Check if we clicked on an object (simplified example) you have to come up with your own implementation to check if the clicked position is on an object or not.
    if (isObjectAtPosition(worldPos)) {
        // Center the camera on the clicked object
        cameraRig.panToWorld(worldPos);
        // Optionally zoom in a bit
        cameraRig.zoomToWorld(worldPos, 2.0);
    }
});
```

The camera API in board is designed to be intuitive and flexible. Whether you're building a simple infinite canvas or a complex application with custom navigation behaviors, board's camera system gives you the tools you need to create a smooth user experience.
























