import { Board } from "@ue-too/board";

console.log('infinite canvas');
const canvas = document.getElementById('graph') as HTMLCanvasElement;

const board = new Board(canvas);
const canvasWidth = parseFloat(canvas.style.width);
const canvasHeight = parseFloat(canvas.style.height);

board.getCameraRig().panToWorld({x: canvasWidth / 2, y: canvasHeight / 2});

function step(timestamp: number) {
    board.step(timestamp);
    if(board.context == undefined) {
        return;
    }

    board.context.fillStyle = 'green';
    board.context.fillRect(10, 10, 150, 100);

    requestAnimationFrame(step);
}

requestAnimationFrame(step);
