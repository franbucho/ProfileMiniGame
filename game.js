// --- Configuración, Sonidos, Elementos del DOM, etc. (SIN CAMBIOS) ---
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

const eatSound = new Audio('audio/eat.wav');
const gameOverSound = new Audio('audio/gameover.wav');
const backgroundMusic = new Audio('audio/music.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.3;

const loginScreen = document.getElementById('loginScreen');
const userProfile = document.getElementById('userProfile');
// ... (resto de constantes de elementos DOM son iguales) ...
const regionalBtn = document.getElementById('regionalBtn');

// --- Variables del Juego y Lógica de Auth (SIN CAMBIOS) ---
let snake, food, dx, dy, score, gameInterval, gameTimerInterval, elapsedTimeInSeconds;
// ... (resto de variables son iguales) ...
auth.onAuthStateChanged(user => { /* ... sin cambios ... */ });
function signInWithGoogle() { /* ... sin cambios ... */ }
function signOut() { /* ... sin cambios ... */ }

// --- Funciones de Flujo del Juego (SIN CAMBIOS) ---
function showLobby() { /* ... sin cambios ... */ }
function startGame() { /* ... sin cambios ... */ }
function runGame() { /* ... sin cambios ... */ }
function initiateGameOverSequence() { /* ... sin cambios ... */ }

// --- Lógica del Juego (SIN CAMBIOS) ---
function resetGame() { /* ... sin cambios ... */ }
function draw() { /* ... sin cambios ... */ }
function move() { /* ... sin cambios ... */ }

// --- Controles (SIN CAMBIOS) ---
function handleDirectionChange(newDx, newDy) { /* ... sin cambios ... */ }
document.addEventListener('keydown', e => { /* ... sin cambios ... */ });
canvas.addEventListener('touchstart', (e) => { /* ... sin cambios ... */ }, { passive: false });
canvas.addEventListener('touchend', (e) => { /* ... sin cambios ... */ }, { passive: false });
function handleSwipe(endX, endY) { /* ... sin cambios ... */ }


// --- Lógica Central de Fin de Partida (MODIFICADA) ---
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

    // ¡NUEVO! Guardar la región del usuario en la memoria del navegador
    if (countryCode && countryCode !== 'N/A') {
        localStorage.setItem('userRegion', countryCode.toLowerCase());
    }

    const boardBeforeUpdate = await getLeaderboard();
    const seenCountriesDoc = await db.collection('gameStats').doc('seenCountries').get();
    const seenCountries = seenCountriesDoc.exists ? seenCountriesDoc.data().list : [];

    await addScoreToLeaderboard(uid, name, photoURL, currentScore, country, countryCode, time, email);
    const updatedBoard = await getLeaderboard();
    renderLeaderboard(updatedBoard);

    sendSmartNotification(name, currentScore, country, boardBeforeUpdate, updatedBoard, seenCountries, locationData);
}

// --- Funciones de Firebase y resto de lógica (SIN CAMBIOS) ---
// ... (El resto del código es idéntico al de la versión anterior) ...


// --- INICIALIZACIÓN Y EVENT LISTENERS (MODIFICADO) ---
async function initialLoad() { /* ... sin cambios ... */ }

loginBtn.addEventListener('click', signInWithGoogle);
logoutBtn.addEventListener('click', signOut);
startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', runGame);
lobbyBtn.addEventListener('click', showLobby);
muteBtn.addEventListener('click', toggleMute);
twitterShareBtn.addEventListener('click', shareToTwitter);
whatsappShareBtn.addEventListener('click', shareToWhatsApp);

globalBtn.addEventListener('click', () => {
    regionalBtn.classList.remove('active');
    globalBtn.classList.add('active');
    renderLeaderboard('global');
});

// ¡NUEVA LÓGICA PARA EL BOTÓN REGIONAL!
regionalBtn.addEventListener('click', () => {
    // 1. Intentar obtener la región desde la memoria del navegador.
    const region = localStorage.getItem('userRegion');

    if (region) {
        console.log(`Loading leaderboard from saved region: ${region}`);
        globalBtn.classList.remove('active');
        regionalBtn.classList.add('active');
        renderLeaderboard(region);
    } else {
        // 2. Si no hay región guardada, avisar al usuario.
        alert("Play at least one game to set your region and view the regional leaderboard.");
    }
});

initialLoad();