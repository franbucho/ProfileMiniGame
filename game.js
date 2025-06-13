import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from './config.js';

emailjs.init(EMAILJS_PUBLIC_KEY);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const scoreDisplay = document.getElementById('score');
let playerNameInput = document.getElementById('playerName');

const box = 20;
const canvasSize = 400;
let snake, food, direction, score, gameInterval;

startBtn.addEventListener('click', startGame);

function startGame() {
  const name = playerNameInput.value.trim();
  if (!name) {
    alert('Please enter your name!');
    return;
  }

  direction = 'RIGHT';
  score = 0;
  snake = [{ x: 9 * box, y: 10 * box }];
  placeFood();

  clearInterval(gameInterval);
  gameInterval = setInterval(draw, 150);

  document.addEventListener('keydown', updateDirection);
}

function draw() {
  ctx.fillStyle = '#1f1f1f';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  for (let i = 0; i < snake.length; i++) {
    ctx.fillStyle = i === 0 ? '#00ff88' : '#00cc66';
    ctx.fillRect(snake[i].x, snake[i].y, box, box);
  }

  ctx.fillStyle = 'red';
  ctx.fillRect(food.x, food.y, box, box);

  let head = { ...snake[0] };

  if (direction === 'LEFT') head.x -= box;
  if (direction === 'RIGHT') head.x += box;
  if (direction === 'UP') head.y -= box;
  if (direction === 'DOWN') head.y += box;

  // Game over conditions
  if (
    head.x < 0 || head.y < 0 || head.x >= canvasSize || head.y >= canvasSize ||
    snake.some(segment => segment.x === head.x && segment.y === head.y)
  ) {
    clearInterval(gameInterval);
    sendScore(playerNameInput.value, score);
    return;
  }

  if (head.x === food.x && head.y === food.y) {
    score++;
    placeFood();
  } else {
    snake.pop();
  }

  snake.unshift(head);
  scoreDisplay.textContent = 'Score: ' + score;
}

function updateDirection(event) {
  if (event.key === 'ArrowLeft' && direction !== 'RIGHT') direction = 'LEFT';
  if (event.key === 'ArrowUp' && direction !== 'DOWN') direction = 'UP';
  if (event.key === 'ArrowRight' && direction !== 'LEFT') direction = 'RIGHT';
  if (event.key === 'ArrowDown' && direction !== 'UP') direction = 'DOWN';
}

function placeFood() {
  food = {
    x: Math.floor(Math.random() * (canvasSize / box)) * box,
    y: Math.floor(Math.random() * (canvasSize / box)) * box,
  };
}

async function sendScore(name, score) {
  const ip = await fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(data => data.ip)
    .catch(() => 'Unknown');

  const country = await fetch(`https://ipapi.co/json/`)
    .then(res => res.json())
    .then(data => data.country_name)
    .catch(() => 'Unknown');

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    player_name: name,
    player_score: score,
    player_ip: ip,
    player_country: country
  }).then(() => {
    alert('Game Over. Your score has been sent!');
  }, (err) => {
    console.error('Error sending email:', err);
  });
}
