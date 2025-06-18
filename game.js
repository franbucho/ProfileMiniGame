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
let faceMesh = null; // <-- ¡CORRECCIÓN AÑADIDA!

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
        // Mejor usar un modal personalizado en lugar de alert() en producción
        // Para este entorno de prueba, alert() está bien, pero recordatorio.
        alert("You must be signed in to play.");
        return;
    }
    
    // Deshabilitar botones de autenticación mientras el juego se configura/ejecuta
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
    messageOverlay.style.display = 'none'; // Ocultar overlay cuando el juego comienza
    
    elapsedTimeInSeconds = 0;
    updateTimerDisplay();
    
    updatePlayCount();
    resetGame();
    draw(); // Dibuja el estado inicial del juego
    
    gameTimerInterval = setInterval(() => {
        elapsedTimeInSeconds++;
        updateTimerDisplay();
    }, 1000);
    
    gameInterval = setInterval(() => { move(); draw(); }, GAME_SPEED);
}

function initiateGameOverSequence() {
    if (!gameInterval) return; // Evitar llamadas duplicadas
    gameOverSound.play();
    clearInterval(gameInterval);
    clearInterval(gameTimerInterval);
    gameInterval = null; // Limpiar ID del intervalo
    
    // **CLAVE:** Detener la cámara y FaceMesh al final de la partida
    stopCameraAndFaceMesh();
    
    canvas.classList.add('snake-hit'); // Añadir efecto de "golpe" visual
    setTimeout(() => {
        canvas.classList.remove('snake-hit');
        logoutBtn.disabled = false; // Re-habilitar botón de logout
        processEndOfGame(); // Procesar envío de puntuación y actualización de leaderboard
        finalScoreDisplay.textContent = score;
        gameOverScreen.classList.add('visible'); // Mostrar pantalla de "Game Over"
        gameState = 'GAME_OVER'; // Actualizar estado del juego
    }, 600); // Pequeño retraso para el efecto visual
}

// Función para detener la cámara y FaceMesh
function stopCameraAndFaceMesh() {
    if (sendFramesRequestID) {
        cancelAnimationFrame(sendFramesRequestID);
        sendFramesRequestID = null; // Reiniciar ID de la solicitud
    }
    if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop()); // Detener todas las pistas del stream
        videoElement.srcObject = null; // Limpiar el srcObject
    }
    videoElement.style.display = 'none'; // Ocultar la previsualización del video
    // No reseteamos faceMesh a null; lo reutilizamos para no tener que crearlo de nuevo
}

// --- Lógica del Juego ---
function resetGame() {
    snake = [{ x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) }];
    food = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
    dx = 1; dy = 0; // Dirección inicial: derecha
    score = 0;
    scoreDisplay.textContent = "Score: 0";
    currentDirectionString = 'RIGHT'; // Resetear la dirección de control facial
}

function draw() {
    if (!snake) return; // Asegurar que la serpiente exista antes de dibujar
    ctx.fillStyle = "#2c2c2c"; // Fondo del canvas
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cellSize = canvas.width / gridSize;
    const cornerRadius = gridSize > 25 ? 2 : 4; // Radio de las esquinas para los segmentos de la serpiente

    // Dibujar la comida
    ctx.fillStyle = "#ff4444"; // Color rojo para la comida
    ctx.beginPath();
    ctx.arc(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, cellSize / 2.2, 0, 2 * Math.PI);
    ctx.fill();

    // Dibujar la serpiente
    snake.forEach((part, index) => {
        ctx.fillStyle = (index === 0) ? "#00ff88" : "#00dd77"; // Cabeza más brillante
        ctx.beginPath();
        if (ctx.roundRect) { // Usar roundRect si está disponible para esquinas redondeadas
            ctx.roundRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize, [cornerRadius]);
            ctx.fill();
        } else { // Fallback a rectángulos para navegadores antiguos
            ctx.fillRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize);
        }
    });
}

function move() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Detectar colisiones con las paredes o con la propia serpiente
    if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize || snake.slice(1).some(p => p.x === head.x && p.y === head.y)) {
        initiateGameOverSequence(); // Activar secuencia de fin de juego
        return;
    }

    snake.unshift(head); // Añadir nueva cabeza

    // Comprobar si se ha comido la comida
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        eatSound.play();
        scoreDisplay.textContent = `Score: ${score}`;
        
        // Generar nueva posición de la comida, asegurándose de que no aparezca sobre la serpiente
        do {
            food = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
        } while (snake.some(p => p.x === food.x && p.y === food.y));
    } else {
        snake.pop(); // Si no se come la comida, se quita la cola
    }
}

