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
const auth = firebase.auth();

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
const loginScreen = document.getElementById('loginScreen');
const userProfile = document.getElementById('userProfile');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');

const gameScreen = document.getElementById('gameScreen');
const setupScreen = document.getElementById('setupScreen');
const startBtn = document.getElementById('startBtn');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const playCounterDisplay = document.getElementById('playCounterDisplay');
const leaderboardList = document.getElementById('leaderboardList');
const leaderboardContainer = document.getElementById('leaderboard');
const donationContainer = document.querySelector('.donation-container');

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
let gridSize = 30;
const NORMAL_SPEED = 120;
const BOOST_SPEED = 50;
let currentSpeed = NORMAL_SPEED;
let isMuted = false;


// --- Lógica de Autenticación ---

auth.onAuthStateChanged(user => {
    if (user) {
        // Usuario está logueado
        loginScreen.style.display = 'none';
        userProfile.style.display = 'flex';
        userName.textContent = user.displayName;
        userAvatar.src = user.photoURL;
        startBtn.style.display = 'inline-block';
        setupScreen.style.display = 'block'; // Mostrar el setup si está logueado
    } else {
        // Usuario cerró sesión o no está logueado
        userProfile.style.display = 'none';
        loginScreen.style.display = 'block';
        startBtn.style.display = 'none';
        gameScreen.style.display = 'none'; // Ocultar el juego si cierra sesión
        setupScreen.style.display = 'block'; // Mostrar el setup
    }
});

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
        console.error("Error during sign-in:", error);
    });
}

function signOut() {
    auth.signOut();
}


// --- Funciones de Flujo del Juego ---

function showLobby() {
    gameOverScreen.classList.remove('visible');
    gameScreen.style.display = 'none';
    setupScreen.style.display = 'block';
    userProfile.style.display = 'flex';
    leaderboardContainer.style.display = 'block';
    donationContainer.style.display = 'block';
    renderLeaderboard();
}

function startGame() {
    if (!auth.currentUser) {
        alert("You must be signed in to play.");
        return;
    }
    
    setupScreen.style.display = 'none';
    leaderboardContainer.style.display = 'none';
    donationContainer.style.display = 'none';
    gameScreen.style.display = 'flex';

    if (!isMuted && backgroundMusic.paused) {
        backgroundMusic.play().catch(e => console.error("Audio autoplay was blocked.", e));
    }
    
    runGame();
}

