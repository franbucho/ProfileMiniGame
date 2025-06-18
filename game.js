// --- Configuración ---
// MAKE SURE TO REPLACE WITH YOUR ACTUAL FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyBpAWJ6ZVO5oLfyLpC8cZNdiTk6lt1-HFo",
    authDomain: "profile-minigame.firebaseapp.com",
    projectId: "profile-minigame",
    storageBucket: "profile-minigame.appspot.com",
    messagingSenderId: "735696613558",
    appId: "1:735696613558:web:2e00a498dbd0a94552f617",
    measurementId: "G-44R9BSN7CQ"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// MAKE SURE TO REPLACE WITH YOUR ACTUAL EMAILJS CONFIG
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

const startBtn = document.getElementById('startBtn'); // This might become redundant, replaced by startButton in overlay
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

// --- Elementos para control facial ---
const videoElement = document.getElementById('inputVideo');
const messageOverlay = document.getElementById('messageOverlay');
const messageText = document.getElementById('messageText');
const startButton = document.getElementById('startButton'); // Button inside the overlay

// --- Variables del Juego ---
let snake, food, dx, dy, score, gameInterval, gameTimerInterval, elapsedTimeInSeconds;
let gridSize = 30; // Determines the size of the grid (e.g., 20x20, 30x30)
const GAME_SPEED = 120; // Milliseconds per game update (lower is faster)
let isMuted = false;
let touchStartX = 0, touchStartY = 0;
let currentUserRegion = null;

// --- Variables para control facial ---
let direction = { dx: 1, dy: 0 }; // Initial direction: RIGHT
let currentDirectionString = 'RIGHT';
let calibratedNose = { x: 0.5, y: 0.5 };
let isCalibrated = false; // Flag to track if calibration is done
let gameState = 'INITIAL'; // INITIAL, STARTING_CAMERA, CALIBRATING, POST_CALIBRATION_DELAY, PLAYING, GAME_OVER
let gameLoopTimeoutId; // To manage game loop for FaceMesh
let sendFramesRequestID; // To manage requestAnimationFrame for video processing
const NOSE_SENSITIVITY = 0.035; // Normalized screen dimension (0-1) for sensitivity
let faceMesh = null; // Variable to hold the FaceMesh instance

