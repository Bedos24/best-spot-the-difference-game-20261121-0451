// Twin Meadows — Spot the Difference: the game controller.
// Two near-identical cottage scenes stand side by side; the right one hides
// a handful of changes. Click a change on either picture to ring it on both
// pictures, and clear the round before your mistakes pile up.

import { buildScene, makeDifferences, VIEW } from './scene.js';
import { drawScene, drawMarker } from './render.js';
import { KeyboardCursor, canvasPoint } from './input.js';
import { playFind, playMiss, playHint, playWin, playClick, setMuted, isMuted } from './audio.js';

const $ = (id) => document.getElementById(id);
const leftCanvas = $('leftCanvas');
const rightCanvas = $('rightCanvas');
const leftCtx = leftCanvas.getContext('2d');
const rightCtx = rightCanvas.getContext('2d');
const SCALE = 2; // the backing store is 1200 x 1200, for crisp lines
leftCtx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
rightCtx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

// ?shot=… poses deterministic states for the screenshots; ?seed=… fixes the
// base seed those states (and a normal game) are built from.
const params = new URLSearchParams(location.search);
const shotMode = params.get('shot');
const baseSeed = Number(params.get('seed') ?? 20261121);

// All mutable play state lives in this one object.
const game = {
  state: 'title', // title | playing | complete
  round: 1,
  score: 0, // banked from finished rounds
  roundScore: 0, // earned in the round being played
  seconds: 0,
  timerOn: false,
  misses: 0,
  streak: 0,
  hintsLeft: 2,
  hintDiff: null,
  hintUntil: 0,
  missMarks: [],
  scene: null,
  altered: null,
  differences: [],
  foundLabels: [],
  lastTick: 0,
};

// Rounds ask for more differences as they go: 5, 7, 9, then 11 at most.
function diffCountFor(round) {
  return Math.min(3 + round * 2, 11);
}

function setupRound(round, seedOverride) {
  const seed = seedOverride ?? baseSeed + round * 7919;
  const scene = buildScene(seed, round - 1);
  const { altered, differences } = makeDifferences(scene, diffCountFor(round), seed ^ 0x5eed);
  game.scene = scene;
  game.altered = altered;
  game.differences = differences;
  game.round = round;
  game.roundScore = 0;
  game.seconds = 0;
  game.timerOn = !shotMode;
  game.misses = 0;
  game.streak = 0;
  game.hintsLeft = 2;
  game.hintDiff = null;
  game.missMarks = [];
  game.foundLabels = [];
  game.state = 'playing';
  updateHud();
  renderFoundLog();
  $('sceneTitle').textContent = scene.theme.title;
}

