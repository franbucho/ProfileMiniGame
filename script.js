const player = document.getElementById('player');
let posX = 230;
let posY = 230;
const speed = 10;
const size = 40;
const limit = 500;

document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowUp':
      if (posY - speed >= 0) posY -= speed;
      break;
    case 'ArrowDown':
      if (posY + speed + size <= limit) posY += speed;
      break;
    case 'ArrowLeft':
      if (posX - speed >= 0) posX -= speed;
      break;
    case 'ArrowRight':
      if (posX + speed + size <= limit) posX += speed;
      break;
  }
  player.style.top = posY + 'px';
  player.style.left = posX + 'px';
});