// --- Controles (Teclado y Táctiles) ---
function handleDirectionChange(newDx, newDy) {
    if (gameState !== 'PLAYING') return; // Solo permitir cambios de dirección durante el juego activo

    // Evitar el movimiento en dirección opuesta inmediata (ej. ir de derecha a izquierda)
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

    // Actualizar la cadena de dirección actual
    currentDirectionString = 
        newDx === 0 && newDy === -1 ? 'UP' :
        newDx === 0 && newDy === 1 ? 'DOWN' :
        newDx === -1 && newDy === 0 ? 'LEFT' : 'RIGHT';
}

// Controles de teclado
document.addEventListener('keydown', e => {
    switch (e.key) {
        case 'ArrowUp': handleDirectionChange(0, -1); break;
        case 'ArrowDown': handleDirectionChange(0, 1); break;
        case 'ArrowLeft': handleDirectionChange(-1, 0); break;
        case 'ArrowRight': handleDirectionChange(1, 0); break;
    }
});

// Controles táctiles para móviles
canvas.addEventListener('touchstart', (e) => { 
    e.preventDefault(); // Prevenir el desplazamiento de la página
    touchStartX = e.changedTouches[0].screenX; 
    touchStartY = e.changedTouches[0].screenY; 
}, { passive: false }); // `passive: false` para permitir `preventDefault`

canvas.addEventListener('touchend', (e) => { 
    e.preventDefault(); 
    const touchEndX = e.changedTouches[0].screenX; 
    const touchEndY = e.changedTouches[0].screenY; 
    handleSwipe(touchEndX, touchEndY); 
}, { passive: false });

function handleSwipe(endX, endY) {
    const diffX = endX - touchStartX;
    const diffY = endY - touchStartY;
    const threshold = 30; // Distancia mínima para considerar un deslizamiento

    if (Math.abs(diffX) > Math.abs(diffY)) { // Deslizamiento horizontal
        if (Math.abs(diffX) > threshold) {
            handleDirectionChange(diffX > 0 ? 1 : -1, 0);
        }
    } else { // Deslizamiento vertical
        if (Math.abs(diffY) > threshold) {
            handleDirectionChange(0, diffY > 0 ? 1 : -1);
        }
    }
}

