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

// --- Lógica de Autenticación ---
auth.onAuthStateChanged(async (user) => {
    // Solo actualiza la UI de auth si el juego NO está activo para evitar parpadeos o conflictos
    const isGameActive = !!gameInterval || gameState === 'PLAYING'; // gameInterval will be null/undefined when game is not running
    if (user && !isGameActive) {
        loginScreen.style.display = 'none';
        userProfile.style.display = 'flex'; // Changed to flex for proper layout
        userName.textContent = user.displayName;
        userAvatar.src = user.photoURL;
        // startButton.disabled = false; // El estado de disabled se gestiona por setupCameraAndFaceMesh
        await fetchUserRegion(user.uid);
        // Si el usuario está logeado y no hay juego activo, mostramos el mensaje inicial del overlay
        messageOverlay.style.display = 'flex';
        startButton.style.display = 'block';
        messageText.textContent = 'Face Control'; // Asegura que el mensaje inicial sea este
    } else if (!user) {
        userProfile.style.display = 'none';
        loginScreen.style.display = 'flex'; // Changed to flex for proper layout
        startButton.disabled = true; // Disable start button in overlay if not signed in
        regionalBtn.disabled = true;
        currentUserRegion = null;
        // Si el usuario no está logeado, siempre mostramos el overlay de inicio de sesión
        messageOverlay.style.display = 'flex';
        startButton.style.display = 'none'; // Ocultar el botón de iniciar juego
        messageText.textContent = 'Sign in to play!'; // Mensaje para iniciar sesión
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
    isCalibrated = false;
    messageOverlay.style.display = 'flex';
    startButton.style.display = 'block';
    messageText.textContent = 'Face Control'; // Mensaje inicial para una nueva partida
    
    // Re-enable authentication UI
    auth.onAuthStateChanged(auth.currentUser);
    renderLeaderboard(globalBtn.classList.contains('active') ? 'global' : currentUserRegion);
}

function startGame() {
    if (!auth.currentUser) {
        alert("You must be signed in to play.");
        return;
    }
    
    // Disable auth buttons while game is setting up/running
    logoutBtn.disabled = true;

    if (!isMuted && backgroundMusic.paused) {
        backgroundMusic.play().catch(e => console.error("Audio autoplay was blocked by browser.", e));
    }
    
    // **CLAVE:** Siempre iniciar setup de cámara para recalibración
    setupCameraAndFaceMesh();
}

function runGame() {
    if (gameInterval) clearInterval(gameInterval);
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    
    gameOverScreen.classList.remove('visible');
    messageOverlay.style.display = 'none'; // Hide overlay when game starts
    
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
    gameInterval = null; // Clear interval ID
    
    // **CLAVE:** Detener y reiniciar la cámara y FaceMesh al final de la partida
    stopCameraAndFaceMesh();
    
    canvas.classList.add('snake-hit'); // Add hit effect
    setTimeout(() => {
        canvas.classList.remove('snake-hit');
        // Re-enable authentication UI elements after a short delay
        logoutBtn.disabled = false;
        processEndOfGame(); // Handles score submission and leaderboard update
        finalScoreDisplay.textContent = score;
        gameOverScreen.classList.add('visible'); // Show game over screen
        gameState = 'GAME_OVER'; // Update game state
    }, 600);
}

// Función para detener la cámara y FaceMesh
function stopCameraAndFaceMesh() {
    if (sendFramesRequestID) {
        cancelAnimationFrame(sendFramesRequestID);
        sendFramesRequestID = null; // Reset request ID
    }
    if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
    }
    videoElement.style.display = 'none'; // Hide the video preview
    // No reseteamos faceMesh a null, lo reutilizamos.
    // Simplemente nos aseguramos de que no envíe más frames
}

// --- Lógica del Juego ---
function resetGame() {
    snake = [{ x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) }];
    food = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
    dx = 1; dy = 0; // Initial direction right
    score = 0;
    scoreDisplay.textContent = "Score: 0";
    currentDirectionString = 'RIGHT'; // Reset facial direction
}