// --- Lógica de Autenticación ---
auth.onAuthStateChanged(async (user) => {
    // Definimos si el juego está activo o en proceso de inicio/calibración
    const isGameActiveState = (gameState === 'PLAYING' || gameState === 'CALIBRATING' || gameState === 'STARTING_CAMERA' || gameState === 'POST_CALIBRATION_DELAY');

    if (user) {
        loginScreen.style.display = 'none';
        userProfile.style.display = 'flex';
        userName.textContent = user.displayName;
        userAvatar.src = user.photoURL;
        
        await fetchUserRegion(user.uid);

        // Si el juego NO está en un estado activo (ej: no está jugando, calibrando, etc.)
        if (!isGameActiveState) {
            messageOverlay.style.display = 'flex';
            startButton.style.display = 'block';
            startButton.disabled = false; // Habilitar el botón de inicio
            messageText.textContent = 'Face Control'; // Mensaje para iniciar el control facial
        }
    } else { // No hay usuario logeado
        userProfile.style.display = 'none';
        loginScreen.style.display = 'flex';
        
        // Siempre mostrar el overlay de inicio de sesión si no está logeado
        messageOverlay.style.display = 'flex';
        startButton.style.display = 'none'; // Ocultar el botón de iniciar juego
        startButton.disabled = true; // Deshabilitar el botón de inicio
        messageText.textContent = 'Sign in to play!'; // Mensaje para iniciar sesión
        
        regionalBtn.disabled = true; // El leaderboard regional requiere inicio de sesión
        currentUserRegion = null;
        // Al deslogearse, también detener la cámara y FaceMesh si estaban activas
        stopCameraAndFaceMesh();
        gameState = 'INITIAL'; // Resetear el estado del juego
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
        console.error("Error al buscar la región del usuario:", error);
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
    
    // **CLAVE:** Detener y reiniciar la cámara y FaceMesh al volver al lobby
    stopCameraAndFaceMesh();
    // Restablecer el estado del juego y el overlay para una nueva calibración
    gameState = 'INITIAL';
    isCalibrated = false; // Resetear la bandera de calibración
    messageOverlay.style.display = 'flex';
    startButton.style.display = 'block';
    startButton.disabled = false; // Asegurar que el botón esté habilitado para una nueva partida
    messageText.textContent = 'Face Control'; // Mensaje inicial para una nueva partida
    
    // Re-enable authentication UI (en caso de que estuviera deshabilitada durante el juego)
    // El onAuthStateChanged se encargará de esto si hay un usuario logeado
    if (auth.currentUser) {
        logoutBtn.disabled = false; // Habilitar el botón de logout
    }
    
    renderLeaderboard(globalBtn.classList.contains('active') ? 'global' : currentUserRegion);
}

function startGame() {
    if (!auth.currentUser) {
        alert("You must be signed in to play.");
        return;
    }
    
    logoutBtn.disabled = true;

    if (!isMuted && backgroundMusic.paused) {
        backgroundMusic.play().catch(e => console.error("Audio autoplay was blocked by browser.", e));
    }
    
    setupCameraAndFaceMesh();
}

function runGame() {
    if (gameInterval) clearInterval(gameInterval);
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    
    gameOverScreen.classList.remove('visible');
    messageOverlay.style.display = 'none';
    
    elapsedTimeInSeconds = 0;
    updateTimerDisplay();
    
    updatePlayCount();
    resetGame();
    draw();
    
    gameTimerInterval = setInterval(() => {
        elapsedTimeInSeconds++;
        updateTimerDisplay();
    }, 1000);
    
    gameInterval = setInterval(() => { move(); draw(); }, GAME_SPEED);
}

function initiateGameOverSequence() {
    if (!gameInterval) return;
    gameOverSound.play();
    clearInterval(gameInterval);
    clearInterval(gameTimerInterval);
    gameInterval = null;
    
    stopCameraAndFaceMesh();
    
    canvas.classList.add('snake-hit');
    setTimeout(() => {
        canvas.classList.remove('snake-hit');
        logoutBtn.disabled = false;
        processEndOfGame();
        finalScoreDisplay.textContent = score;
        gameOverScreen.classList.add('visible');
        gameState = 'GAME_OVER';
    }, 600);
}

function stopCameraAndFaceMesh() {
    if (sendFramesRequestID) {
        cancelAnimationFrame(sendFramesRequestID);
        sendFramesRequestID = null;
    }
    if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
    }
    videoElement.style.display = 'none';
}

// --- Lógica del Juego ---
function resetGame() {
    snake = [{ x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) }];
    food = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
    dx = 1; dy = 0;
    score = 0;
    scoreDisplay.textContent = "Score: 0";
    currentDirectionString = 'RIGHT';
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

// --- Controles (Teclado y Táctiles) ---
function handleDirectionChange(newDx, newDy) {
    if (gameState !== 'PLAYING') return;

    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingRight = dx === 1;
    const goingLeft = dx === -1;

    if (
        (goingUp && newDy === 1) || (goingDown && newDy === -1) ||
        (goingLeft && newDx === 1) || (goingRight && newDx === -1)
    ) {
        return;
    }

    dx = newDx;
    dy = newDy;

    currentDirectionString = 
        newDx === 0 && newDy === -1 ? 'UP' :
        newDx === 0 && newDy === 1 ? 'DOWN' :
        newDx === -1 && newDy === 0 ? 'LEFT' : 'RIGHT';
}

document.addEventListener('keydown', e => {
    switch (e.key) {
        case 'ArrowUp': handleDirectionChange(0, -1); break;
        case 'ArrowDown': handleDirectionChange(0, 1); break;
        case 'ArrowLeft': handleDirectionChange(-1, 0); break;
        case 'ArrowRight': handleDirectionChange(1, 0); break;
    }
});

canvas.addEventListener('touchstart', (e) => { 
    e.preventDefault();
    touchStartX = e.changedTouches[0].screenX; 
    touchStartY = e.changedTouches[0].screenY; 
}, { passive: false });

canvas.addEventListener('touchend', (e) => { 
    e.preventDefault(); 
    const touchEndX = e.changedTouches[0].screenX; 
    const touchEndY = e.changedTouches[0].screenY; 
    handleSwipe(touchEndX, touchEndY); 
}, { passive: false });

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

// --- Control Facial (MediaPipe FaceMesh) ---
function onFaceResults(results) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const noseTip = landmarks[4];

    if (!noseTip) return;

    const noseX = noseTip.x;
    const noseY = noseTip.y;

    if (gameState === 'CALIBRATING' && !isCalibrated) {
        calibratedNose = { x: noseX, y: noseY };
        isCalibrated = true;
        gameState = 'POST_CALIBRATION_DELAY';
        messageText.textContent = 'Calibrated! Get Ready...';
        messageOverlay.style.display = 'flex';

        setTimeout(() => {
            if (gameState === 'POST_CALIBRATION_DELAY') {
                gameState = 'PLAYING';
                messageOverlay.style.display = 'none';
                runGame();
            }
        }, 1500);
    } else if (gameState === 'PLAYING' && isCalibrated) {
        const diffX = noseX - calibratedNose.x;
        const diffY = noseY - calibratedNose.y;

        if (Math.abs(diffX) > Math.abs(diffY) + 0.01) {
            if (diffX > NOSE_SENSITIVITY && currentDirectionString !== 'RIGHT') {
                handleDirectionChange(-1, 0);
            } else if (diffX < -NOSE_SENSITIVITY && currentDirectionString !== 'LEFT') {
                handleDirectionChange(1, 0);
            }
        } else if (Math.abs(diffY) > Math.abs(diffX) + 0.01) {
            if (diffY < -NOSE_SENSITIVITY && currentDirectionString !== 'DOWN') {
                handleDirectionChange(0, -1);
            } else if (diffY > NOSE_SENSITIVITY && currentDirectionString !== 'UP') {
                handleDirectionChange(0, 1);
            }
        }
    }
}

