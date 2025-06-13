const canvas = document.getElementById('snake');
const ctx = canvas.getContext('2d');
const box = 20; // tamaño del bloque
let score = 0;

// Snake inicial
let snake = [];
snake[0] = { x: 9 * box, y: 9 * box };

// Comida aleatoria
let food = {
  x: Math.floor(Math.random() * 19) * box,
  y: Math.floor(Math.random() * 19) * box
};

// Dirección inicial
let direction = '';

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' && direction !== 'RIGHT') direction = 'LEFT';
  if (e.key === 'ArrowUp' && direction !== 'DOWN') direction = 'UP';
  if (e.key === 'ArrowRight' && direction !== 'LEFT') direction = 'RIGHT';
  if (e.key === 'ArrowDown' && direction !== 'UP') direction = 'DOWN';
});

function draw() {
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, 400, 400);

  for (let i = 0; i < snake.length; i++) {
    ctx.fillStyle = i === 0 ? '#00ff88' : '#00cc77';
    ctx.fillRect(snake[i].x, snake[i].y, box, box);
  }

  ctx.fillStyle = '#ff0055';
  ctx.fillRect(food.x, food.y, box, box);

  let headX = snake[0].x;
  let headY = snake[0].y;

  if (direction === 'LEFT') headX -= box;
  if (direction === 'RIGHT') headX += box;
  if (direction === 'UP') headY -= box;
  if (direction === 'DOWN') headY += box;

  // Game Over
  if (
    headX < 0 || headX >= 400 || headY < 0 || headY >= 400 ||
    snake.some(segment => segment.x === headX && segment.y === headY)
  ) {
    clearInterval(game);
    alert('💀 Game Over - Final Score: ' + score);
    location.reload();
    return;
  }

  let newHead = { x: headX, y: headY };

  if (headX === food.x && headY === food.y) {
    score++;
    document.getElementById('score').innerText = 'Score: ' + score;
    food = {
      x: Math.floor(Math.random() * 19) * box,
      y: Math.floor(Math.random() * 19) * box
    };
  } else {
    snake.pop();
  }

  snake.unshift(newHead);
}

const game = setInterval(draw, 100);