function draw() {
    if (!snake) return; // Ensure snake exists
    ctx.fillStyle = "#2c2c2c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cellSize = canvas.width / gridSize;
    const cornerRadius = gridSize > 25 ? 2 : 4; // Adjust corner radius based on grid size for aesthetic

    // Draw food
    ctx.fillStyle = "#ff4444";
    ctx.beginPath();
    ctx.arc(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, cellSize / 2.2, 0, 2 * Math.PI);
    ctx.fill();

    // Draw snake
    snake.forEach((part, index) => {
        ctx.fillStyle = (index === 0) ? "#00ff88" : "#00dd77"; // Head is brighter green
        ctx.beginPath();
        if (ctx.roundRect) { // Use roundRect if supported for smoother corners
            ctx.roundRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize, [cornerRadius]);
            ctx.fill();
        } else { // Fallback to square for older browsers
            ctx.fillRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize);
        }
    });
}

function move() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Check for collisions with walls or self
    if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize || snake.slice(1).some(p => p.x === head.x && p.y === head.y)) {
        initiateGameOverSequence();
        return;
    }

    snake.unshift(head); // Add new head

    // Check if food is eaten
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        eatSound.play();
        scoreDisplay.textContent = `Score: ${score}`;
        
        // Generate new food position, ensuring it's not on the snake
        do {
            food = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
        } while (snake.some(p => p.x === food.x && p.y === food.y));
    } else {
        snake.pop(); // Remove tail if no food eaten
    }
}

// --- Controles ---
function handleDirectionChange(newDx, newDy) {
    if (gameState !== 'PLAYING') return; // Only allow direction changes during active play

    // Prevent immediate reverse direction
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

    // Update currentDirectionString for logic using it
    currentDirectionString = 
        newDx === 0 && newDy === -1 ? 'UP' :
        newDx === 0 && newDy === 1 ? 'DOWN' :
        newDx === -1 && newDy === 0 ? 'LEFT' : 'RIGHT';
}

// Keyboard controls
document.addEventListener('keydown', e => {
    switch (e.key) {
        case 'ArrowUp': handleDirectionChange(0, -1); break;
        case 'ArrowDown': handleDirectionChange(0, 1); break;
        case 'ArrowLeft': handleDirectionChange(-1, 0); break;
        case 'ArrowRight': handleDirectionChange(1, 0); break;
    }
});

