# Dev Challenge Snake Game 🐍 - Classic Arcade with Score Saving & Email Share

A simple but fun Snake game implemented in vanilla JavaScript, HTML5 Canvas, and CSS..  

**Features:**

- Classic snake gameplay: move with arrow keys to eat food and grow.
- Score counter updated in real time.
- Game over modal that lets you:
  - Save your score locally with your name (stored in browser localStorage).
  - See the top 10 high scores in a leaderboard.
  - Send your score directly to Francisco Villahermosa via email .
- Responsive and retro green-on-black design.

---

## How to Play

- Use the arrow keys (← ↑ → ↓) to move the snake around the grid.
- Eat the red food squares to grow and increase your score.
- Avoid hitting the walls or your own tail — this ends the game.
- When the game ends, enter your name and save your score or send it by email.
- Check the leaderboard below to see the top 10 scores!

---

## Installation

Simply clone or download this repo and open `index.html` in a modern web browser.  
No server or build tools needed.

---

## Files

- `index.html` — Game layout and modal dialog.
- `style.css` — Retro neon styling.
- `game.js` — Game logic, score saving, and email functionality.

---

## How Score Saving Works

- Scores are saved locally in your browser’s `localStorage`.
- The leaderboard shows the top 10 scores sorted from highest to lowest.
- Scores persist between sessions on the same browser/device.

---

## Email Score Feature

Clicking “Send Score by Email” opens your default mail client with a pre-filled message addressed to Francisco Villahermosa:

