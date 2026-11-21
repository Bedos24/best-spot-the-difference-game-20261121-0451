// Twin Meadows — Spot the Difference: game controller.
// Two near-identical cottage scenes sit side by side; the right one hides a
// handful of changes. Click a change on either picture to ring it on both,
// and clear the round before your mistakes pile up.

import { buildScene, makeDifferences, VIEW } from './scene.js';
import { drawScene, drawMarker } from './render.js';
import { KeyboardCursor, canvasPoint } from './input.js';
import { playFind, playMiss, playHint, playWin, playClick, setMuted, isMuted } from './audio.js';

const $ = (id) => document.getElementById(id);
const leftCanvas = $('leftCanvas');
const rightCanvas = $('rightCanvas');
const leftCtx = leftCanvas.getContext('2d');
const rightCtx = rightCanvas.getContext('2d');
const SCALE = 2; // backing store is 1200 x 1200 for crisp lines
leftCtx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
rightCtx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

const params = new URLSearchParams(location.search);
const shotMode = params.get('shot');
const baseSeed = Number(params.get('seed') ?? 20261121);

const game = {
  state: 'title', // title | playing | complete
  round: 1,
  score: 0,
  roundScore: 0,
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

function updateHud() {
  $('roundLabel').textContent = `Round ${game.round}`;
  const streak = game.streak >= 2 ? ` · Streak ×${game.streak}` : '';
  $('scoreLabel').textContent = `Score ${game.score + game.roundScore}${streak}`;
  $('toFindLabel').textContent = `${remaining()} to find`;
  $('hintButton').textContent = `Hint (${game.hintsLeft})`;
  $('hintButton').disabled = game.hintsLeft <= 0 || game.state !== 'playing';
  const m = Math.floor(game.seconds / 60);
  const s = Math.floor(game.seconds % 60);
  $('timeLabel').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.className = 'toast'), 2100);
}

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
    void wrap.offsetWidth;
    wrap.classList.add('shake');
  }
  updateHud();
  renderFoundLog();
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function completeRound() {
  const timeBonus = Math.max(0, 300 - Math.floor(game.seconds) * 2);
  const hintBonus = game.hintsLeft * 50;
  game.roundScore += timeBonus + hintBonus;
  const finalRoundScore = game.roundScore;
  game.score += game.roundScore;
  game.roundScore = 0; // banked into the total; the HUD adds the two together
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

function frame(now) {
  if (game.timerOn && game.state === 'playing') {
    if (game.lastTick && now - game.lastTick >= 1000) {
      game.seconds += Math.floor((now - game.lastTick) / 1000);
      game.lastTick = now;
      updateHud();
    } else if (!game.lastTick) {
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

leftCanvas.addEventListener('pointerdown', (e) => check(0, ...Object.values(canvasPoint(leftCanvas, e.clientX, e.clientY))));
rightCanvas.addEventListener('pointerdown', (e) => check(1, ...Object.values(canvasPoint(rightCanvas, e.clientX, e.clientY))));
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

// Screenshot / demo states: deterministic renders of real game states.
function applyShotMode() {
  $('titleOverlay').classList.remove('show');
  if (shotMode === 'play') {
    setupRound(2);
    game.differences.slice(0, 3).forEach((d, i) => {
      d.found = true;
      game.foundLabels.unshift(game.differences[2 - i].label);
    });
    game.seconds = 47;
    game.roundScore = 340;
    game.misses = 1;
    updateHud();
    renderFoundLog();
  } else if (shotMode === 'night') {
    setupRound(3);
    game.differences.slice(0, 4).forEach((d) => {
      d.found = true;
      game.foundLabels.unshift(d.label);
    });
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
