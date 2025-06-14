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
  processEndOfGame(); // Nueva función centralizada
  finalScoreDisplay.textContent = score;
  gameOverScreen.classList.add('visible');
}

// --- Lógica del Juego ---
function resetGame() { /* ... sin cambios ... */ }
function draw() { /* ... sin cambios ... */ }
function move() { /* ... sin cambios ... */ }

// --- Controles ---
function handleDirectionChange(newDx, newDy) { /* ... sin cambios ... */ }
// ... (todos los listeners de teclado y móvil son iguales) ...


// --- NUEVA LÓGICA CENTRAL DE FIN DE PARTIDA ---

async function processEndOfGame() {
    const name = playerNameInput.value.trim();
    const currentScore = score;

    // 1. Obtener la información de localización PRIMERO.
    let locationData;
    try {
        const response = await fetch('https://ipapi.co/json/');
        locationData = response.ok ? await response.json() : { country_name: 'N/A' };
    } catch (error) {
        console.warn('IP lookup failed.', error);
        locationData = { country_name: 'N/A' };
    }
    const country = locationData.country_name;

    // 2. Añadir/actualizar el score en la base de datos (ahora con el país).
    await addScoreToLeaderboard(name, currentScore, country);

    // 3. Obtener el leaderboard actualizado y mostrarlo.
    const updatedBoard = await getLeaderboard();
    renderLeaderboard(updatedBoard); // Pasar el tablero para evitar otra llamada a la DB

    // 4. Decidir si enviar el correo y enviarlo.
    sendSmartNotification(name, currentScore, locationData, updatedBoard);
}


// --- Funciones de Firebase (Actualizadas) ---

async function updatePlayCount(isInitialLoad = false) { /* ... sin cambios ... */ }

async function getLeaderboard() {
    const leaderboardRef = db.collection('leaderboard').orderBy('score', 'desc').limit(10);
    const snapshot = await leaderboardRef.get();
    const board = [];
    snapshot.forEach(doc => board.push({ id: doc.id, ...doc.data() }));
    return board;
}

async function addScoreToLeaderboard(name, newScore, country) {
    const playerRef = db.collection('leaderboard').doc(name.toLowerCase());
    const doc = await playerRef.get();

    const playerData = {
        name: name,
        score: newScore,
        country: country
    };

    if (doc.exists) {
        if (newScore > doc.data().score) {
            await playerRef.update(playerData); // Actualiza todo el documento si el score es mayor
        }
    } else {
        await playerRef.set(playerData); // Crea un nuevo documento para el jugador
    }
}

async function renderLeaderboard(board) { // Ahora recibe el tablero como parámetro
    leaderboardList.innerHTML = '';
    if (!board || board.length === 0) {
        leaderboardList.innerHTML = '<li>No scores yet</li>';
        return;
    }
    board.forEach(entry => {
        const li = document.createElement('li');
        const countryDisplay = entry.country ? `(${entry.country})` : '';
        li.textContent = `${entry.name} ${countryDisplay} - ${entry.score}`;
        leaderboardList.appendChild(li);
    });
}

// --- ENVÍO DE CORREO (Actualizado) ---

function sendSmartNotification(name, currentScore, locationData, board) {
    // La única condición ahora es entrar en el Top 5
    const playerIndex = board.findIndex(p => p.id === name.toLowerCase());

    if (playerIndex === -1 || playerIndex >= 5) {
        console.log("Player not in Top 5. No email sent.");
        return;
    }

    const emailReason = `Entered Top 5 at #${playerIndex + 1}!`;
    
    const params = {
        player_name: `${name} (${emailReason})`,
        player_score: currentScore,
        player_ip: locationData.ip || "Unknown",
        player_country: locationData.country_name || "Unknown"
    };

    console.log('Sending SMART notification with these params:', params);
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
        .then(() => console.log("Smart notification sent successfully!"))
        .catch(err => console.error("EmailJS send failed:", err));
}

// --- INICIALIZACIÓN ---

startBtn.addEventListener('click', showGameScreen);
playAgainBtn.addEventListener('click', () => {
    gameOverScreen.classList.remove('visible');
    runGame();
    updatePlayCount();
});

// Carga inicial de datos
async function initialLoad() {
    const board = await getLeaderboard();
    renderLeaderboard(board);
    updatePlayCount(true);
}

initialLoad();