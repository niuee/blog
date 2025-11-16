import { Board } from "@ue-too/board";
console.log('first page');

const canvas = document.getElementById('graph') as HTMLCanvasElement;

const board = new Board(canvas);
board.getCameraRig().panToWorld({x: 10, y: 10});

function step(timestamp: number) {
    board.step(timestamp);
    if(board.context == undefined) {
        return;
    }

    board.context.fillStyle = 'green';
    board.context.fillRect(10, 10, 100, 100);

    requestAnimationFrame(step);
}

requestAnimationFrame(step);
