// Twin Meadows — the controller that ties the game together.
//
// Two canvases show the same cottage meadow; the right-hand one is the
// altered twin. This file owns the play state, the clock, scoring, hints,
// and the deterministic ?shot= poses the screenshots are taken from.

import { buildScene, makeDifferences, VIEW } from './scene.js';
import { drawScene, drawMarker } from './render.js';
import { KeyboardCursor, canvasPoint } from './input.js';
import { playFind, playMiss, playHint, playWin, playClick, setMuted, isMuted } from './audio.js';

const el = (id) => document.getElementById(id);
const boardL = el('leftCanvas');
const boardR = el('rightCanvas');
const penL = boardL.getContext('2d');
const penR = boardR.getContext('2d');

// The canvases' backing store is 1200 x 1200 while the scene grid is
// 600 x 600, so both pens live under a permanent 2x transform.
const ZOOM = 2;
penL.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);
penR.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);

// URL knobs: ?seed= fixes the base seed (and therefore every round), and
// ?shot= poses one exact game state for the screenshot script.
const query = new URLSearchParams(location.search);
const shotMode = query.get('shot');
const baseSeed = Number(query.get('seed') ?? 20261121);

// Everything that changes while playing, in one place.
const play = {
  phase: 'title', // title -> playing -> complete, per round
  round: 1,
  banked: 0, // points from finished rounds
  roundPoints: 0, // points earned in the round under way
  seconds: 0,
  clockRunning: false,
  wrongClicks: 0,
  streak: 0,
  hintsLeft: 2,
  hintTarget: null,
  hintExpires: 0,
  missMarks: [],
  scene: null,
  twin: null,
  diffs: [],
  foundLog: [],
  lastTick: 0,
};

// Round n hides 5, 7, 9, then 11 differences; it never asks for more.
const diffsForRound = (round) => Math.min(3 + round * 2, 11);

function startRound(round, seedOverride) {
  const seed = seedOverride ?? baseSeed + round * 7919;
  const scene = buildScene(seed, round - 1);
  const made = makeDifferences(scene, diffsForRound(round), seed ^ 0x5eed);
  play.scene = scene;
  play.twin = made.altered;
  play.diffs = made.differences;
  play.round = round;
  play.roundPoints = 0;
  play.seconds = 0;
  play.clockRunning = !shotMode;
  play.wrongClicks = 0;
  play.streak = 0;
  play.hintsLeft = 2;
  play.hintTarget = null;
  play.missMarks = [];
  play.foundLog = [];
  play.phase = 'playing';
  el('sceneTitle').textContent = scene.theme.title;
  refreshHud();
  paintFoundLog();
}

const leftToFind = () => play.diffs.filter((d) => !d.found).length;

function clockText(totalSeconds) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(Math.floor(totalSeconds % 60)).padStart(2, '0');
  return `${mm}:${ss}`;
}

function refreshHud() {
  el('roundLabel').textContent = `Round ${play.round}`;
  const streakNote = play.streak >= 2 ? ` · Streak ×${play.streak}` : '';
  el('scoreLabel').textContent = `Score ${play.banked + play.roundPoints}${streakNote}`;
  el('toFindLabel').textContent = `${leftToFind()} to find`;
  el('timeLabel').textContent = clockText(play.seconds);
  const hintBtn = el('hintButton');
  hintBtn.textContent = `Hint (${play.hintsLeft})`;
  hintBtn.disabled = play.hintsLeft <= 0 || play.phase !== 'playing';
}

function paintFoundLog() {
  el('foundLog').innerHTML = play.foundLog.length
    ? play.foundLog.map((label) => `<span class="found-chip">${label}</span>`).join('')
    : '<span class="found-none">Nothing found yet — click a difference in either picture.</span>';
}