function remaining() {
  return game.differences.filter((d) => !d.found).length;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateHud() {
  $('roundLabel').textContent = `Round ${game.round}`;
  const streak = game.streak >= 2 ? ` · Streak ×${game.streak}` : '';
  $('scoreLabel').textContent = `Score ${game.score + game.roundScore}${streak}`;
  $('toFindLabel').textContent = `${remaining()} to find`;
  $('timeLabel').textContent = formatTime(game.seconds);
  $('hintButton').textContent = `Hint (${game.hintsLeft})`;
  $('hintButton').disabled = game.hintsLeft <= 0 || game.state !== 'playing';
}

function renderFoundLog() {
  $('foundLog').innerHTML = game.foundLabels.length
    ? game.foundLabels.map((l) => `<span class="found-chip">${l}</span>`).join('')
    : '<span class="found-none">Nothing found yet — click a difference in either picture.</span>';
}

function toast(text, good) {
  const el = $('toast');
  el.textContent = text;
  el.className = `toast show ${good ? 'good' : 'bad'}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => (el.className = 'toast'), 2100);
}

// A click (or an Enter press) on one panel at scene point (x, y): the
// nearest unfound difference within its tolerance is a find, anything else
// is a miss.
function check(panel, x, y) {
  if (game.state !== 'playing') return;
  game.timerOn = true;
  let best = null;
  let bestDist = Infinity;
  for (const d of game.differences) {
    if (d.found) continue;
    const dist = Math.hypot(d.x - x, d.y - y);
    if (dist < bestDist) { bestDist = dist; best = d; }
  }
  const tolerance = best ? Math.max(best.r, 30) + 12 : 0;
  if (best && bestDist <= tolerance) {
    best.found = true;
    game.streak += 1;
    const gained = 100 + Math.min(game.streak - 1, 4) * 20;
    game.roundScore += gained;
    game.foundLabels.unshift(best.label);
    playFind();
    toast(`Found: ${best.label} (+${gained})`, true);
    if (remaining() === 0) return completeRound();
  } else {
    game.streak = 0;
    game.misses += 1;
    game.roundScore = Math.max(0, game.roundScore - 25);
    game.missMarks.push({ panel, x, y, until: performance.now() + 650 });
    playMiss();
    toast('Not a difference — minus 25', false);
    const wrap = panel === 0 ? $('leftWrap') : $('rightWrap');
    wrap.classList.remove('shake');
    void wrap.offsetWidth; // restart the shake animation
    wrap.classList.add('shake');
  }
  updateHud();
  renderFoundLog();
}

function completeRound() {
  const timeBonus = Math.max(0, 300 - Math.floor(game.seconds) * 2);
  const hintBonus = game.hintsLeft * 50;
  game.roundScore += timeBonus + hintBonus;
  const finalRoundScore = game.roundScore;
  game.score += game.roundScore;
  game.roundScore = 0; // banked into the total; the HUD shows their sum
  game.state = 'complete';
  game.timerOn = false;
  playWin();
  $('completeTitle').textContent = `Round ${game.round} complete!`;
  $('completeStats').innerHTML =
    `You found all <b>${game.differences.length}</b> differences in <b>${formatTime(game.seconds)}</b> ` +
    `with <b>${game.misses}</b> wrong clicks.<br>` +
    `Time bonus +${timeBonus} · Unused hints +${hintBonus} · Round score <b>${finalRoundScore}</b>`;
  $('completeOverlay').classList.add('show');
  updateHud();
}

// A hint picks one unfound difference at random and makes it glimmer for a
// moment, at a price.
function useHint() {
  if (game.state !== 'playing' || game.hintsLeft <= 0) return;
  const open = game.differences.filter((d) => !d.found);
  if (!open.length) return;
  game.hintsLeft -= 1;
  game.roundScore = Math.max(0, game.roundScore - 150);
  game.hintDiff = open[Math.floor(Math.random() * open.length)];
  game.hintUntil = performance.now() + 1800;
  playHint();
  toast('A difference glimmers… (−150)', true);
  updateHud();
}

// One panel: the scene, a pulsing marker on every find, the hint glimmer,
// any fresh miss crosses, and the keyboard ring when it lives here.
function drawPanel(ctx, scene, panelIndex, now) {
  ctx.clearRect(0, 0, VIEW, VIEW);
  drawScene(ctx, scene, now);
  const pulse = 0.5 + 0.5 * Math.sin(now / 280);
  for (const d of game.differences) {
    if (d.found) drawMarker(ctx, d, pulse);
  }
  if (game.hintDiff && !game.hintDiff.found && now < game.hintUntil) {
    const d = game.hintDiff;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 217, 77, ${0.55 + 0.45 * Math.sin(now / 90)})`;
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(d.x, d.y, Math.max(d.r, 24) + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  for (const mark of game.missMarks) {
    if (mark.panel !== panelIndex || now > mark.until) continue;
    ctx.save();
    ctx.strokeStyle = '#e8323f';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const r = 13;
    ctx.beginPath();
    ctx.moveTo(mark.x - r, mark.y - r);
    ctx.lineTo(mark.x + r, mark.y + r);
    ctx.moveTo(mark.x + r, mark.y - r);
    ctx.lineTo(mark.x - r, mark.y + r);
    ctx.stroke();
    ctx.restore();
  }
  if (cursor.active && cursor.panel === panelIndex && game.state === 'playing') {
    cursor.draw(ctx);
  }
}

// The animation loop: advance the clock a second at a time while a round is
// being played, and repaint both panels every frame.
function frame(now) {
  if (game.timerOn && game.state === 'playing') {
    if (!game.lastTick) {
      game.lastTick = now;
    } else if (now - game.lastTick >= 1000) {
      const elapsed = now - game.lastTick;
      // A gap of several seconds means the tab was hidden or the machine
      // slept — requestAnimationFrame stalls then, and that time was not
      // spent playing, so the clock restarts from this frame rather than
      // jumping forward by the whole gap.
      if (elapsed < 5000) {
        game.seconds += Math.floor(elapsed / 1000);
        updateHud();
      }
      game.lastTick = now;
    }
  }
  if (game.scene) {
    drawPanel(leftCtx, game.scene, 0, now);
    drawPanel(rightCtx, game.altered, 1, now);
  }
  requestAnimationFrame(frame);
}

const cursor = new KeyboardCursor(
  (panel, x, y) => check(panel, x, y),
  () => useHint(),
  () => setupRound(game.round),
);

function onPanelPress(canvas, panel) {
  canvas.addEventListener('pointerdown', (e) => {
    const p = canvasPoint(canvas, e.clientX, e.clientY);
    check(panel, p.x, p.y);
  });
}
onPanelPress(leftCanvas, 0);
onPanelPress(rightCanvas, 1);

window.addEventListener('keydown', (e) => {
  if (game.state === 'playing' && cursor.handle(e)) updateHud();
});
$('hintButton').addEventListener('click', () => { playClick(); useHint(); });
$('restartButton').addEventListener('click', () => { playClick(); setupRound(game.round); });
$('soundButton').addEventListener('click', (e) => {
  setMuted(!isMuted());
  e.currentTarget.textContent = isMuted() ? 'Sound: off' : 'Sound: on';
});
$('startButton').addEventListener('click', () => {
  playClick();
  $('titleOverlay').classList.remove('show');
  game.state = 'playing';
  game.timerOn = true;
});
$('nextButton').addEventListener('click', () => {
  playClick();
  $('completeOverlay').classList.remove('show');
  setupRound(game.round + 1);
});

// Screenshot states: exact, deterministic poses of real game states, used
// by the maker's screenshot script (see shots.json). Not part of normal play.
function applyShotMode() {
  $('titleOverlay').classList.remove('show');
  if (shotMode === 'play') {
    setupRound(2);
    const firstThree = game.differences.slice(0, 3);
    firstThree.forEach((d) => { d.found = true; });
    game.foundLabels = firstThree.map((d) => d.label);
    game.seconds = 47;
    game.roundScore = 340;
    game.misses = 1;
    updateHud();
    renderFoundLog();
  } else if (shotMode === 'night') {
    setupRound(3);
    for (const d of game.differences.slice(0, 4)) {
      d.found = true;
      game.foundLabels.unshift(d.label);
    }
    game.seconds = 65;
    game.roundScore = 460;
    game.misses = 2;
    game.streak = 3;
    updateHud();
    renderFoundLog();
  } else if (shotMode === 'complete') {
    setupRound(1);
    game.differences.forEach((d) => { d.found = true; });
    game.differences.forEach((d) => game.foundLabels.unshift(d.label));
    game.seconds = 83;
    game.misses = 2;
    game.hintsLeft = 1;
    game.roundScore = 500;
    renderFoundLog();
    completeRound();
  } else {
    setupRound(1);
    game.state = 'title';
    game.timerOn = false;
    $('titleOverlay').classList.add('show');
  }
}

if (shotMode) {
  applyShotMode();
} else {
  setupRound(1);
  game.state = 'title';
  game.timerOn = false;
  $('titleOverlay').classList.add('show');
}
requestAnimationFrame(frame);
