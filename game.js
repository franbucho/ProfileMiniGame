// --- Configuración ---
const firebaseConfig = {
  apiKey: "AIzaSyBpAWJ6ZVO5oLfyLpC8cZNdiTk6lt1-HFo",
  authDomain: "profile-minigame.firebaseapp.com",
  projectId: "profile-minigame",
  storageBucket: "profile-minigame.firebasestorage.app",
  messagingSenderId: "735696613558",
  appId: "1:735696613558:web:2e00a498dbd0a94552f617",
  measurementId: "G-44R9BSN7CQ"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const EMAILJS_USER_ID = 'PMOEIYlzOvdOcA2l5';
const EMAILJS_SERVICE_ID = 'service_lk8e0nv';
const EMAILJS_TEMPLATE_ID = 'template_xjhieh3';
emailjs.init(EMAILJS_USER_ID);

// --- Efectos de Sonido ---
const eatSound = new Audio('audio/eat.wav');
const gameOverSound = new Audio('audio/gameover.wav');
const backgroundMusic = new Audio('audio/music.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.3;

// --- Elementos del DOM ---
const setupScreen = document.getElementById('setupScreen');
const gameScreen = document.getElementById('gameScreen');
const playerNameInput = document.getElementById('playerName');
const startBtn = document.getElementById('startBtn');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const playCounterDisplay = document.getElementById('playCounterDisplay');
const leaderboardList = document.getElementById('leaderboardList');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const playAgainBtn = document.getElementById('playAgainBtn');
const lobbyBtn = document.getElementById('lobbyBtn');
const muteBtn = document.getElementById('muteBtn');
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const boostBtn = document.getElementById('boostBtn');
const twitterShareBtn = document.getElementById('twitterShareBtn');
const whatsappShareBtn = document.getElementById('whatsappShareBtn');

// --- Variables del Juego ---
let snake, food, dx, dy, score, gameInterval;
let gridSize = 30; // <-- SERPIENTE MÁS DELGADA
const NORMAL_SPEED = 120; // Un poco más rápido por defecto
const BOOST_SPEED = 50;
let currentSpeed = NORMAL_SPEED;
let isMuted = false;


// --- Funciones de Flujo del Juego ---
function showSetupScreen() {
    gameOverScreen.classList.remove('visible');
    gameScreen.style.display = 'none';
    setupScreen.style.display = 'block';
    // Hacemos visibles los elementos que estaban ocultos con el juego
    document.getElementById('leaderboard').style.display = 'block';
    document.querySelector('.game-info').style.display = 'none'; // Ocultar score/plays en el lobby
}

function showGameScreen() {
    const name = playerNameInput.value.trim();
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (name === '') { alert('Please enter your name.'); return; }
    if (!nameRegex.test(name)) { alert('Name can only contain letters and spaces.'); return; }
    
    if (!isMuted && backgroundMusic.paused) {
        backgroundMusic.play().catch(e => console.error("Audio autoplay was blocked.", e));
    }
    
    setupScreen.style.display = 'none';
    document.getElementById('leaderboard').style.display = 'none';
    gameScreen.style.display = 'flex';
    document.querySelector('.game-info').style.display = 'flex';
    runGame();
}

function runGame() {
  if (gameInterval) clearInterval(gameInterval);
  currentSpeed = NORMAL_SPEED;
  updatePlayCount();
  resetGame();
  draw();
  gameInterval = setInterval(() => { move(); draw(); }, currentSpeed);
}

function initiateGameOverSequence() {
    if (!gameInterval) return;
    gameOverSound.play();
    clearInterval(gameInterval);
    gameInterval = null;
    canvas.classList.add('snake-hit');
    setTimeout(() => {
        canvas.classList.remove('snake-hit');
        processEndOfGame();
        finalScoreDisplay.textContent = score;
        gameOverScreen.classList.add('visible');
    }, 600);
}


// --- Lógica del Juego ---
function resetGame() {
  snake = [{ x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) }];
  food = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
  dx = 1; dy = 0; score = 0;
  scoreDisplay.textContent = "Score: 0";
}

function draw() {
  if (!snake) return;
  ctx.fillStyle = "#2c2c2c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cellSize = canvas.width / gridSize;
  const cornerRadius = gridSize > 25 ? 2 : 4; // Menos radio si los cuadros son más pequeños
  ctx.fillStyle = "#ff4444";
  ctx.beginPath();
  ctx.arc(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, cellSize / 2.2, 0, 2 * Math.PI);
  ctx.fill();
  snake.forEach((part, index) => {
    ctx.fillStyle = (index === 0) ? "#00ff88" : "#00dd77";
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize, [cornerRadius]);
        ctx.fill();
    } else {
        ctx.fillRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize);
    }
  });
}

function move() {
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };
  if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize || snake.slice(1).some(p => p.x === head.x && p.y === head.y)) {
    initiateGameOverSequence();
    return;
  }
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    eatSound.play();
    scoreDisplay.textContent = `Score: ${score}`;
    do {
      food = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
    } while (snake.some(p => p.x === food.x && p.y === food.y));
  } else {
    snake.pop();
  }
}


// --- Controles ---
function handleDirectionChange(newDx, newDy) { /* ... sin cambios ... */ }
function setSpeed(speed) { /* ... sin cambios ... */ }
// ... (Todos los listeners de teclado y botones sin cambios) ...

// --- Lógica Central de Fin de Partida ---
async function processEndOfGame() { /* ... sin cambios ... */ }

// --- Funciones de Firebase ---
async function updatePlayCount(isInitialLoad = false) { /* ... sin cambios ... */ }
async function getLeaderboard() {
    const leaderboardRef = db.collection('leaderboard').orderBy('score', 'desc').limit(100);
    const snapshot = await leaderboardRef.get();
    const board = [];
    snapshot.forEach(doc => {
        board.push({ id: doc.id, ...doc.data() });
    });
    return board;
}
async function addScoreToLeaderboard(name, newScore, country, countryCode) { /* ... sin cambios ... */ }
function renderLeaderboard(board) { /* ... sin cambios ... */ }

// --- ENVÍO DE CORREO ---
async function sendSmartNotification(name, currentScore, country, boardBefore, boardAfter, seenCountries, locationData) {
    if (currentScore === 0) {
        console.log("Score is 0, no notification sent.");
        return;
    }
    // ... (resto de la lógica de email sin cambios) ...
}

// --- Lógica de Audio y Compartir ---
function toggleMute() { /* ... sin cambios ... */ }
function shareToTwitter() { /* ... sin cambios ... */ }
function shareToWhatsApp() { /* ... sin cambios ... */ }


// --- INICIALIZACIÓN ---
async function initialLoad() {
    const savedMuteState = localStorage.getItem('gameMuted');
    if (savedMuteState === 'true') {
        isMuted = true;
        backgroundMusic.muted = true;
        muteBtn.textContent = '🔇';
    }
    // No cargamos el leaderboard al inicio, solo en el lobby
    updatePlayCount(true);
    showSetupScreen(); // Empezar en la pantalla de setup
}

startBtn.addEventListener('click', showGameScreen);
playAgainBtn.addEventListener('click', () => {
    gameOverScreen.classList.remove('visible');
    runGame();
});
lobbyBtn.addEventListener('click', showSetupScreen);
muteBtn.addEventListener('click', toggleMute);
twitterShareBtn.addEventListener('click', shareToTwitter);
whatsappShareBtn.addEventListener('click', shareToWhatsApp);

initialLoad();