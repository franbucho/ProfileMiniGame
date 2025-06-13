// --- Configuración de Firebase (Tus claves reales) ---
const firebaseConfig = {
  apiKey: "AIzaSyBpAWJ6ZVO5oLfyLpC8cZNdiTk6lt1-HFo",
  authDomain: "profile-minigame.firebaseapp.com",
  projectId: "profile-minigame",
  storageBucket: "profile-minigame.firebasestorage.app",
  messagingSenderId: "735696613558",
  appId: "1:735696613558:web:2e00a498dbd0a94552f617",
  measurementId: "G-44R9BSN7CQ"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Referencia a la base de datos Firestore


// --- Configuración de EmailJS ---
const EMAILJS_USER_ID = 'PMOEIYlzOvdOcA2l5';
const EMAILJS_SERVICE_ID = 'service_lk8e0nv';
const EMAILJS_TEMPLATE_ID = 'template_xjhieh3';
emailjs.init(EMAILJS_USER_ID);


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

const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

// --- Variables del Juego ---
let snake, food, dx, dy, score, gameInterval;
let gridSize = 20;


// --- Funciones de Flujo del Juego ---

function showGameScreen() {
    const name = playerNameInput.value.trim();
    const nameRegex = /^[a-zA-Z\s]+$/;

    if (name === '') {
        alert('Please enter your name.');
        return;
    }
    if (!nameRegex.test(name)) {
        alert('Name can only contain letters and spaces.');
        return;
    }

    setupScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    runGame();
    updatePlayCount(); 
}

function runGame() {
  if (gameInterval) clearInterval(gameInterval);
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


// --- Lógica del Juego ---

function resetGame() {
  snake = [{ x: 8, y: 8 }];
  food = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
  dx = 1; dy = 0; score = 0;
  scoreDisplay.textContent = "Score: 0";
}

function draw() {
  if (!snake) return;
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cellSize = canvas.width / gridSize;
  ctx.fillStyle = "#00ff88";
  snake.forEach(part => ctx.fillRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize));
  ctx.fillStyle = "red";
  ctx.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
}

function move() {
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };
  if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize || snake.slice(1).some(p => p.x === head.x && p.y === head.y)) {
    showGameOver();
    return;
  }
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreDisplay.textContent = `Score: ${score}`;
    do {
      food = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
    } while (snake.some(p => p.x === food.x && p.y === food.y));
  } else {
    snake.pop();
  }
}

// --- Controles ---

function handleDirectionChange(newDx, newDy) {
    if (!gameInterval) return;
    if ((newDx !== 0 && dx === -newDx) || (newDy !== 0 && dy === -newDy)) return;
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
upBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirectionChange(0, -1); });
downBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirectionChange(0, 1); });
leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirectionChange(-1, 0); });
rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirectionChange(1, 0); });


// --- Funciones de Firebase ---

async function updatePlayCount(isInitialLoad = false) {
    const counterRef = db.collection('gameStats').doc('playCounter');
    
    try {
        if (!isInitialLoad) {
            await counterRef.update({ count: firebase.firestore.FieldValue.increment(1) });
        }
        const doc = await counterRef.get();
        const count = doc.exists ? doc.data().count : 0;
        playCounterDisplay.textContent = `Plays: ${count.toLocaleString('en-US')}`;
    } catch (error) {
        if (error.code === 'not-found' && !isInitialLoad) {
            await counterRef.set({ count: 1 });
            playCounterDisplay.textContent = `Plays: 1`;
        } else if (error.code === 'not-found' && isInitialLoad) {
            playCounterDisplay.textContent = `Plays: 0`;
        } else {
            console.error("Error with play counter:", error);
            playCounterDisplay.textContent = 'Plays: N/A';
        }
    }
}

async function getLeaderboard() {
    const leaderboardRef = db.collection('leaderboard').orderBy('score', 'desc').limit(10);
    const snapshot = await leaderboardRef.get();
    const board = [];
    snapshot.forEach(doc => {
        board.push({ id: doc.id, ...doc.data() });
    });
    return board;
}

async function addScoreToLeaderboard(name, newScore) {
    const playerRef = db.collection('leaderboard').doc(name.toLowerCase());
    const doc = await playerRef.get();

    if (doc.exists) {
        const oldScore = doc.data().score;
        if (newScore > oldScore) {
            await playerRef.update({ score: newScore, name: name }); // Actualiza también el nombre por si cambia mayúsculas/minúsculas
        }
    } else {
        await playerRef.set({ name: name, score: newScore });
    }
}

async function renderLeaderboard() {
    leaderboardList.innerHTML = '<li>Loading...</li>';
    try {
        const board = await getLeaderboard();
        leaderboardList.innerHTML = '';
        if (board.length === 0) {
            leaderboardList.innerHTML = '<li>No scores yet</li>';
            return;
        }
        board.forEach(entry => {
            const li = document.createElement('li');
            li.textContent = `${entry.name} - ${entry.score}`;
            leaderboardList.appendChild(li);
        });
    } catch (error) {
        console.error("Error rendering leaderboard:", error);
        leaderboardList.innerHTML = '<li>Could not load scores</li>';
    }
}

async function sendSmartNotification() {
    const name = playerNameInput.value.trim();
    const currentScore = score;
    
    const boardBeforeUpdate = await getLeaderboard();
    const oldHighScore = boardBeforeUpdate.length > 0 ? boardBeforeUpdate[0].score : 0;

    await addScoreToLeaderboard(name, currentScore);
    const updatedBoard = await getLeaderboard();
    renderLeaderboard(); // Llama a render después de tener el tablero final

    let shouldSendEmail = false;
    let emailReason = "";
    
    if (currentScore > 0 && currentScore > oldHighScore) {
        shouldSendEmail = true;
        emailReason = "New High Score!";
    }

    const playerIndex = updatedBoard.findIndex(p => p.id === name.toLowerCase());
    if (playerIndex !== -1 && playerIndex < 5 && !shouldSendEmail) {
        shouldSendEmail = true;
        emailReason = "Entered Top 5!";
    }

    if (!shouldSendEmail) {
        console.log("Score not high enough for a notification.");
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

// --- Inicialización ---

startBtn.addEventListener('click', showGameScreen);
playAgainBtn.addEventListener('click', () => {
    gameOverScreen.style.display = 'none';
    runGame();
    updatePlayCount();
});

renderLeaderboard();
updatePlayCount(true);