// Touch controls for mobile
canvas.addEventListener('touchstart', (e) => { 
    e.preventDefault(); // Prevent scrolling
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
    const threshold = 30; // Minimum swipe distance

    if (Math.abs(diffX) > Math.abs(diffY)) { // Horizontal swipe
        if (Math.abs(diffX) > threshold) {
            handleDirectionChange(diffX > 0 ? 1 : -1, 0);
        }
    } else { // Vertical swipe
        if (Math.abs(diffY) > threshold) {
            handleDirectionChange(0, diffY > 0 ? 1 : -1);
        }
    }
}

// --- Control Facial (MediaPipe FaceMesh) ---
function onFaceResults(results) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        // No face detected
        // Consider pausing the game or providing feedback if face tracking is lost during gameplay
        if (gameState === 'PLAYING') {
             // messageText.textContent = 'Face Lost! Re-center.'; // Example feedback
             // messageOverlay.style.display = 'flex';
             // You might want to pause gameInterval here if desired
        }
        return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const noseTip = landmarks[4]; // Index 4 is typically the nose tip

    if (!noseTip) return; // Ensure nose tip is detected

    const noseX = noseTip.x; // Normalized X coordinate (0 to 1)
    const noseY = noseTip.y; // Normalized Y coordinate (0 to 1)

    if (gameState === 'CALIBRATING' && !isCalibrated) {
        calibratedNose = { x: noseX, y: noseY };
        isCalibrated = true;
        gameState = 'POST_CALIBRATION_DELAY';
        messageText.textContent = 'Calibrated! Get Ready...';
        messageOverlay.style.display = 'flex'; // Ensure overlay is visible during countdown

        setTimeout(() => {
            if (gameState === 'POST_CALIBRATION_DELAY') { // Only proceed if state hasn't changed
                gameState = 'PLAYING';
                messageOverlay.style.display = 'none'; // Hide overlay
                runGame(); // Start the actual game loop
            }
        }, 1500); // 1.5 second countdown after calibration
    } else if (gameState === 'PLAYING' && isCalibrated) {
        const diffX = noseX - calibratedNose.x; // Positive: nose moved right on raw frame (camera's perspective)
        const diffY = noseY - calibratedNose.y; // Positive: nose moved down on raw frame (camera's perspective)

        // Since the video is mirrored (transform: scaleX(-1)),
        // a physical head movement to the RIGHT makes the noseX DECREASE relative to the *mirrored* calibration.
        // And a physical head movement to the LEFT makes the noseX INCREASE relative to the *mirrored* calibration.
        // Therefore, for snake control:
        // If diffX is positive (nose moves right on screen), it means player moved head LEFT -> Snake moves LEFT
        // If diffX is negative (nose moves left on screen), it means player moved head RIGHT -> Snake moves RIGHT

        // Similarly for Y, diffY positive (nose moves down on screen) -> player moved head DOWN -> Snake moves DOWN
        // diffY negative (nose moves up on screen) -> player moved head UP -> Snake moves UP

        // Horizontal movement has priority if deviation is larger or similar
        if (Math.abs(diffX) > Math.abs(diffY) + 0.01) { // Added a small buffer
            if (diffX > NOSE_SENSITIVITY && currentDirectionString !== 'RIGHT') { // Player moved head LEFT
                handleDirectionChange(-1, 0); // Snake goes LEFT
            } else if (diffX < -NOSE_SENSITIVITY && currentDirectionString !== 'LEFT') { // Player moved head RIGHT
                handleDirectionChange(1, 0); // Snake goes RIGHT
            }
        } else if (Math.abs(diffY) > Math.abs(diffX) + 0.01) { // Vertical movement priority
            if (diffY < -NOSE_SENSITIVITY && currentDirectionString !== 'DOWN') { // Player moved head UP
                handleDirectionChange(0, -1); // Snake goes UP
            } else if (diffY > NOSE_SENSITIVITY && currentDirectionString !== 'UP') { // Player moved head DOWN
                handleDirectionChange(0, 1); // Snake goes DOWN
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
            // Consider stopping the camera or showing an error to the user if this happens repeatedly
        }
    }
    // Continue processing frames only if game state is not INITIAL or GAME_OVER
    // This ensures requestAnimationFrame is not endlessly called when camera is off
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
    startButton.style.display = 'none'; // Hide the start button while camera initializes
    messageOverlay.style.display = 'flex'; // Show overlay with message
    
    // Ensure camera stream is stopped before attempting to start a new one
    stopCameraAndFaceMesh(); 

    try {
        // Request access to the user's camera
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: { ideal: 320 }, // Optimized for performance
                height: { ideal: 240 },
                facingMode: 'user' // Prefer front camera
            }
        });
        videoElement.srcObject = stream;
        videoElement.style.display = 'block'; // Show the video preview

        // Initialize FaceMesh if not already done
        if (!window.FaceMesh) {
            messageText.textContent = 'Error: FaceMesh library not loaded. Check CDN link.';
            console.error('FaceMesh library not loaded.');
            gameState = 'INITIAL';
            startButton.style.display = 'block'; // Show start button again
            return;
        }

        if (!faceMesh) { // Only create new FaceMesh instance if it doesn't exist
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

        // Wait for video metadata to load before processing frames
        videoElement.onloadedmetadata = () => {
            processVideoFrame(); // Start processing video frames for face detection
            gameState = 'CALIBRATING'; // Move to calibration state
            isCalibrated = false; // Reset calibration status for new calibration
            messageText.textContent = 'Look straight at the camera to calibrate.'; // Prompt user
        };

    } catch (err) {
        console.error("Failed to access camera or setup FaceMesh:", err);
        messageText.textContent = 'Error: Camera access denied or not available. Allow permission & refresh.';
        startButton.style.display = 'block'; // Show start button to allow retry
        messageOverlay.style.display = 'flex'; // Keep overlay visible
        gameState = 'INITIAL'; // Reset state
        videoElement.style.display = 'none'; // Hide the video element
    }
}


