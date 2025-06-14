// --- Configuración (sin cambios) ---
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

// --- Sonidos, Elementos del DOM y Variables del Juego (sin cambios) ---
const eatSound = new Audio('audio/eat.wav');
const gameOverSound = new Audio('audio/gameover.wav');
// ... (resto de constantes y variables son iguales) ...

// --- Funciones de Flujo y Lógica del Juego (sin cambios) ---
// ... (showGameScreen, runGame, resetGame, draw, move, etc. son iguales) ...

// --- NUEVA LÓGICA CENTRAL DE FIN DE PARTIDA ---

async function processEndOfGame() {
    const name = playerNameInput.value.trim();
    const currentScore = score;

    // 1. Obtener datos de localización
    let locationData;
    try {
        const response = await fetch('https://ipapi.co/json/');
        locationData = response.ok ? await response.json() : { country_name: 'N/A', ip: 'N/A' };
    } catch (error) {
        console.warn('IP lookup failed.', error);
        locationData = { country_name: 'N/A', ip: 'N/A' };
    }
    const country = locationData.country_name;

    // 2. Obtener estado ANTES de actualizar
    const boardBeforeUpdate = await getLeaderboard();
    const seenCountriesDoc = await db.collection('gameStats').doc('seenCountries').get();
    const seenCountries = seenCountriesDoc.exists ? seenCountriesDoc.data().list : [];

    // 3. Actualizar la base de datos
    await addScoreToLeaderboard(name, currentScore, country);
    const updatedBoard = await getLeaderboard();
    renderLeaderboard(updatedBoard);

    // 4. Enviar notificación si se cumplen las nuevas reglas
    sendSmartNotification(name, country, boardBeforeUpdate, updatedBoard, seenCountries, locationData);
}

// --- Funciones de Firebase (addScoreToLeaderboard ahora guarda el país) ---

async function addScoreToLeaderboard(name, newScore, country) {
    const playerRef = db.collection('leaderboard').doc(name.toLowerCase());
    const doc = await playerRef.get();
    const playerData = { name, score: newScore, country };

    if (doc.exists) {
        if (newScore > doc.data().score) {
            await playerRef.update(playerData);
        }
    } else {
        await playerRef.set(playerData);
    }
}

function renderLeaderboard(board) {
    leaderboardList.innerHTML = '';
    if (!board || board.length === 0) {
        leaderboardList.innerHTML = '<li>No scores yet.</li>';
        return;
    }
    board.forEach(entry => {
        const li = document.createElement('li');
        const countryDisplay = (entry.country && entry.country !== 'N/A') ? ` (${entry.country})` : '';
        li.textContent = `${entry.name}${countryDisplay} - ${entry.score}`;
        leaderboardList.appendChild(li);
    });
}

// --- ENVÍO DE CORREO (Lógica completamente nueva) ---

async function sendSmartNotification(name, country, boardBefore, boardAfter, seenCountries, locationData) {
    let shouldSendEmail = false;
    let emailReason = "";

    // Condición 1: El país es nuevo
    if (country !== 'N/A' && !seenCountries.includes(country)) {
        shouldSendEmail = true;
        emailReason = `New Country: ${country}!`;
        // Añadir el nuevo país a la base de datos
        await db.collection('gameStats').doc('seenCountries').update({
            list: firebase.firestore.FieldValue.arrayUnion(country)
        }).catch(async (err) => { // Si no existe el doc, lo crea
            if (err.code === 'not-found') {
                await db.collection('gameStats').doc('seenCountries').set({ list: [country] });
            }
        });
    }

    // Condición 2: El jugador ENTRÓ al Top 5
    const oldIndex = boardBefore.findIndex(p => p.id === name.toLowerCase());
    const newIndex = boardAfter.findIndex(p => p.id === name.toLowerCase());

    const enteredTop5 = newIndex !== -1 && newIndex < 5 && (oldIndex === -1 || oldIndex >= 5);

    if (enteredTop5 && !shouldSendEmail) { // Solo si no se ha activado ya por "nuevo país"
        shouldSendEmail = true;
        emailReason = `Entered Top 5 at #${newIndex + 1}!`;
    }

    if (!shouldSendEmail) {
        console.log("Conditions not met for a notification.");
        return;
    }

    // Si se cumple alguna condición, enviar correo
    const params = {
        player_name: `${name} (${emailReason})`,
        player_score: score,
        player_ip: locationData.ip || "Unknown",
        player_country: country
    };

    console.log('Sending SMART notification with these params:', params);
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
        .then(() => console.log("Smart notification sent successfully!"))
        .catch(err => console.error("EmailJS send failed:", err));
}


// --- El resto de tu game.js (sin cambios) ---
// ... (Aquí iría todo el resto del código que ya tenías y funcionaba bien) ...

// Por facilidad, aquí está el archivo completo de nuevo:
// (Pega todo esto en tu game.js)
// --- Configuración de Firebase y EmailJS ---
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
eatSound.volume = 0.5;
gameOverSound.volume = 0.5;

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
    if (name === '') { alert('Please enter your name.'); return; }
    if (!nameRegex.test(name)) { alert('Name can only contain letters and spaces.'); return; }
    
    setupScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    runGame();
    updatePlayCount(); 
}

