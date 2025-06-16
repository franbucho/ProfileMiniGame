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

const startBtn = document.getElementById('startBtn');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const timeDisplay = document.getElementById('timeDisplay');
const playCounterDisplay = document.getElementById('playCounterDisplay');
const leaderboardList = document.getElementById('leaderboardList');

const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const playAgainBtn = document.getElementById('playAgainBtn');
const lobbyBtn = document.getElementById('lobbyBtn');
const muteBtn = document.getElementById('muteBtn');

const twitterShareBtn = document.getElementById('twitterShareBtn');
const whatsappShareBtn = document.getElementById('whatsappShareBtn');

const globalBtn = document.getElementById('globalBtn');
const regionalBtn = document.getElementById('regionalBtn');

// --- Variables del Juego ---
let snake, food, dx, dy, score, gameInterval, gameTimerInterval, elapsedTimeInSeconds;
let gridSize = 30;
const GAME_SPEED = 120;
let isMuted = false;
let touchStartX = 0, touchStartY = 0;
let currentUserRegion = null;

// --- Lógica de Autenticación ---
auth.onAuthStateChanged(async (user) => {
    const isGameActive = !!gameInterval;
    if (user && !isGameActive) {
        loginScreen.style.display = 'none';
        userProfile.style.display = 'block';
        userName.textContent = user.displayName;
        userAvatar.src = user.photoURL;
        startBtn.disabled = false;
        await fetchUserRegion(user.uid);
    } else if (!user) {
        userProfile.style.display = 'none';
        loginScreen.style.display = 'block';
        startBtn.disabled = true;
        regionalBtn.disabled = true;
        currentUserRegion = null;
    }
});

async function fetchUserRegion(uid) {
    try {
        const playerDoc = await db.collection('leaderboards').doc('global').collection('scores').doc(uid).get();
        if (playerDoc.exists && playerDoc.data().countryCode) {
            currentUserRegion = playerDoc.data().countryCode.toLowerCase();
            localStorage.setItem('userRegion', currentUserRegion);
            regionalBtn.disabled = false;
        } else {
            regionalBtn.disabled = true;
        }
    } catch (error) {
        console.error("Error fetching user region:", error);
        regionalBtn.disabled = true;
    }
}

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
    startBtn.disabled = false;
    logoutBtn.disabled = false;
    auth.onAuthStateChanged(auth.currentUser);
    renderLeaderboard(globalBtn.classList.contains('active') ? 'global' : currentUserRegion);
}

function startGame() {
    if (!auth.currentUser) {
        alert("You must be signed in to play.");
        return;
    }
    
    startBtn.disabled = true;
    logoutBtn.disabled = true;
    runGame();
}

function runGame() {
  if (gameInterval) clearInterval(gameInterval);
  if (gameTimerInterval) clearInterval(gameTimerInterval);
  
  gameOverScreen.classList.remove('visible');
  
  elapsedTimeInSeconds = 0;
  updateTimerDisplay();
  gameTimerInterval = setInterval(() => {
    elapsedTimeInSeconds++;
    updateTimerDisplay();
  }, 1000);

  updatePlayCount();
  resetGame();
  draw();
  gameInterval = setInterval(() => { move(); draw(); }, GAME_SPEED);
}

function initiateGameOverSequence() {
    if (!gameInterval) return;
    gameOverSound.play();
    clearInterval(gameInterval);
    clearInterval(gameTimerInterval);
    gameInterval = null;
    canvas.classList.add('snake-hit');
    setTimeout(() => {
        canvas.classList.remove('snake-hit');
        startBtn.disabled = false;
        logoutBtn.disabled = false;
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
    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingRight = dx === 1;
    const goingLeft = dx === -1;
    if ((goingUp && newDy === 1) || (goingDown && newDy === -1) || (goingLeft && newDx === 1) || (goingRight && newDx === -1)) {
        return;
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

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY; }, { passive: false });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); const touchEndX = e.changedTouches[0].screenX; const touchEndY = e.changedTouches[0].screenY; handleSwipe(touchEndX, touchEndY); }, { passive: false });