// --- Control Facial (MediaPipe FaceMesh) ---
function onFaceResults(results) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        // Si no se detecta una cara, podemos considerar pausar el juego o dar feedback
        if (gameState === 'PLAYING') {
             // messageText.textContent = 'Face Lost! Re-center.'; // Ejemplo de feedback
             // messageOverlay.style.display = 'flex';
             // Aquí podrías pausar `gameInterval` si quieres que el juego se detenga
        }
        return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const noseTip = landmarks[4]; // El índice 4 es típicamente la punta de la nariz

    if (!noseTip) return; // Asegurarse de que la punta de la nariz sea detectada

    const noseX = noseTip.x; // Coordenada X normalizada (0 a 1)
    const noseY = noseTip.y; // Coordenada Y normalizada (0 a 1)

    if (gameState === 'CALIBRATING' && !isCalibrated) {
        calibratedNose = { x: noseX, y: noseY };
        isCalibrated = true;
        gameState = 'POST_CALIBRATION_DELAY';
        messageText.textContent = 'Calibrated! Get Ready...';
        messageOverlay.style.display = 'flex'; // Asegurar que el overlay sea visible durante la cuenta regresiva

        setTimeout(() => {
            if (gameState === 'POST_CALIBRATION_DELAY') { // Solo proceder si el estado no ha cambiado
                gameState = 'PLAYING';
                messageOverlay.style.display = 'none'; // Ocultar overlay
                runGame(); // Iniciar el bucle del juego
            }
        }, 1500); // Cuenta regresiva de 1.5 segundos después de la calibración
    } else if (gameState === 'PLAYING' && isCalibrated) {
        const diffX = noseX - calibratedNose.x; // Positivo: nariz se movió a la derecha en el frame (vista de la cámara)
        const diffY = noseY - calibratedNose.y; // Positivo: nariz se movió hacia abajo en el frame (vista de la cámara)

        // Debido a que el video está espejado (transform: scaleX(-1)),
        // un movimiento físico de la cabeza hacia la DERECHA hace que noseX DISMINUYA en relación a la calibración espejada.
        // Y un movimiento físico de la cabeza hacia la IZQUIERDA hace que noseX AUMENTE en relación a la calibración espejada.
        // Por lo tanto, para el control de la serpiente:
        // Si diffX es positivo (nariz se mueve a la derecha en pantalla), significa que el jugador movió la cabeza a la IZQUIERDA -> La serpiente se mueve a la IZQUIERDA
        // Si diffX es negativo (nariz se mueve a la izquierda en pantalla), significa que el jugador movió la cabeza a la DERECHA -> La serpiente se mueve a la DERECHA

        // Similarmente para Y: diffY positivo (nariz se mueve hacia abajo en pantalla) -> jugador movió la cabeza hacia ABAJO -> La serpiente se mueve hacia ABAJO
        // diffY negativo (nariz se mueve hacia arriba en pantalla) -> jugador movió la cabeza hacia ARRIBA -> La serpiente se mueve hacia ARRIBA

        // El movimiento horizontal tiene prioridad si la desviación es mayor o similar
        if (Math.abs(diffX) > Math.abs(diffY) + 0.01) { // Pequeño buffer para priorizar movimientos claros
            if (diffX > NOSE_SENSITIVITY && currentDirectionString !== 'RIGHT') { // Jugador movió la cabeza IZQUIERDA
                handleDirectionChange(-1, 0); // Serpiente va a la IZQUIERDA
            } else if (diffX < -NOSE_SENSITIVITY && currentDirectionString !== 'LEFT') { // Jugador movió la cabeza DERECHA
                handleDirectionChange(1, 0); // Serpiente va a la DERECHA
            }
        } else if (Math.abs(diffY) > Math.abs(diffX) + 0.01) { // Prioridad al movimiento vertical
            if (diffY < -NOSE_SENSITIVITY && currentDirectionString !== 'DOWN') { // Jugador movió la cabeza ARRIBA
                handleDirectionChange(0, -1); // Serpiente va ARRIBA
            } else if (diffY > NOSE_SENSITIVITY && currentDirectionString !== 'UP') { // Jugador movió la cabeza ABAJO
                handleDirectionChange(0, 1); // Serpiente va ABAJO
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
            // Aquí podrías añadir lógica para manejar errores de procesamiento de FaceMesh
        }
    }
    // Continuar procesando frames solo si el estado del juego NO es INITIAL o GAME_OVER
    // Esto asegura que requestAnimationFrame no se llame indefinidamente cuando la cámara está apagada
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
    startButton.style.display = 'none'; // Ocultar el botón de inicio mientras la cámara se inicializa
    messageOverlay.style.display = 'flex'; // Mostrar overlay con mensaje
    
    // Asegurar que el stream de la cámara anterior esté detenido antes de intentar iniciar uno nuevo
    stopCameraAndFaceMesh(); 

    try {
        console.log("Intentando obtener acceso a la cámara...");
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: { ideal: 320 }, // Optimizado para rendimiento
                height: { ideal: 240 },
                facingMode: 'user' // Preferir la cámara frontal
            }
        });
        videoElement.srcObject = stream;
        videoElement.style.display = 'block'; // Mostrar la previsualización del video

        // **AJUSTADO CLAVE:** Esperar a que el elemento de video realmente comience a reproducirse
        await videoElement.play(); // Esto resuelve cuando el media se ha cargado y la reproducción ha comenzado

        console.log("Stream de cámara cargado y reproduciéndose. Inicializando FaceMesh...");

        // Inicializar FaceMesh si aún no se ha hecho
        if (!window.FaceMesh) { // Comprobar si la librería FaceMesh está cargada globalmente
            messageText.textContent = 'Error: FaceMesh library not loaded. Check CDN link.';
            console.error('FaceMesh library not loaded.');
            gameState = 'INITIAL';
            startButton.style.display = 'block'; // Mostrar botón de inicio de nuevo
            return;
        }

        if (!faceMesh) { // Solo crear una nueva instancia de FaceMesh si no existe
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

        // Iniciar directamente el procesamiento de frames y la transición al estado de calibración
        // Ya no dependemos de videoElement.onloadedmetadata, ya que `videoElement.play()` garantiza que esté listo.
        processVideoFrame(); 
        gameState = 'CALIBRATING';
        isCalibrated = false; // Resetear el estado de calibración para la nueva partida
        messageText.textContent = 'Look straight at the camera to calibrate.'; // Mensaje al usuario para calibrar

    } catch (err) {
        console.error("Fallo al acceder a la cámara o configurar FaceMesh:", err);
        messageText.textContent = 'Error: Camera access denied or not available. Allow permission & refresh.';
        startButton.style.display = 'block'; // Mostrar botón de inicio para reintentar
        messageOverlay.style.display = 'flex'; // Mantener el overlay visible
        gameState = 'INITIAL'; // Resetear el estado
        videoElement.style.display = 'none'; // Ocultar el elemento de video
    }
}


