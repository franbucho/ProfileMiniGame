import { EMAILJS_USER_ID, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID } from './config.js';

emailjs.init(EMAILJS_USER_ID);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const startBtn = document.getElementById('startBtn');

const leaderboardList = document.getElementById('leaderboardList');
const clearLeaderboardBtn = document.getElementById('clearLeaderboardBtn');

let snake, food, dx, dy, score, gameInterval;
let gridSize = 20;  // cantidad de cuadros horizontales y verticales

// Ajustar tamaño del canvas para que siempre sea cuadrado y responsivo
function resizeCanvas() {
  const containerWidth = canvas.parentElement.clientWidth;
  canvas.width = containerWidth > 400 ? 400 : containerWidth;
  canvas.height = canvas.width; // Mantener cuadrado
}
window.addEventListener('resize', () => {
  resizeCanvas();
  draw();
});
resizeCanvas();

// Tamaño en pixeles de cada celda, según tamaño actual del canvas y gridSize
function getCellSize() {
  return canvas.width / gridSize;
}

function resetGame() {
  // Colocamos la serpiente en medio de la grilla (coordenadas en número de celdas)
  snake = [{ x: 8, y: 8 }];
  // La comida en otra posición al azar
  food = {
    x: Math.floor(Math.random() * gridSize),
    y: Math.floor(Math.random() * gridSize)
  };
  dx = 1;  // Movimiento a la derecha (en celdas)
  dy = 0;
  score = 0;
  scoreDisplay.textContent = "Score: 0";
}

function draw() {
  // Fondo
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cellSize = getCellSize();

  // Dibujar serpiente
  ctx.fillStyle = "#00ff88";
  snake.forEach(part => {
    ctx.fillRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize);
  });

  // Dibujar comida
  ctx.fillStyle = "red";
  ctx.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
}

function move() {
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };

  // Checkear límites y choque con cuerpo
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
    // Reubicar comida (evitar que salga encima de la serpiente)
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

// --- Leaderboard functions ---
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
  if (board.length > 10) board.length = 10; // Solo top 10
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

// Mostrar leaderboard al cargar la página
renderLeaderboard();
