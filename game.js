// --- Claves Reales ---
const EMAILJS_USER_ID = 'PMOEIYlzOvdOcA2l5';
const EMAILJS_SERVICE_ID = 'service_lk8e0nv';
const EMAILJS_TEMPLATE_ID = 'template_xjhieh3';

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

// Controles Móviles
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');


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
  gameInterval = null;
  sendSmartNotification();
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
  if (!snake) return;
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

// --- CONTROLES (TECLADO Y MÓVIL) ---

function handleDirectionChange(newDx, newDy) {
    if (!gameInterval) return;
    if ((newDx !== 0 && dx === -newDx) || (newDy !== 0 && dy === -newDy)) {
        return; // Prevenir que la serpiente se invierta sobre sí misma
    }
    dx = newDx;
    dy = newDy;
}

document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowUp': handleDirectionChange(0, -1); break;
    case 'ArrowDown': handleDirectionChange(0, 1); break;
    case 'ArrowLeft': handleDirectionChange(-1, 0); break;
    case 'ArrowRight': handleDirectionChange(1, 0); break;
  }
});

// Usamos 'touchstart' para una respuesta más rápida en móviles
upBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirectionChange(0, -1); });
downBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirectionChange(0, 1); });
leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirectionChange(-1, 0); });
rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirectionChange(1, 0); });


// --- FUNCIONES DEL LEADERBOARD (MEJORADAS) ---

function getLeaderboard() { return JSON.parse(localStorage.getItem('profileMiniGameLeaderboard_v2')) || []; }
function saveLeaderboard(board) { localStorage.setItem('profileMiniGameLeaderboard_v2', JSON.stringify(board)); }

function addScoreToLeaderboard(name, newScore) {
  let board = getLeaderboard();
  const playerIndex = board.findIndex(p => p.name.toLowerCase() === name.toLowerCase());

  if (playerIndex > -1) {
    if (newScore > board[playerIndex].score) {
      board[playerIndex].score = newScore;
    }
  } else {
    board.push({ name, score: newScore });
  }

  board.sort((a, b) => b.score - a.score);
  if (board.length > 10) board.length = 10;
  saveLeaderboard(board);
  return board;
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

// --- FUNCIÓN DE ENVÍO DE CORREO INTELIGENTE ---

function sendSmartNotification() {
  const name = document.getElementById('playerName').value.trim() || 'Anonymous';
  const currentScore = score;
  const oldHighScore = parseInt(localStorage.getItem('profileMiniGameHighScore') || '0');

  const updatedBoard = addScoreToLeaderboard(name, currentScore);
  renderLeaderboard();
  
  let shouldSendEmail = false;
  let emailReason = "";
  
  if (currentScore > 0 && currentScore >= oldHighScore) {
    shouldSendEmail = true;
    emailReason = currentScore > oldHighScore ? "New High Score!" : "Tied High Score!";
    localStorage.setItem('profileMiniGameHighScore', currentScore);
  }

  const playerIndex = updatedBoard.findIndex(p => p.name.toLowerCase() === name.toLowerCase() && p.score === currentScore);
  if (playerIndex !== -1 && playerIndex < 5 && !shouldSendEmail) {
      shouldSendEmail = true;
      emailReason = "Entered Top 5!";
  }

  if (!shouldSendEmail) {
    console.log("Score not high enough for a notification. No email sent.");
    return;
  }
  
  fetch('https://ipapi.co/json/')
    .then(res => res.ok ? res.json() : Promise.reject('Network response was not ok'))
    .catch(error => {
      console.warn('IP lookup failed.', error);
      return { country_name: "Not available", ip: "Not available" };
    })
    .then(data => {
      const params = {
        player_name: `${name} (${emailReason})`,
        player_score: currentScore,
        player_ip: data.ip || "Unknown",
        player_country: data.country_name || "Unknown"
      };
      console.log('Sending SMART notification with these params:', params);
      return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
    })
    .then(() => console.log("Smart notification sent successfully!"))
    .catch(err => console.error("EmailJS send failed:", err));
}

// --- EVENT LISTENERS E INICIALIZACIÓN ---

startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', startGame);
renderLeaderboard();