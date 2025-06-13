const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const grid = 20, size = 20;
let count = 0, score = 0;

let snake = { x: 200, y: 200, dx: grid, dy: 0, cells: [], maxCells: 4 };
let food = { x: grid * 5, y: grid * 5 };

const scoreDisplay = document.getElementById('score');
const modal = document.getElementById('modal');
const finalScoreSpan = document.getElementById('final-score');
const playerNameInput = document.getElementById('player-name');
const saveScoreBtn = document.getElementById('save-score');
const sendEmailBtn = document.getElementById('send-email');
const closeModalBtn = document.getElementById('close-modal');
const highscoresTableBody = document.querySelector('#highscores tbody');

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' && snake.dx === 0)   { snake.dx = -grid; snake.dy = 0; }
  if (e.key === 'ArrowUp' && snake.dy === 0)     { snake.dx = 0; snake.dy = -grid; }
  if (e.key === 'ArrowRight' && snake.dx === 0) { snake.dx = grid; snake.dy = 0; }
  if (e.key === 'ArrowDown' && snake.dy === 0)  { snake.dx = 0; snake.dy = grid; }
});

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function reset() {
  snake.x = 200;
  snake.y = 200;
  snake.cells = [];
  snake.maxCells = 4;
  snake.dx = grid;
  snake.dy = 0;
  score = 0;
  scoreDisplay.textContent = 'Score: 0';
  food.x = getRandomInt(0, canvas.width / grid) * grid;
  food.y = getRandomInt(0, canvas.height / grid) * grid;
}

function loop() {
  requestAnimationFrame(loop);
  if (++count < 10) return;
  count = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  snake.x += snake.dx;
  snake.y += snake.dy;

  if (snake.x < 0 || snake.x >= canvas.width || snake.y < 0 || snake.y >= canvas.height) {
    return gameOver();
  }

  snake.cells.unshift({x: snake.x, y: snake.y});
  if (snake.cells.length > snake.maxCells) snake.cells.pop();

  ctx.fillStyle = '#f00';
  ctx.fillRect(food.x, food.y, grid - 1, grid - 1);

  ctx.fillStyle = '#0f0';
  for(let i = 0; i < snake.cells.length; i++) {
    const cell = snake.cells[i];
    ctx.fillRect(cell.x, cell.y, grid - 1, grid - 1);

    // Eat food
    if (cell.x === food.x && cell.y === food.y) {
      snake.maxCells++;
      score++;
      scoreDisplay.textContent = 'Score: ' + score;
      food.x = getRandomInt(0, canvas.width / grid) * grid;
      food.y = getRandomInt(0, canvas.height / grid) * grid;
    }

    // Check collision with self
    for(let j = i + 1; j < snake.cells.length; j++) {
      if (cell.x === snake.cells[j].x && cell.y === snake.cells[j].y) {
        return gameOver();
      }
    }
  }
}

function gameOver() {
  finalScoreSpan.textContent = score;
  modal.classList.remove('hidden');
  playerNameInput.focus();
  // stop game loop by not calling requestAnimationFrame here
}

saveScoreBtn.onclick = () => {
  const name = playerNameInput.value.trim() || 'Anonymous';
  saveHighScore(name, score);
  modal.classList.add('hidden');
  reset();
  playerNameInput.value = '';
  renderHighScores();
  requestAnimationFrame(loop);
};

sendEmailBtn.onclick = () => {
  const name = playerNameInput.value.trim() || 'Anonymous';
  const subject = encodeURIComponent(`Snake Game Score from ${name}`);
  const body = encodeURIComponent(`Hi Francisco Villahermosa,\n\nI scored ${score} points on your Snake game!\n\nCheers,\n${name}`);
  window.location.href = `mailto:franciscovillahermosa@gmail.com?subject=${subject}&body=${body}`;
};

closeModalBtn.onclick = () => {
  modal.classList.add('hidden');
  reset();
  playerNameInput.value = '';
  requestAnimationFrame(loop);
};

function saveHighScore(name, score) {
  const highscores = JSON.parse(localStorage.getItem('snakeHighScores')) || [];
  highscores.push({ name, score });
  highscores.sort((a,b) => b.score - a.score);
  if (highscores.length > 10) highscores.length = 10; // Keep top 10
  localStorage.setItem('snakeHighScores', JSON.stringify(highscores));
}

function renderHighScores() {
  const highscores = JSON.parse(localStorage.getItem('snakeHighScores')) || [];
  highscoresTableBody.innerHTML = '';
  highscores.forEach(({name, score}) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${name}</td><td>${score}</td>`;
    highscoresTableBody.appendChild(tr);
  });
}

// Inicializa todo
reset();
renderHighScores();
requestAnimationFrame(loop);