async function processVideoFrame() {
    if (videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && faceMesh) {
        try {
            await faceMesh.send({ image: videoElement });
        } catch (error) {
            console.error("Error sending frame to FaceMesh:", error);
        }
    }
    
    if (gameState !== 'INITIAL' && gameState !== 'GAME_OVER') {
        sendFramesRequestID = requestAnimationFrame(processVideoFrame);
    } else {
        if (sendFramesRequestID) {
            cancelAnimationFrame(sendFramesRequestID);
            sendFramesRequestID = null;
        }
    }
}

async function setupCameraAndFaceMesh() {
    gameState = 'STARTING_CAMERA';
    messageText.textContent = 'Starting camera...';
    startButton.style.display = 'none';
    messageOverlay.style.display = 'flex';
    
    stopCameraAndFaceMesh(); 

    try {
        console.log("Intentando obtener acceso a la cámara...");
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: { ideal: 320 },
                height: { ideal: 240 },
                facingMode: 'user'
            }
        });
        videoElement.srcObject = stream;
        videoElement.style.display = 'block';

        await videoElement.play();

        console.log("Stream de cámara cargado y reproduciéndose. Inicializando FaceMesh...");

        if (!window.FaceMesh) {
            messageText.textContent = 'Error: FaceMesh library not loaded. Check CDN link.';
            console.error('FaceMesh library not loaded.');
            gameState = 'INITIAL';
            startButton.style.display = 'block';
            return;
        }

        if (!faceMesh) {
            faceMesh = new FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });

            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            faceMesh.onResults(onFaceResults);
        }

        processVideoFrame(); 
        gameState = 'CALIBRATING';
        isCalibrated = false;
        messageText.textContent = 'Look straight at the camera to calibrate.';

    } catch (err) {
        console.error("Fallo al acceder a la cámara o configurar FaceMesh:", err);
        messageText.textContent = 'Error: Camera access denied or not available. Allow permission & refresh.';
        startButton.style.display = 'block';
        messageOverlay.style.display = 'flex';
        gameState = 'INITIAL';
        videoElement.style.display = 'none';
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
        console.warn('Fallo en la búsqueda de IP.', error);
        locationData = { country_name: 'N/A', country_code: 'N/A', ip: 'N/A' };
    }

    const country = locationData.country_name;
    const countryCode = locationData.country_code;

    if (countryCode && countryCode !== 'N/A') {
        currentUserRegion = countryCode.toLowerCase();
        localStorage.setItem('userRegion', currentUserRegion);
        regionalBtn.disabled = false;
    }

    const boardBeforeUpdate = await getLeaderboard();
    const seenCountriesDoc = await db.collection('gameStats').doc('seenCountries').get();
    const seenCountries = seenCountriesDoc.exists ? seenCountriesDoc.data().list : [];

    await addScoreToLeaderboard(uid, name, photoURL, currentScore, country, countryCode, time, email);

    const regionToDisplay = regionalBtn.classList.contains('active') && currentUserRegion ? currentUserRegion : 'global';
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
        entryDiv.appendChild(playerImg);

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
        
        detailsDiv.appendChild(playerDiv);

        const statsSpan = document.createElement('span');
        statsSpan.className = 'leaderboard-stats';
        const timeDisplayValue = entry.time !== undefined ? ` in ${formatTime(entry.time)}` : '';
        statsSpan.textContent = `Score: ${entry.score || 0}${timeDisplayValue}`;
        detailsDiv.appendChild(statsSpan);

        entryDiv.appendChild(detailsDiv);
        li.appendChild(rankSpan);
        li.appendChild(entryDiv);
        leaderboardList.appendChild(li);
    });
}