// --- Lógica Central de Fin de Partida ---
async function processEndOfGame() {
    const user = auth.currentUser;
    if (!user) return; // Debe estar logeado para procesar el fin del juego

    const { displayName: name, uid, photoURL, email } = user;
    const currentScore = score;
    const time = elapsedTimeInSeconds;
    let locationData;

    try {
        const response = await fetch('https://ipapi.co/json/'); // Obtener ubicación basada en IP
        locationData = response.ok ? await response.json() : { country_name: 'N/A', country_code: 'N/A', ip: 'N/A' };
    } catch (error) {
        console.warn('Fallo en la búsqueda de IP.', error);
        locationData = { country_name: 'N/A', country_code: 'N/A', ip: 'N/A' };
    }

    const country = locationData.country_name;
    const countryCode = locationData.country_code;

    if (countryCode && countryCode !== 'N/A') {
        currentUserRegion = countryCode.toLowerCase();
        localStorage.setItem('userRegion', currentUserRegion); // Guardar la región del usuario
        regionalBtn.disabled = false; // Habilitar el botón del leaderboard regional
    }

    const boardBeforeUpdate = await getLeaderboard(); // Obtener leaderboard global antes de la actualización
    // Obtener países vistos para la lógica de notificación inteligente
    const seenCountriesDoc = await db.collection('gameStats').doc('seenCountries').get();
    const seenCountries = seenCountriesDoc.exists ? seenCountriesDoc.data().list : [];

    await addScoreToLeaderboard(uid, name, photoURL, currentScore, country, countryCode, time, email);

    // Renderizar el leaderboard según la pestaña activa (global o regional)
    const regionToDisplay = regionalBtn.classList.contains('active') && currentUserRegion ? currentUserRegion : 'global';
    const updatedBoard = await getLeaderboard(regionToDisplay);
    renderLeaderboard(updatedBoard);

    sendSmartNotification(name, currentScore, country, boardBeforeUpdate, updatedBoard, seenCountries, locationData);
}

