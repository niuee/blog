---
title: What Does the User Want?
published: 2026-01-08
author: vee
---

## Handling User Input
Web browser provides a wide range of event listeners for a web app to interpret user input. For example, the `mousedown` for when a user clicks on the element. These events are helpful for us to determine how the user wants to interact with the canvas. For an infinite canvas, there are mainly three user intentions: panning, zooming, and rotating. I used the word "intention" to differentiate the raw user input event from the user's intent.  

A click event may be all it takes to handle what the user wants to do for a button. But for an infinite canvas, most interactions involve more than one events. For example, to pan around the canvas, the user might need to hold down a modifier key and then drag the mouse. At the very least, the user would have to drag the mouse (in most infinite canvas applications.) Dragging along involves three kinds of event: `mousedown`, `mousemove`, and `mouseup`. If we directly tie these events to the panning behavior, we'll end up with a lot of conditional logic to handle different cases.

Below is a minimal implementation of the panning behavior using the event listeners.

```typescript
let isDragging = false;
let panStartPoint: {x: number, y: number} = {x: 0, y: 0};
function handlePointerDown(event: PointerEvent): void {
    isDragging = true;
    if(event.pointerType !== "mouse"){
            return;
    }
    if(event.button !== 1){
        return;
    }
    this.isPanning = true;
    this.panStartPoint = {x: event.clientX, y: event.clientY};
}

function handlePointerMove(event: PointerEvent): void {
    if(!this.isPanning){
        return;
    }

    const deltaX = event.clientX - this.panStartPoint.x;
    const deltaY = event.clientY - this.panStartPoint.y;
    this.panStartPoint = {x: event.clientX, y: event.clientY};

    // pan the canvas by the deltaX and deltaY
    canvas.pan({x: deltaX, y: deltaY});
}

function handlePointerUp(event: PointerEvent): void {
    if(!this.isPanning){
        return;
    }
    isDragging = false;
}
```

This is just for a drag $\rightarrow$ panning behavior. If we add in the modifier key, we'll introduce more conditional logic. 

```typescript
let isDragging = false;
let panStartPoint: {x: number, y: number} = {x: 0, y: 0};
let spacebarPressed = false;

function handleKeyDown(event: KeyboardEvent): void {
    if(event.key === "Space"){
        spacebarPressed = true;
    }
}

function handleKeyUp(event: KeyboardEvent): void {
    if(event.key === "Space"){
        spacebarPressed = false;
    }
}

function handlePointerDown(event: PointerEvent): void {
    isDragging = true;

    // we now need to check if the spacebar is pressed when the pointer is down
    if(!spacebarPressed){
        return;
    }
    if(event.pointerType !== "mouse"){
            return;
    }
    if(event.button !== 1){
        return;
    }
    this.isPanning = true;
    this.panStartPoint = {x: event.clientX, y: event.clientY};
}
```

This is prohibits the user from panning without a modifier key, and it might be simple enough to handle for now.
But hey! The user wants more!

- Middle mouse button panning without a modifier key
- panning with just the keyboard for a11y
- panning with trackpad

These kind of features pop up all the time later in the development phases, we'll need to add more conditional logic to the event handlers. And things get pretty messy pretty fast. If we have the panning directly be in the event handlers.

It might be tempting to add different sets of event handlers for different kinds of panning. This sounds like a good idea at first. Each set of event handlers would only be responsible for a single kind of panning. Here's the problem this approach might run into: when the two kind set of event handlers are both triggered, which one should take precedence? For example, we need dragging for panning and also for selection. When both are triggered, should we cancel panning and allow for selection? Or is it the other way around? 

It's difficult to coordinate between the two sets of event handlers. We would have to coordinate horizontally (between different features for the same kind of events) and vertically (between the event handlers within the same feature). There's also a possiblity that we have to coordinate diagonally (between different events of different features).

There's one more thing to consider: in the implementation above I have panning reduced to just `canvas.pan({x: deltaX, y: deltaY});` This could be an over simplification. Panning can be more complex when zooming is also involved. (you would have a lot of state to keep track of) If we were to use a canvas framework like fabric.js, we could easily pan using `canvas.relativePan({x: deltaX, y: deltaY});` But if we were to hand roll our own canvas panning, we should definitely consider extracting the panning logic into its own abstraction so we can use it like `canvas.relativePan({x: deltaX, y: deltaY});` and also reuse it for different kinds of input that triggers panning.

I used the separate sets of event handlers for awhile for the @ue-too/board library. But I quickly ran into the problems described above. The conditionals increased the cognitive load; more than often I would not be able to correctly predicts what a certain behavior would result in. For example, when a user initiates a selection process using a simple mouse drag, during the drag the user holds down the pan modifier key. What should the user expect to happen? 

It's easy to define the rules for the behavior of the canvas when we discover a new combination of inputs. But when all that rules are buried in the event handlers and the conditionals, it's easy to lose track, and inputs and their outcomes become unpredictable.

## State Machine to the Rescue (In my opinion)
My solution to the problem is to use a state machine.