// --- Lógica Central de Fin de Partida ---
async function processEndOfGame() {
    const user = auth.currentUser;
    if (!user) return; // Must be logged in to process game end

    const { displayName: name, uid, photoURL, email } = user;
    const currentScore = score;
    const time = elapsedTimeInSeconds;
    let locationData;

    try {
        const response = await fetch('https://ipapi.co/json/'); // Fetch IP-based location
        locationData = response.ok ? await response.json() : { country_name: 'N/A', country_code: 'N/A', ip: 'N/A' };
    } catch (error) {
        console.warn('IP lookup failed.', error);
        locationData = { country_name: 'N/A', country_code: 'N/A', ip: 'N/A' };
    }

    const country = locationData.country_name;
    const countryCode = locationData.country_code;

    if (countryCode && countryCode !== 'N/A') {
        currentUserRegion = countryCode.toLowerCase();
        localStorage.setItem('userRegion', currentUserRegion); // Save user's region
        regionalBtn.disabled = false; // Enable regional leaderboard button
    }

    const boardBeforeUpdate = await getLeaderboard(); // Get global leaderboard before update
    // Fetch seen countries for smart notification logic
    const seenCountriesDoc = await db.collection('gameStats').doc('seenCountries').get();
    const seenCountries = seenCountriesDoc.exists ? seenCountriesDoc.data().list : [];

    await addScoreToLeaderboard(uid, name, photoURL, currentScore, country, countryCode, time, email);

    // Render leaderboard based on the currently active tab (global or regional)
    const regionToDisplay = regionalBtn.classList.contains('active') && currentUserRegion ? currentUserRegion : 'global';
    const updatedBoard = await getLeaderboard(regionToDisplay);
    renderLeaderboard(updatedBoard);

    sendSmartNotification(name, currentScore, country, boardBeforeUpdate, updatedBoard, seenCountries, locationData);
}

// --- Funciones de Firebase ---
async function updatePlayCount(isInitialLoad = false) {
    const counterRef = db.collection('gameStats').doc('playCounter');
    try {
        if (!isInitialLoad) { // Increment only if it's not the initial page load
            await counterRef.update({ count: firebase.firestore.FieldValue.increment(1) });
        }
        const doc = await counterRef.get();
        const count = doc.exists ? doc.data().count : 0;
        playCounterDisplay.textContent = `Plays: ${count.toLocaleString('en-US')}`;
    } catch (error) {
        if (error.code === 'not-found') { // If document doesn't exist, create it
            const startCount = isInitialLoad ? 0 : 1;
            await counterRef.set({ count: startCount });
            playCounterDisplay.textContent = `Plays: ${startCount}`;
        } else {
            console.error("Error with play counter:", error);
            playCounterDisplay.textContent = 'Plays: N/A'; // Show error if something goes wrong
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

    // Helper function to update a specific leaderboard (global or regional)
    const updateLogic = async (ref) => {
        const doc = await ref.get();
        // Update if new score is higher, or if score is same but time is faster
        if (!doc.exists || newScore > doc.data().score || (newScore === doc.data().score && time < doc.data().time)) {
            await ref.set(playerData);
        }
    };

    // Update global leaderboard
    const globalPlayerRef = db.collection('leaderboards').doc('global').collection('scores').doc(uid);
    await updateLogic(globalPlayerRef);

    // Update regional leaderboard if country code is available
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
    leaderboardList.innerHTML = ''; // Clear current list
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
        playerImg.src = entry.photoURL || 'https://i.imgur.com/sC5gU4e.png'; // Default avatar
        entryDiv.appendChild(playerImg);

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'leaderboard-details';

        const playerDiv = document.createElement('div');
        playerDiv.className = 'leaderboard-player';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'leaderboard-player-name';
        nameSpan.textContent = entry.name || 'Anonymous';
        playerDiv.appendChild(nameSpan);

        // Add flag if country code is available and valid
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
        const timeDisplay = entry.time !== undefined ? ` in ${formatTime(entry.time)}` : '';
        statsSpan.textContent = `Score: ${entry.score || 0}${timeDisplay}`;
        detailsDiv.appendChild(statsSpan);

        entryDiv.appendChild(detailsDiv);
        li.appendChild(rankSpan);
        li.appendChild(entryDiv);
        leaderboardList.appendChild(li);
    });
}