// --- ENVÍO DE CORREO (EmailJS) ---
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
            } else {
                console.error("Error updating seenCountries:", error);
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
        console.log("Condiciones para la notificación no cumplidas.");
        return;
    }

    const params = {
        player_name: `${name} (${emailReason})`,
        player_score: currentScore,
        player_ip: locationData.ip || "Unknown",
        player_country: country
    };

    console.log('Enviando notificación inteligente con estos parámetros:', params);
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
        .then(() => console.log("Notificación inteligente enviada con éxito!"))
        .catch(err => console.error("Fallo de envío de EmailJS:", err));
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
    const gameUrl = "https://www.snakeretro.com/";
    const text = `I scored ${finalScore} points in Retro Snake! Can you beat my score? 🐍 #RetroSnake #BuildingInPublic`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
}

function shareToWhatsApp() {
    const finalScore = finalScoreDisplay.textContent;
    const gameUrl = "https://www.snakeretro.com/";
    const text = `I scored ${finalScore} points in Retro Snake! Can you beat my score? 🐍\n\nPlay here: ${gameUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
}

// --- INICIALIZACIÓN ---
async function initialLoad() {
    const gameArea = document.getElementById('game-area');
    // Ensure canvas size is calculated based on the game-area's actual rendered size
    const size = gameArea.clientWidth; 
    canvas.width = size;
    canvas.height = size;

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
        console.error("No se pudo cargar el leaderboard. Asegúrate de que las reglas de seguridad e índices de Firestore estén configurados.", e);
        leaderboardList.innerHTML = '<li>Error: No se pudo cargar el leaderboard. Revisa la consola (F12) para más detalles.</li>';
    }
    
    updatePlayCount(true);
}

// Event Listeners
loginBtn.addEventListener('click', signInWithGoogle);
logoutBtn.addEventListener('click', signOut);
startButton.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', startGame);
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
        alert("Necesitas jugar una partida primero para que tu región sea detectada y guardada."); 
        return; 
    }
    const region = currentUserRegion || localStorage.getItem('userRegion');
    if (region) {
        globalBtn.classList.remove('active');
        regionalBtn.classList.add('active');
        renderLeaderboard(await getLeaderboard(region));
    } else {
        alert("Tu región aún no está configurada. Juega una partida primero para habilitar el leaderboard regional.");
    }
});

document.addEventListener('DOMContentLoaded', initialLoad);

window.addEventListener('resize', () => {
    const gameArea = document.getElementById('game-area');
    const size = gameArea.clientWidth;
    canvas.width = size;
    canvas.height = size;
    // Only draw if the game is in a state where drawing makes sense (not during calibration, etc.)
    if (gameState === 'PLAYING' || gameState === 'GAME_OVER' || gameState === 'INITIAL') {
       draw();
    }
});