function runGame() {
  if (gameInterval) clearInterval(gameInterval);
  resetGame();
  draw();
  gameInterval = setInterval(() => { move(); draw(); }, 150);
}

function showGameOver() {
  gameOverSound.play();
  clearInterval(gameInterval);
  gameInterval = null;
  processEndOfGame();
  finalScoreDisplay.textContent = score;
  gameOverScreen.classList.add('visible');
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
  ctx.fillStyle = "#2c2c2c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cellSize = canvas.width / gridSize;
  ctx.fillStyle = "#ff4444";
  ctx.beginPath();
  ctx.arc(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, cellSize / 2.2, 0, 2 * Math.PI);
  ctx.fill();
  snake.forEach((part, index) => {
    ctx.fillStyle = (index === 0) ? "#00ff88" : "#00dd77";
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize, [4]);
        ctx.fill();
    } else {
        ctx.fillRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize);
    }
  });
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


// --- Lógica Central de Fin de Partida ---

async function processEndOfGame() {
    const name = playerNameInput.value.trim();
    const currentScore = score;
    let locationData;
    try {
        const response = await fetch('https://ipapi.co/json/');
        locationData = response.ok ? await response.json() : { country_name: 'N/A', ip: 'N/A' };
    } catch (error) {
        console.warn('IP lookup failed.', error);
        locationData = { country_name: 'N/A', ip: 'N/A' };
    }
    const country = locationData.country_name;
    const boardBeforeUpdate = await getLeaderboard();
    const seenCountriesDoc = await db.collection('gameStats').doc('seenCountries').get();
    const seenCountries = seenCountriesDoc.exists ? seenCountriesDoc.data().list : [];
    await addScoreToLeaderboard(name, currentScore, country);
    const updatedBoard = await getLeaderboard();
    renderLeaderboard(updatedBoard);
    sendSmartNotification(name, country, boardBeforeUpdate, updatedBoard, seenCountries, locationData);
}

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
        if (error.code === 'not-found') {
            const startCount = isInitialLoad ? 0 : 1;
            await counterRef.set({ count: startCount });
            playCounterDisplay.textContent = `Plays: ${startCount}`;
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

async function addScoreToLeaderboard(name, newScore, country) {
    const playerRef = db.collection('leaderboard').doc(name.toLowerCase());
    const doc = await playerRef.get();
    const playerData = { name, score: newScore, country };
    if (doc.exists) {
        if (newScore > doc.data().score) {
            await playerRef.update(playerData);
        }
    } else {
        await playerRef.set(playerData);
    }
}

function renderLeaderboard(board) {
    leaderboardList.innerHTML = '';
    if (!board || board.length === 0) {
        leaderboardList.innerHTML = '<li>No scores yet.</li>';
        return;
    }
    board.forEach(entry => {
        const li = document.createElement('li');
        const countryDisplay = (entry.country && entry.country !== 'N/A') ? ` (${entry.country})` : '';
        li.textContent = `${entry.name}${countryDisplay} - ${entry.score}`;
        leaderboardList.appendChild(li);
    });
}

async function sendSmartNotification(name, country, boardBefore, boardAfter, seenCountries, locationData) {
    let shouldSendEmail = false;
    let emailReason = "";
    if (country !== 'N/A' && !seenCountries.includes(country)) {
        shouldSendEmail = true;
        emailReason = `New Country: ${country}!`;
        try {
            const seenCountriesRef = db.collection('gameStats').doc('seenCountries');
            await seenCountriesRef.update({ list: firebase.firestore.FieldValue.arrayUnion(country) });
        } catch (error) {
            if (error.code === 'not-found') {
                await db.collection('gameStats').doc('seenCountries').set({ list: [country] });
            }
        }
    }
    const oldIndex = boardBefore.findIndex(p => p.id === name.toLowerCase());
    const newIndex = boardAfter.findIndex(p => p.id === name.toLowerCase());
    const enteredTop5 = newIndex !== -1 && newIndex < 5 && (oldIndex === -1 || oldIndex >= 5);
    if (enteredTop5 && !shouldSendEmail) {
        shouldSendEmail = true;
        emailReason = `Entered Top 5 at #${newIndex + 1}!`;
    }
    if (!shouldSendEmail) {
        console.log("Conditions not met for a notification.");
        return;
    }
    const params = {
        player_name: `${name} (${emailReason})`,
        player_score: score,
        player_ip: locationData.ip || "Unknown",
        player_country: country
    };
    console.log('Sending SMART notification with these params:', params);
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
        .then(() => console.log("Smart notification sent successfully!"))
        .catch(err => console.error("EmailJS send failed:", err));
}

// --- Inicialización ---

async function initialLoad() {
    const board = await getLeaderboard();
    renderLeaderboard(board);
    updatePlayCount(true);
}

startBtn.addEventListener('click', showGameScreen);
playAgainBtn.addEventListener('click', () => {
    gameOverScreen.classList.remove('visible');
    runGame();
});

initialLoad();