// --- Funciones de Firebase ---
async function updatePlayCount(isInitialLoad = false) {
    const counterRef = db.collection('gameStats').doc('playCounter');
    try {
        if (!isInitialLoad) { // Incrementar solo si no es la carga inicial de la página
            await counterRef.update({ count: firebase.firestore.FieldValue.increment(1) });
        }
        const doc = await counterRef.get();
        const count = doc.exists ? doc.data().count : 0;
        playCounterDisplay.textContent = `Plays: ${count.toLocaleString('en-US')}`;
    } catch (error) {
        if (error.code === 'not-found') { // Si el documento no existe, crearlo
            const startCount = isInitialLoad ? 0 : 1;
            await counterRef.set({ count: startCount });
            playCounterDisplay.textContent = `Plays: ${startCount}`;
        } else {
            console.error("Error with play counter:", error);
            playCounterDisplay.textContent = 'Plays: N/A'; // Mostrar error si algo falla
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

    // Función auxiliar para actualizar un leaderboard específico (global o regional)
    const updateLogic = async (ref) => {
        const doc = await ref.get();
        // Actualizar si la nueva puntuación es mayor, o si la puntuación es la misma pero el tiempo es menor (más rápido)
        if (!doc.exists || newScore > doc.data().score || (newScore === doc.data().score && time < doc.data().time)) {
            await ref.set(playerData);
        }
    };

    // Actualizar leaderboard global
    const globalPlayerRef = db.collection('leaderboards').doc('global').collection('scores').doc(uid);
    await updateLogic(globalPlayerRef);

    // Actualizar leaderboard regional si el código de país está disponible
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
    leaderboardList.innerHTML = ''; // Limpiar la lista actual
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
        playerImg.src = entry.photoURL || 'https://i.imgur.com/sC5gU4e.png'; // Avatar por defecto
        entryDiv.appendChild(playerImg);

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'leaderboard-details';

        const playerDiv = document.createElement('div');
        playerDiv.className = 'leaderboard-player';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'leaderboard-player-name';
        nameSpan.textContent = entry.name || 'Anonymous';
        playerDiv.appendChild(nameSpan);

        // Añadir bandera si el código de país está disponible y es válido
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
    if (currentScore === 0) { console.log("Score is 0, no notification sent."); return; } // No notificar si la puntuación es 0

    let shouldSendEmail = false;
    let emailReason = "";

    // 1. Nuevo País Alcanzado
    if (country && country !== 'N/A' && !seenCountries.includes(country)) {
        shouldSendEmail = true;
        emailReason = `New Country: ${country}!`;
        try {
            // Añadir nuevo país a la lista de países vistos
            const seenCountriesRef = db.collection('gameStats').doc('seenCountries');
            await seenCountriesRef.update({ list: firebase.firestore.FieldValue.arrayUnion(country) });
        } catch (error) {
            if (error.code === 'not-found') { // Si el documento no existe, crearlo
                await db.collection('gameStats').doc('seenCountries').set({ list: [country] });
            } else {
                console.error("Error updating seenCountries:", error);
            }
        }
    }

    // 2. Entró en el Top 5 (Global)
    const oldIndex = boardBefore.findIndex(p => p.id === auth.currentUser.uid);
    const newIndex = boardAfter.findIndex(p => p.id === auth.currentUser.uid);
    const enteredTop5 = newIndex !== -1 && newIndex < 5 && (oldIndex === -1 || oldIndex >= 5);

    if (enteredTop5 && !shouldSendEmail) { // Si aún no se envía por nuevo país
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
    localStorage.setItem('gameMuted', isMuted.toString()); // Guardar estado de mute
}

function shareToTwitter() {
    const finalScore = finalScoreDisplay.textContent;
    const gameUrl = "https://www.snakeretro.com/"; // Reemplazar con la URL real de tu juego
    const text = `I scored ${finalScore} points in Retro Snake! Can you beat my score? 🐍 #RetroSnake #BuildingInPublic`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
}

function shareToWhatsApp() {
    const finalScore = finalScoreDisplay.textContent;
    const gameUrl = "https://www.snakeretro.com/"; // Reemplazar con la URL real de tu juego
    const text = `I scored ${finalScore} points in Retro Snake! Can you beat my score? 🐍\n\nPlay here: ${gameUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
}

// --- INICIALIZACIÓN ---
async function initialLoad() {
    // Establecer dimensiones del canvas
    const gameArea = document.getElementById('game-area');
    // Usar un tamaño que se adapte al ancho disponible y a una parte del alto de la ventana
    const size = Math.min(gameArea.clientWidth, window.innerHeight * 0.6); 
    canvas.width = size;
    canvas.height = size;

    // Cargar estado de mute guardado
    const savedMuteState = localStorage.getItem('gameMuted');
    if (savedMuteState === 'true') {
        isMuted = true;
        backgroundMusic.muted = true;
        muteBtn.textContent = '🔇';
    }

    // Cargar y renderizar el leaderboard inicial
    try {
        const board = await getLeaderboard();
        renderLeaderboard(board);
    } catch(e) {
        console.error("No se pudo cargar el leaderboard. Asegúrate de que las reglas de seguridad e índices de Firestore estén configurados.", e);
        leaderboardList.innerHTML = '<li>Error: No se pudo cargar el leaderboard. Revisa la consola (F12) para más detalles.</li>';
    }
    
    // Actualizar el contador de partidas totales en la carga inicial
    updatePlayCount(true); // Pasar `true` para no incrementar en la primera carga
    
    // La lógica de `auth.onAuthStateChanged` manejará la visibilidad inicial del overlay y el botón de inicio
    // basándose en si un usuario está logeado.
}

// Event Listeners
loginBtn.addEventListener('click', signInWithGoogle);
logoutBtn.addEventListener('click', signOut);
startButton.addEventListener('click', startGame); // El botón dentro del overlay
playAgainBtn.addEventListener('click', startGame); // **AJUSTADO:** playAgainBtn también llama a startGame para recalibrar
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

// Inicializar el juego cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', initialLoad);

// Ajustar el tamaño del canvas al redimensionar la ventana
window.addEventListener('resize', () => {
    const gameArea = document.getElementById('game-area');
    const size = Math.min(gameArea.clientWidth, window.innerHeight * 0.6);
    canvas.width = size;
    canvas.height = size;
    draw(); // Redibujar la serpiente y la comida con el nuevo tamaño del canvas
});