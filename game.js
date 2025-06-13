// game.js

// ⚠️ PLACEHOLDERS - Serán reemplazados automáticamente por GitHub Actions
const EMAILJS_USER_ID = 'EMAILJS_USER_ID_PLACEHOLDER';
const EMAILJS_SERVICE_ID = 'EMAILJS_SERVICE_ID_PLACEHOLDER';
const EMAILJS_TEMPLATE_ID = 'EMAILJS_TEMPLATE_ID_PLACEHOLDER';

// El resto del código es idéntico
emailjs.init(EMAILJS_USER_ID);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const startBtn = document.getElementById('startBtn');

const leaderboardList = document.getElementById('leaderboardList');
const clearLeaderboardBtn = document.getElementById('clearLeaderboardBtn');

let snake, food, dx, dy, score, gameInterval;
let gridSize = 20;

function resizeCanvas() {
  const containerWidth = canvas.parentElement.clientWidth;
  canvas.width = containerWidth > 400 ? 400 : containerWidth;
  canvas.height = canvas.width;
}
window.addEventListener('resize', () => {
  resizeCanvas();
  draw();
});
resizeCanvas();

function getCellSize() {
  return canvas.width / gridSize;
}

function resetGame() {
  snake = [{ x: 8, y: 8 }];
  food = {
    x: Math.floor(Math.random() * gridSize),
    y: Math.floor(Math.random() * gridSize)
  };
  dx = 1;
  dy = 0;
  score = 0;
  scoreDisplay.textContent = "Score: 0";
}

function draw() {
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cellSize = getCellSize();

  ctx.fillStyle = "#00ff88";
  snake.forEach(part => {
    ctx.fillRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize);
  });

  ctx.fillStyle = "red";
  ctx.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
}

function move() {
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };

  if (
    head.x < 0 || head.x >= gridSize ||
    head.y < 0 || head.y >= gridSize ||
    snake.slice(1).some(p => p.x === head.x && p.y === head.y)
  ) {
    clearInterval(gameInterval);
    sendScore();
    alert("Game Over! Score: " + score);
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreDisplay.textContent = `Score: ${score}`;
    do {
      food = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize)
      };
    } while (snake.some(p => p.x === food.x && p.y === food.y));
  } else {
    snake.pop();
  }
}

document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowUp': if (dy === 0) { dx = 0; dy = -1; } break;
    case 'ArrowDown': if (dy === 0) { dx = 0; dy = 1; } break;
    case 'ArrowLeft': if (dx === 0) { dx = -1; dy = 0; } break;
    case 'ArrowRight': if (dx === 0) { dx = 1; dy = 0; } break;
  }
});

function getLeaderboard() {
  const data = localStorage.getItem('profileMiniGameLeaderboard');
  return data ? JSON.parse(data) : [];
}

function saveLeaderboard(board) {
  localStorage.setItem('profileMiniGameLeaderboard', JSON.stringify(board));
}

function addScoreToLeaderboard(name, score) {
  const board = getLeaderboard();
  board.push({ name, score });
  board.sort((a, b) => b.score - a.score);
  if (board.length > 10) board.length = 10;
  saveLeaderboard(board);
}

function renderLeaderboard() {
  const board = getLeaderboard();
  leaderboardList.innerHTML = '';
  if (board.length === 0) {
    leaderboardList.innerHTML = '<li>No scores yet</li>';
    return;
  }
  board.forEach(({ name, score }) => {
    const li = document.createElement('li');
    li.textContent = `${name} - ${score}`;
    leaderboardList.appendChild(li);
  });
}

clearLeaderboardBtn.addEventListener('click', () => {
  localStorage.removeItem('profileMiniGameLeaderboard');
  renderLeaderboard();
});

function sendScore() {
  const name = document.getElementById('playerName').value.trim() || 'Anonymous';

  addScoreToLeaderboard(name, score);
  renderLeaderboard();

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

startBtn.addEventListener('click', () => {
  clearInterval(gameInterval);
  resetGame();
  gameInterval = setInterval(() => {
    move();
    draw();
  }, 150);
});

renderLeaderboard();