function handleSwipe(endX, endY) {
    const diffX = endX - touchStartX;
    const diffY = endY - touchStartY;
    const threshold = 30;
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > threshold) {
            handleDirectionChange(diffX > 0 ? 1 : -1, 0);
        }
    } else {
        if (Math.abs(diffY) > threshold) {
            handleDirectionChange(0, diffY > 0 ? 1 : -1);
        }
    }
}


// --- Lógica Central de Fin de Partida ---
async function processEndOfGame() {
    const user = auth.currentUser;
    if (!user) return;
    const { displayName: name, uid, photoURL, email } = user;
    const currentScore = score;
    const time = elapsedTimeInSeconds;
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
    if (countryCode && countryCode !== 'N/A') {
        currentUserRegion = countryCode.toLowerCase();
        localStorage.setItem('userRegion', currentUserRegion);
        regionalBtn.disabled = false;
    }
    const boardBeforeUpdate = await getLeaderboard('global'); // Siempre comparar contra el global
    const seenCountriesDoc = await db.collection('gameStats').doc('seenCountries').get();
    const seenCountries = seenCountriesDoc.exists ? seenCountriesDoc.data().list : [];
    await addScoreToLeaderboard(uid, name, photoURL, currentScore, country, countryCode, time, email);
    const regionToDisplay = regionalBtn.classList.contains('active') ? (currentUserRegion || 'global') : 'global';
    const updatedBoard = await getLeaderboard(regionToDisplay);
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

async function getLeaderboard(region = 'global') {
    const leaderboardRef = db.collection('leaderboards').doc(region).collection('scores').orderBy('score', 'desc').orderBy('time', 'asc').limit(100);
    const snapshot = await leaderboardRef.get();
    const board = [];
    snapshot.forEach(doc => {
        board.push({ id: doc.id, ...doc.data() });
    });
    return board;
}

async function addScoreToLeaderboard(uid, name, photoURL, newScore, country, countryCode, time, email) {
    const playerData = { name, photoURL, score: newScore, country, countryCode, time, email };
    const updateLogic = async (ref) => {
        const doc = await ref.get();
        if (!doc.exists || newScore > doc.data().score || (newScore === doc.data().score && time < doc.data().time)) {
            await ref.set(playerData);
        }
    };
    const globalPlayerRef = db.collection('leaderboards').doc('global').collection('scores').doc(uid);
    await updateLogic(globalPlayerRef);
    if (countryCode && countryCode !== 'N/A') {
        const regionalPlayerRef = db.collection('leaderboards').doc(countryCode.toLowerCase()).collection('scores').doc(uid);
        await updateLogic(regionalPlayerRef);
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    timeDisplay.textContent = `Time: ${formatTime(elapsedTimeInSeconds)}`;
}

function renderLeaderboard(board) {
    leaderboardList.innerHTML = '';
    if (!board || board.length === 0) {
        leaderboardList.innerHTML = '<li>No scores yet.</li>';
        return;
    }
    board.forEach((entry, index) => {
        const li = document.createElement('li');
        const rankSpan = document.createElement('span');
        rankSpan.className = 'leaderboard-rank';
        rankSpan.textContent = `${index + 1}.`;
        
        const entryDiv = document.createElement('div');
        entryDiv.className = 'leaderboard-entry';

        const playerImg = document.createElement('img');
        playerImg.className = 'leaderboard-avatar';
        playerImg.src = entry.photoURL || 'https://i.imgur.com/sC5gU4e.png';
        
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'leaderboard-details';

        const playerDiv = document.createElement('div');
        playerDiv.className = 'leaderboard-player';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'leaderboard-player-name';
        nameSpan.textContent = entry.name || 'Anonymous';
        playerDiv.appendChild(nameSpan);

        if (entry.countryCode && entry.countryCode !== 'N/A' && entry.countryCode.length === 2) {
            const flagImg = document.createElement('img');
            flagImg.className = 'leaderboard-flag';
            flagImg.src = `https://flagcdn.com/w20/${entry.countryCode.toLowerCase()}.png`;
            flagImg.alt = entry.country;
            flagImg.title = entry.country;
            playerDiv.appendChild(flagImg);
        }
        
        const statsSpan = document.createElement('span');
        statsSpan.className = 'leaderboard-stats';
        const timeDisplay = entry.time !== undefined ? ` in ${formatTime(entry.time)}` : '';
        statsSpan.textContent = `Score: ${entry.score || 0}${timeDisplay}`;
        
        detailsDiv.appendChild(playerDiv);
        detailsDiv.appendChild(statsSpan);
        entryDiv.appendChild(playerImg);
        entryDiv.appendChild(detailsDiv);
        li.appendChild(rankSpan);
        li.appendChild(entryDiv);
        leaderboardList.appendChild(li);
    });
}

// --- ENVÍO DE CORREO ---
async function sendSmartNotification(name, currentScore, country, boardBefore, boardAfter, seenCountries, locationData) {
    if (currentScore === 0) { console.log("Score is 0, no notification sent."); return; }
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
    if (!shouldSendEmail) { console.log("Conditions for notification not met."); return; }
    const params = { player_name: `${name} (${emailReason})`, player_score: currentScore, player_ip: locationData.ip || "Unknown", player_country: country };
    console.log('Sending SMART notification with these params:', params);
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
        .then(() => console.log("Smart notification sent successfully!"))
        .catch(err => console.error("EmailJS send failed:", err));
}

// --- Lógica de Audio y Compartir ---
function toggleMute() { isMuted = !isMuted; backgroundMusic.muted = isMuted; muteBtn.textContent = isMuted ? '🔇' : '🔊'; localStorage.setItem('gameMuted', isMuted.toString()); }
function shareToTwitter() { const finalScore = finalScoreDisplay.textContent; const gameUrl = "https://franbucho.github.io/ProfileMiniGame/"; const text = `I scored ${finalScore} points in Retro Snake Worldwide! Can you beat my score? 🐍 #RetroSnake #JavaScriptGame`; const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent(text)}`; window.open(twitterUrl, '_blank'); }
function shareToWhatsApp() { const finalScore = finalScoreDisplay.textContent; const gameUrl = "https://franbucho.github.io/ProfileMiniGame/"; const text = `I scored ${finalScore} points in Retro Snake Worldwide! Can you beat my score? 🐍\n\nPlay here: ${gameUrl}`; const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`; window.open(whatsappUrl, '_blank'); }

// --- INICIALIZACIÓN ---
async function initialLoad() {
    const savedMuteState = localStorage.getItem('gameMuted');
    if (savedMuteState === 'true') {
        isMuted = true;
        backgroundMusic.muted = true;
        muteBtn.textContent = '🔇';
    }
    try {
        const board = await getLeaderboard();
        renderLeaderboard(board);
    } catch(e) {
        console.error("Could not load leaderboard. You might need to create a composite index in Firebase. Look for a link in the error message below to create it automatically.", e);
        leaderboardList.innerHTML = '<li>Error: Check console (F12) to create DB index.</li>';
    }
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

globalBtn.addEventListener('click', async () => {
    regionalBtn.classList.remove('active');
    globalBtn.classList.add('active');
    renderLeaderboard(await getLeaderboard('global'));
});

regionalBtn.addEventListener('click', async () => {
    if (regionalBtn.disabled) {
        alert("Play a game first to set your region.");
        return;
    }
    const region = currentUserRegion || localStorage.getItem('userRegion');
    if (region) {
        globalBtn.classList.remove('active');
        regionalBtn.classList.add('active');
        renderLeaderboard(await getLeaderboard(region));
    } else {
        alert("Your region is not set yet. Play a game first.");
    }
});

initialLoad();