function runGame() {
  if (gameInterval) clearInterval(gameInterval);
  currentSpeed = NORMAL_SPEED;
  gameOverScreen.classList.remove('visible');
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
  const cornerRadius = gridSize > 25 ? 2 : 4;
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
function handleDirectionChange(newDx, newDy) {
    if (!gameInterval) return;
    if (dx !== 0 && newDx !== 0) return;
    if (dy !== 0 && newDy !== 0) return;
    dx = newDx;
    dy = newDy;
}

function setSpeed(speed) {
    if (!gameInterval || currentSpeed === speed) return;
    currentSpeed = speed;
    clearInterval(gameInterval);
    gameInterval = setInterval(() => { move(); draw(); }, currentSpeed);
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

boostBtn.addEventListener('mousedown', () => setSpeed(BOOST_SPEED));
boostBtn.addEventListener('mouseup', () => setSpeed(NORMAL_SPEED));
boostBtn.addEventListener('mouseleave', () => setSpeed(NORMAL_SPEED));
boostBtn.addEventListener('touchstart', (e) => { e.preventDefault(); setSpeed(BOOST_SPEED); });
boostBtn.addEventListener('touchend', () => setSpeed(NORMAL_SPEED));

// --- Lógica Central de Fin de Partida ---
async function processEndOfGame() {
    const user = auth.currentUser;
    if (!user) return;

    const name = user.displayName;
    const uid = user.uid;
    const photoURL = user.photoURL;
    const currentScore = score;
    
    let locationData;
    try {
        const response = await fetch('https://ipapi.co/json/');
        locationData = response.ok ? await response.json() : { country_name: 'N/A', country_code: 'N/A', ip: 'N/A' };
    } catch (error) {
        console.warn('IP lookup failed.', error);
        locationData = { country_name: 'N/A', country_code: 'N/A', ip: 'N/A' };
    }
    const country = locationData.country_name;
    const countryCode = locationData.country_code;

    const boardBeforeUpdate = await getLeaderboard();
    const seenCountriesDoc = await db.collection('gameStats').doc('seenCountries').get();
    const seenCountries = seenCountriesDoc.exists ? seenCountriesDoc.data().list : [];

    await addScoreToLeaderboard(uid, name, photoURL, currentScore, country, countryCode);
    const updatedBoard = await getLeaderboard();
    renderLeaderboard(updatedBoard);

    sendSmartNotification(name, currentScore, country, boardBeforeUpdate, updatedBoard, seenCountries, locationData);
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
    const leaderboardRef = db.collection('leaderboard').orderBy('score', 'desc').limit(100);
    const snapshot = await leaderboardRef.get();
    const board = [];
    snapshot.forEach(doc => {
        board.push({ id: doc.id, ...doc.data() });
    });
    return board;
}

async function addScoreToLeaderboard(uid, name, photoURL, newScore, country, countryCode) {
    const playerRef = db.collection('leaderboard').doc(uid);
    const doc = await playerRef.get();
    const playerData = { name, photoURL, score: newScore, country, countryCode, uid };

    if (doc.exists) {
        if (newScore >= doc.data().score) {
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
        
        const playerImg = document.createElement('img');
        playerImg.className = 'leaderboard-avatar';
        playerImg.src = entry.photoURL || 'https://i.imgur.com/sC5gU4e.png';
        li.appendChild(playerImg);

        if (entry.countryCode && entry.countryCode !== 'N/A' && entry.countryCode.length === 2) {
            const flagImg = document.createElement('img');
            flagImg.className = 'leaderboard-flag';
            flagImg.src = `https://flagcdn.com/w20/${entry.countryCode.toLowerCase()}.png`;
            flagImg.alt = entry.country;
            flagImg.title = entry.country;
            li.appendChild(flagImg);
        } else {
            const fallbackEmoji = document.createTextNode('🌐');
            li.appendChild(fallbackEmoji);
        }
        
        const textNode = document.createTextNode(` ${entry.name} - ${entry.score}`);
        li.appendChild(textNode);
        
        leaderboardList.appendChild(li);
    });
}

// --- ENVÍO DE CORREO ---
async function sendSmartNotification(name, currentScore, country, boardBefore, boardAfter, seenCountries, locationData) {
    if (currentScore === 0) {
        console.log("Score is 0, no notification sent.");
        return;
    }
    let shouldSendEmail = false;
    let emailReason = "";
    if (country && country !== 'N/A' && !seenCountries.includes(country)) {
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
    const oldIndex = boardBefore.findIndex(p => p.id === auth.currentUser.uid);
    const newIndex = boardAfter.findIndex(p => p.id === auth.currentUser.uid);
    const enteredTop5 = newIndex !== -1 && newIndex < 5 && (oldIndex === -1 || oldIndex >= 5);
    if (enteredTop5 && !shouldSendEmail) {
        shouldSendEmail = true;
        emailReason = `Entered Top 5 at #${newIndex + 1}!`;
    }
    if (!shouldSendEmail) {
        console.log("Conditions for notification not met.");
        return;
    }
    const params = {
        player_name: `${name} (${emailReason})`,
        player_score: currentScore,
        player_ip: locationData.ip || "Unknown",
        player_country: country
    };
    console.log('Sending SMART notification with these params:', params);
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
        .then(() => console.log("Smart notification sent successfully!"))
        .catch(err => console.error("EmailJS send failed:", err));
}

// --- Lógica de Audio y Compartir ---
function toggleMute() {
    isMuted = !isMuted;
    backgroundMusic.muted = isMuted;
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
    localStorage.setItem('gameMuted', isMuted.toString());
}

function shareToTwitter() {
    const finalScore = finalScoreDisplay.textContent;
    const gameUrl = "https://franbucho.github.io/ProfileMiniGame/";
    const text = `I scored ${finalScore} points in Retro Snake Worldwide! Can you beat my score? 🐍 #RetroSnake #JavaScriptGame`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
}

function shareToWhatsApp() {
    const finalScore = finalScoreDisplay.textContent;
    const gameUrl = "https://franbucho.github.io/ProfileMiniGame/";
    const text = `I scored ${finalScore} points in Retro Snake Worldwide! Can you beat my score? 🐍\n\nPlay here: ${gameUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
}

// --- INICIALIZACIÓN ---
async function initialLoad() {
    const savedMuteState = localStorage.getItem('gameMuted');
    if (savedMuteState === 'true') {
        isMuted = true;
        backgroundMusic.muted = true;
        muteBtn.textContent = '🔇';
    }
    const board = await getLeaderboard();
    renderLeaderboard(board);
    updatePlayCount(true);
}

// Event Listeners
loginBtn.addEventListener('click', signInWithGoogle);
logoutBtn.addEventListener('click', signOut);
startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', runGame);
lobbyBtn.addEventListener('click', showLobby);
muteBtn.addEventListener('click', toggleMute);
twitterShareBtn.addEventListener('click', shareToTwitter);
whatsappShareBtn.addEventListener('click', shareToWhatsApp);

initialLoad();