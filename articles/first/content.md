---
title: First Blog
published: 2025-01-20
author: vee
---
# First Blog

## Why?

To answer the how, I first want to preface with why. If you have worked with the HTML canvas element, you'll know that its no more than an image. You can draw a lot of cool stuff with it, but in it's vanilla state, there's no way for the user to interact with it. You can't pan, zoom, or rotate. What's drawn is static. Let's look at the example from the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas) for the canvas element.

`test`.

```html
<canvas id="canvas" width="200" height="200"></canvas>
<script>
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'green';
  ctx.fillRect(10, 10, 100, 100);
</script>
```

```typescript
function greet(name) {
  return "Hello, " + name;
}
```

<canvas id="canvas" style="width: 100%"></canvas>
<canvas id="graph" style="width: 100%"></canvas>
<script>
  const canvas = document.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "green";
  ctx.fillRect(10, 10, 100, 100);
</script>

## Subheading

Add more paragraphs, lists, and content as needed. The content will be automatically centered and constrained to a readable width.

<p align="center">
  <img src="test.png" alt="Test Image" class="image-shadow image-rounded" style="object-fit: contain; width: 100%; height: 100%;"/>
</p>

The quadratic formula is:

$$
x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}
$$