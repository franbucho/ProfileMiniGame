import { EMAILJS_USER_ID, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID } from './config.js';

emailjs.init(EMAILJS_USER_ID);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const startBtn = document.getElementById('startBtn');

let snake, food, dx, dy, score, gameInterval;

function resetGame() {
  snake = [{ x: 160, y: 160 }];
  food = { x: 200, y: 200 };
  dx = dy = 0;
  score = 0;
  scoreDisplay.textContent = "Score: 0";
}

function draw() {
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw snake
  ctx.fillStyle = "#00ff88";
  snake.forEach(part => ctx.fillRect(part.x, part.y, 20, 20));

  // Draw food
  ctx.fillStyle = "red";
  ctx.fillRect(food.x, food.y, 20, 20);
}

function move() {
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };
  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreDisplay.textContent = `Score: ${score}`;
    food = {
      x: Math.floor(Math.random() * 20) * 20,
      y: Math.floor(Math.random() * 20) * 20
    };
  } else {
    snake.pop();
  }

  if (head.x < 0 || head.x >= 400 || head.y < 0 || head.y >= 400 || snake.slice(1).some(p => p.x === head.x && p.y === head.y)) {
    clearInterval(gameInterval);
    sendScore();
    alert("Game Over! Score: " + score);
  }
}

function sendScore() {
  const name = document.getElementById('playerName').value || 'Anonymous';

  fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(data => {
      const country = data.country_name || "Unknown";
      const ip = data.ip || "Unknown";

      const params = {
        player_name: name,
        player_score: score,
        player_ip: ip,
        player_country: country
      };

      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
        .then(() => console.log("Email sent"))
        .catch((err) => console.error("Email error", err));
    });
}

document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowUp': if (dy === 0) { dx = 0; dy = -20; } break;
    case 'ArrowDown': if (dy === 0) { dx = 0; dy = 20; } break;
    case 'ArrowLeft': if (dx === 0) { dx = -20; dy = 0; } break;
    case 'ArrowRight': if (dx === 0) { dx = 20; dy = 0; } break;
  }
});

startBtn.addEventListener('click', () => {
  resetGame();
  gameInterval = setInterval(() => {
    move();
    draw();
  }, 150);
});
