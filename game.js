// --- CÓDIGO TEMPORAL SOLO PARA LA PRUEBA ---

const EMAILJS_USER_ID = 'PMOEIYlzOvdOcA2l5';         // Tu Public Key
const EMAILJS_SERVICE_ID = 'service_lk8e0nv';    // Tu Service ID real
const EMAILJS_TEMPLATE_ID = 'template_xjhieh3'; // Tu Template ID real

// --- FIN DEL CÓDIGO DE PRUEBA ---

// Inicialización de EmailJS
emailjs.init(EMAILJS_USER_ID);

// Elementos del DOM
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const startBtn = document.getElementById('startBtn');
const leaderboardList = document.getElementById('leaderboardList');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const playAgainBtn = document.getElementById('playAgainBtn');

// Variables del juego
let snake, food, dx, dy, score, gameInterval;
let gridSize = 20;

// --- FUNCIONES DEL JUEGO ---

function startGame() {
  if (gameInterval) clearInterval(gameInterval);
  gameOverScreen.style.display = 'none';
  resetGame();
  draw();
  gameInterval = setInterval(() => {
    move();
    draw();
  }, 150);
}

function showGameOver() {
  clearInterval(gameInterval);
  gameInterval = null; // Marcar que el juego no está activo
  sendScore();
  finalScoreDisplay.textContent = score;
  gameOverScreen.style.display = 'flex';
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
  if (!snake) return; // Previene error de dibujado antes de iniciar
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cellSize = canvas.width / gridSize;
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
    showGameOver();
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
  if (!gameInterval) return; // No mover si el juego no está activo
  switch (e.key) {
    case 'ArrowUp': if (dy === 0) { dx = 0; dy = -1; } break;
    case 'ArrowDown': if (dy === 0) { dx = 0; dy = 1; } break;
    case 'ArrowLeft': if (dx === 0) { dx = -1; dy = 0; } break;
    case 'ArrowRight': if (dx === 0) { dx = 1; dy = 0; } break;
  }
});

// --- FUNCIONES DEL LEADERBOARD ---

function getLeaderboard() { return JSON.parse(localStorage.getItem('profileMiniGameLeaderboard')) || []; }
function saveLeaderboard(board) { localStorage.setItem('profileMiniGameLeaderboard', JSON.stringify(board)); }

function addScoreToLeaderboard(name, score) {
  const board = getLeaderboard();
  board.push({ name, score });
  board.sort((a, b) => b.score - a.score);
  if (board.length > 10) board.length = 10; // Mantener solo el top 10
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

// --- FUNCIÓN DE ENVÍO DE CORREO ---

function sendScore() {
  const name = document.getElementById('playerName').value.trim() || 'Anonymous';
  addScoreToLeaderboard(name, score);
  renderLeaderboard();
  
  fetch('https://ipapi.co/json/')
    .then(res => res.ok ? res.json() : Promise.reject('Network response was not ok'))
    .catch(error => {
      console.warn('IP lookup failed. Sending email with default location data.', error);
      return { country_name: "Not available", ip: "Not available" };
    })
    .then(data => {
      const params = {
        player_name: name,
        player_score: score,
        player_ip: data.ip || "Unknown",
        player_country: data.country_name || "Unknown"
      };
      console.log('Sending email with these params:', params);
      return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
    })
    .then(() => console.log("Email sent successfully!"))
    .catch(err => console.error("EmailJS send failed:", err));
}

// --- EVENT LISTENERS E INICIALIZACIÓN ---

startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', startGame);
renderLeaderboard();