// --- ENVÍO DE CORREO (EmailJS) ---
async function sendSmartNotification(name, currentScore, country, boardBefore, boardAfter, seenCountries, locationData) {
    if (currentScore === 0) { console.log("Score is 0, no notification sent."); return; } // Don't notify for 0 scores

    let shouldSendEmail = false;
    let emailReason = "";

    // 1. New Country Reached
    if (country && country !== 'N/A' && !seenCountries.includes(country)) {
        shouldSendEmail = true;
        emailReason = `New Country: ${country}!`;
        try {
            // Add new country to seen countries list
            const seenCountriesRef = db.collection('gameStats').doc('seenCountries');
            await seenCountriesRef.update({ list: firebase.firestore.FieldValue.arrayUnion(country) });
        } catch (error) {
            if (error.code === 'not-found') { // If the document doesn't exist, create it
                await db.collection('gameStats').doc('seenCountries').set({ list: [country] });
            } else {
                console.error("Error updating seenCountries:", error);
            }
        }
    }

    // 2. Entered Top 5 (Global)
    const oldIndex = boardBefore.findIndex(p => p.id === auth.currentUser.uid);
    const newIndex = boardAfter.findIndex(p => p.id === auth.currentUser.uid);
    const enteredTop5 = newIndex !== -1 && newIndex < 5 && (oldIndex === -1 || oldIndex >= 5);

    if (enteredTop5 && !shouldSendEmail) { // If not already sending for new country
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
    localStorage.setItem('gameMuted', isMuted.toString()); // Save mute state
}

function shareToTwitter() {
    const finalScore = finalScoreDisplay.textContent;
    const gameUrl = "https://www.snakeretro.com/"; // Replace with your actual game URL
    const text = `I scored ${finalScore} points in Retro Snake! Can you beat my score? 🐍 #RetroSnake #BuildingInPublic`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
}

function shareToWhatsApp() {
    const finalScore = finalScoreDisplay.textContent;
    const gameUrl = "https://www.snakeretro.com/"; // Replace with your actual game URL
    const text = `I scored ${finalScore} points in Retro Snake! Can you beat my score? 🐍\n\nPlay here: ${gameUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
}

// --- INICIALIZACIÓN ---
async function initialLoad() {
    // Set canvas dimensions
    const gameArea = document.getElementById('game-area');
    // Consider using a fixed aspect ratio or max size relative to viewport width/height
    const size = Math.min(gameArea.clientWidth, window.innerHeight * 0.6); 
    canvas.width = size;
    canvas.height = size;

    // Load saved mute state
    const savedMuteState = localStorage.getItem('gameMuted');
    if (savedMuteState === 'true') {
        isMuted = true;
        backgroundMusic.muted = true;
        muteBtn.textContent = '🔇';
    }

    // Load and render initial leaderboard
    try {
        const board = await getLeaderboard();
        renderLeaderboard(board);
    } catch(e) {
        console.error("Could not load leaderboard. Make sure Firestore security rules and indexes are set up.", e);
        leaderboardList.innerHTML = '<li>Error: Could not load leaderboard. Check console (F12) for details.</li>';
    }
    
    // Update total play count on initial load
    updatePlayCount(true); // Pass true to not increment on first load
    
    // Display initial message overlay. Auth state listener will handle button visibility.
    messageOverlay.style.display = 'flex';
    if (auth.currentUser) { // If already signed in on load
        startButton.style.display = 'block';
        messageText.textContent = 'Face Control';
    } else { // If not signed in on load
        startButton.style.display = 'none';
        messageText.textContent = 'Sign in to play!';
    }
}

// Event Listeners
loginBtn.addEventListener('click', signInWithGoogle);
logoutBtn.addEventListener('click', signOut);
startButton.addEventListener('click', startGame); // Use the button inside the overlay
playAgainBtn.addEventListener('click', startGame); // **AJUSTADO:** playAgainBtn ahora también llama a startGame para recalibrar
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
        alert("You need to play a game first for your region to be detected and stored."); 
        return; 
    }
    const region = currentUserRegion || localStorage.getItem('userRegion');
    if (region) {
        globalBtn.classList.remove('active');
        regionalBtn.classList.add('active');
        renderLeaderboard(await getLeaderboard(region));
    } else {
        alert("Your region is not set yet. Play a game first to enable regional leaderboard.");
    }
});

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initialLoad);

// Adjust canvas size on window resize
window.addEventListener('resize', () => {
    const gameArea = document.getElementById('game-area');
    const size = Math.min(gameArea.clientWidth, window.innerHeight * 0.6);
    canvas.width = size;
    canvas.height = size;
    draw(); // Redraw snake and food in new canvas size
});