let toastTimer = null;
function announce(text, good) {
  const box = el('toast');
  box.textContent = text;
  box.className = `toast show ${good ? 'good' : 'bad'}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.className = 'toast'; }, 2100);
}

// The heart of the game: a pointer (or Enter) lands at scene point (x, y)
// on one of the panels. The nearest still-hidden difference within its
// tolerance scores; anything else is a miss.
function probe(panel, x, y) {
  if (play.phase !== 'playing') return;
  play.clockRunning = true;

  let nearest = null;
  let nearestDist = Infinity;
  for (const d of play.diffs) {
    if (d.found) continue;
    const dist = Math.hypot(d.x - x, d.y - y);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = d;
    }
  }

  const tolerance = nearest ? Math.max(nearest.r, 30) + 12 : 0;
  if (nearest && nearestDist <= tolerance) {
    nearest.found = true;
    play.streak += 1;
    const gained = 100 + Math.min(play.streak - 1, 4) * 20;
    play.roundPoints += gained;
    play.foundLog.unshift(nearest.label);
    playFind();
    announce(`Found: ${nearest.label} (+${gained})`, true);
    if (leftToFind() === 0) {
      finishRound();
      return;
    }
  } else {
    play.streak = 0;
    play.wrongClicks += 1;
    play.roundPoints = Math.max(0, play.roundPoints - 25);
    play.missMarks.push({ panel, x, y, until: performance.now() + 650 });
    playMiss();
    announce('Not a difference — minus 25', false);
    const wrap = el(panel === 0 ? 'leftWrap' : 'rightWrap');
    wrap.classList.remove('shake');
    void wrap.offsetWidth; // force reflow so the shake animation restarts
    wrap.classList.add('shake');
  }
  refreshHud();
  paintFoundLog();
}

function finishRound() {
  const timeBonus = Math.max(0, 300 - Math.floor(play.seconds) * 2);
  const hintBonus = play.hintsLeft * 50;
  play.roundPoints += timeBonus + hintBonus;
  const settled = play.roundPoints;
  play.banked += settled;
  play.roundPoints = 0; // banked now; the HUD shows the combined total
  play.phase = 'complete';
  play.clockRunning = false;
  playWin();
  el('completeTitle').textContent = `Round ${play.round} complete!`;
  el('completeStats').innerHTML =
    `You found all <b>${play.diffs.length}</b> differences in <b>${clockText(play.seconds)}</b> ` +
    `with <b>${play.wrongClicks}</b> wrong clicks.<br>` +
    `Time bonus +${timeBonus} · Unused hints +${hintBonus} · Round score <b>${settled}</b>`;
  el('completeOverlay').classList.add('show');
  refreshHud();
}

// A hint costs points and makes one unfound difference glimmer briefly.
function spendHint() {
  if (play.phase !== 'playing' || play.hintsLeft <= 0) return;
  const open = play.diffs.filter((d) => !d.found);
  if (open.length === 0) return;
  play.hintsLeft -= 1;
  play.roundPoints = Math.max(0, play.roundPoints - 150);
  play.hintTarget = open[Math.floor(Math.random() * open.length)];
  play.hintExpires = performance.now() + 1800;
  playHint();
  announce('A difference glimmers… (−150)', true);
  refreshHud();
}

// Paint one panel: the picture itself, a pulsing ring on every find, the
// hint glimmer while it lasts, fresh miss crosses, and the keyboard ring
// when the keyboard player is on this side.
function paintPanel(pen, scene, panelIndex, now) {
  pen.clearRect(0, 0, VIEW, VIEW);
  drawScene(pen, scene, now);
  const pulse = 0.5 + 0.5 * Math.sin(now / 280);
  for (const d of play.diffs) {
    if (d.found) drawMarker(pen, d, pulse);
  }

  const hint = play.hintTarget;
  if (hint && !hint.found && now < play.hintExpires) {
    pen.save();
    pen.strokeStyle = `rgba(255, 217, 77, ${0.55 + 0.45 * Math.sin(now / 90)})`;
    pen.lineWidth = 5;
    pen.setLineDash([10, 8]);
    pen.beginPath();
    pen.arc(hint.x, hint.y, Math.max(hint.r, 24) + 12, 0, Math.PI * 2);
    pen.stroke();
    pen.restore();
  }

  for (const mark of play.missMarks) {
    if (mark.panel !== panelIndex || now > mark.until) continue;
    pen.save();
    pen.strokeStyle = '#e8323f';
    pen.lineWidth = 6;
    pen.lineCap = 'round';
    pen.beginPath();
    pen.moveTo(mark.x - 13, mark.y - 13);
    pen.lineTo(mark.x + 13, mark.y + 13);
    pen.moveTo(mark.x + 13, mark.y - 13);
    pen.lineTo(mark.x - 13, mark.y + 13);
    pen.stroke();
    pen.restore();
  }

  if (ring.active && ring.panel === panelIndex && play.phase === 'playing') {
    ring.draw(pen);
  }
}

// The frame loop: advance the round clock in whole seconds while playing,
// then repaint both panels.
function tick(now) {
  if (play.clockRunning && play.phase === 'playing') {
    if (!play.lastTick) {
      play.lastTick = now;
    } else if (now - play.lastTick >= 1000) {
      const gap = now - play.lastTick;
      // A multi-second gap means the tab was hidden or the machine slept
      // (requestAnimationFrame stalls in both cases). That time was not
      // spent playing, so the clock resumes from this frame instead of
      // lurching forward by the whole gap.
      if (gap < 5000) {
        play.seconds += Math.floor(gap / 1000);
        refreshHud();
      }
      play.lastTick = now;
    }
  }
  if (play.scene) {
    paintPanel(penL, play.scene, 0, now);
    paintPanel(penR, play.twin, 1, now);
  }
  requestAnimationFrame(tick);
}

const ring = new KeyboardCursor(
  (panel, x, y) => probe(panel, x, y),
  () => spendHint(),
  () => startRound(play.round),
);

function wirePanel(canvas, panelIndex) {
  canvas.addEventListener('pointerdown', (event) => {
    const p = canvasPoint(canvas, event.clientX, event.clientY);
    probe(panelIndex, p.x, p.y);
  });
}
wirePanel(boardL, 0);
wirePanel(boardR, 1);

window.addEventListener('keydown', (event) => {
  if (play.phase === 'playing' && ring.handle(event)) refreshHud();
});
el('hintButton').addEventListener('click', () => { playClick(); spendHint(); });
el('restartButton').addEventListener('click', () => { playClick(); startRound(play.round); });
el('soundButton').addEventListener('click', (event) => {
  setMuted(!isMuted());
  event.currentTarget.textContent = isMuted() ? 'Sound: off' : 'Sound: on';
});
el('startButton').addEventListener('click', () => {
  playClick();
  el('titleOverlay').classList.remove('show');
  play.phase = 'playing';
  play.clockRunning = true;
});
el('nextButton').addEventListener('click', () => {
  playClick();
  el('completeOverlay').classList.remove('show');
  startRound(play.round + 1);
});

// --- Screenshot poses ---------------------------------------------------------
// Deterministic, exact states for the maker's screenshot script (see
// shots.json). These are poses of the real game, not a separate mode of
// play: each one starts a genuine round and then applies clicks' worth of
// state by hand.

function poseShot() {
  el('titleOverlay').classList.remove('show');
  if (shotMode === 'play') {
    startRound(2);
    const firstThree = play.diffs.slice(0, 3);
    for (const d of firstThree) d.found = true;
    play.foundLog = firstThree.map((d) => d.label);
    play.seconds = 47;
    play.roundPoints = 340;
    play.wrongClicks = 1;
    refreshHud();
    paintFoundLog();
  } else if (shotMode === 'night') {
    startRound(3);
    for (const d of play.diffs.slice(0, 4)) {
      d.found = true;
      play.foundLog.unshift(d.label);
    }
    play.seconds = 65;
    play.roundPoints = 460;
    play.wrongClicks = 2;
    play.streak = 3;
    refreshHud();
    paintFoundLog();
  } else if (shotMode === 'complete') {
    startRound(1);
    for (const d of play.diffs) {
      d.found = true;
      play.foundLog.unshift(d.label);
    }
    play.seconds = 83;
    play.wrongClicks = 2;
    play.hintsLeft = 1;
    play.roundPoints = 500;
    paintFoundLog();
    finishRound();
  } else {
    poseTitle();
  }
}

function poseTitle() {
  startRound(1);
  play.phase = 'title';
  play.clockRunning = false;
  el('titleOverlay').classList.add('show');
}

if (shotMode) poseShot();
else poseTitle();
requestAnimationFrame(tick);
