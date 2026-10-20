import { Particle, DistanceConstraint, Segment, World } from './physics.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const VIEW = { width: 0, height: 0, dpr: 1 };

// UI
const hud = document.getElementById('hud');
const timerEl = document.getElementById('timer');
const fallsEl = document.getElementById('falls');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const pauseMenu = document.getElementById('pause-menu');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const restartBtn = document.getElementById('restart-btn');
const winScreen = document.getElementById('win-screen');
const winTime = document.getElementById('win-time');
const winFalls = document.getElementById('win-falls');
const winRestartBtn = document.getElementById('win-restart-btn');

// Состояние
let gameState = 'menu'; // 'menu', 'playing', 'paused', 'won'
let startTime = 0;
let timeElapsed = 0;
let falls = 0;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  VIEW.width = w; VIEW.height = h; VIEW.dpr = dpr;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

const world = new World();
world.gravity.y = 2000;

// Карта
world.addSegment(new Segment(-300, 600, -300, -100, 0.95));
world.addSegment(new Segment(-300, -100, 0, -50, 0.95));
world.addSegment(new Segment(0, -50, 0, -300, 0.95));
world.addSegment(new Segment(-300, 600, 5000, 600, 0.95));
world.addSegment(new Segment(300, 600, 300, 400, 0.95));    
world.addSegment(new Segment(300, 400, 600, 300, 0.95));    
world.addSegment(new Segment(600, 300, 800, 300, 0.95));    
world.addSegment(new Segment(800, 300, 800, 100, 0.95));    
world.addSegment(new Segment(800, 100, 1100, 50, 0.95));    

// Игрок
const pot = new Particle(100, 570, 30, 0.1, 1.0); // Тяжелый, трение 1
const mid = new Particle(100, 490, 10, 0.5, 0.1); // Середина палки, скользит
const head = new Particle(100, 410, 20, 0.5, 0.1); // Молот, скользит

world.addParticle(pot);
world.addParticle(mid);
world.addParticle(head);

const poleLength = 180;
world.addConstraint(new DistanceConstraint(pot, mid, poleLength / 2));
world.addConstraint(new DistanceConstraint(mid, head, poleLength / 2));

const input = { x: 100, y: 410, active: false };

function updatePointer(e) {
  if (gameState !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  input.x = e.clientX - rect.left;
  input.y = e.clientY - rect.top;
}
canvas.addEventListener('pointerdown', (e) => {
  if (gameState !== 'playing') return;
  canvas.setPointerCapture(e.pointerId);
  updatePointer(e);
  input.active = true;
});
canvas.addEventListener('pointermove', (e) => {
  updatePointer(e);
  if (gameState === 'playing') input.active = true;
});
canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'mouse') input.active = false;
});
canvas.addEventListener('pointercancel', (e) => {
  if (e.pointerType !== 'mouse') input.active = false;
});

const camera = { x: 0, y: 0 };
function updateCamera() {
  const tx = pot.x - VIEW.width / 2;
  const ty = (pot.y - 100) - VIEW.height / 2;
  camera.x += (tx - camera.x) * 0.1;
  camera.y += (ty - camera.y) * 0.1;
}

const FIXED_DT = 1 / 120;
let acc = 0;
let lastTime = performance.now();

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  
  if (gameState === 'playing') {
    acc += dt;
    while (acc >= FIXED_DT) {
      step(FIXED_DT);
      acc -= FIXED_DT;
    }
    updateCamera();
    timeElapsed = (now - startTime) / 1000;
    updateHUD();
  }
  
  render();
  requestAnimationFrame(loop);
}

function step(dt) {
  if (input.active) {
    const mx = input.x + camera.x;
    const my = input.y + camera.y;
    
    // Вектор от котла к пальцу
    let dx = mx - pot.x;
    let dy = my - pot.y;
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl; dy /= dl;
    
    // Куда должен стремиться молот
    const targetX = pot.x + dx * poleLength;
    const targetY = pot.y + dy * poleLength;

    // Пружина тянет голову молота к цели
    const k = 3000; 
    const damping = 150; 

    const vx = (head.x - head.px) / dt;
    const vy = (head.y - head.py) / dt;

    let ax = (targetX - head.x) * k - vx * damping;
    let ay = (targetY - head.y) * k - vy * damping;

    const maxAccel = 50000; 
    const alen = Math.hypot(ax, ay);
    if (alen > maxAccel) {
      ax = (ax / alen) * maxAccel;
      ay = (ay / alen) * maxAccel;
    }

    head.px -= ax * dt * dt * head.invMass;
    head.py -= ay * dt * dt * head.invMass;
  }

  world.step(dt, 20);

  // Защита от проваливания
  if (pot.y > 600 - pot.radius) { pot.y = 600 - pot.radius; pot.py = pot.y; }
  if (mid.y > 600 - mid.radius) { mid.y = 600 - mid.radius; mid.py = mid.y; }
  if (head.y > 600 - head.radius) { head.y = 600 - head.radius; head.py = head.y; }

  // Падение
  if (pot.y > 1200) {
    falls++;
    pot.x = 100; pot.y = 570; pot.px = pot.x; pot.py = pot.y;
    mid.x = 100; mid.y = 490; mid.px = mid.x; mid.py = mid.y;
    head.x = 100; head.y = 410; head.px = head.x; head.py = head.y;
  }

  // Победа (проверка стоит только если играем)
  if (pot.y < 50 && pot.x > 1100) {
    gameState = 'won';
    winTime.textContent = formatTime(timeElapsed);
    winFalls.textContent = falls;
    winScreen.classList.remove('hidden');
    input.active = false;
  }
}

function render() {
  ctx.fillStyle = '#1e1e24';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(-300, 600, 5300, 2000);
  
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of world.segments) {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }

  // Рисуем древко (ломаная)
  ctx.strokeStyle = '#d4a373';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(pot.x, pot.y);
  ctx.lineTo(mid.x, mid.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();

  // Котёл
  ctx.fillStyle = '#2b2b36';
  ctx.beginPath();
  ctx.arc(pot.x, pot.y, pot.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Человечек
  ctx.fillStyle = '#e0b088';
  ctx.fillRect(pot.x - 8, pot.y - 38, 16, 30); 
  ctx.beginPath();
  ctx.arc(pot.x, pot.y - 48, 11, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(pot.x + 4, pot.y - 50, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#888';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pot.x - pot.radius + 5, pot.y - 10);
  ctx.lineTo(pot.x + pot.radius - 5, pot.y - 10);
  ctx.stroke();

  // Молот
  const angle = Math.atan2(head.y - mid.y, head.x - mid.x);
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(angle);
  ctx.fillStyle = '#888';
  ctx.fillRect(-8, -12, 16, 24);
  ctx.fillStyle = '#ccc';
  ctx.fillRect(0, -22, 28, 44);
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, -22, 28, 44);
  ctx.restore();
  
  ctx.restore();
}

// UI Функции
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateHUD() {
  timerEl.textContent = formatTime(timeElapsed);
  fallsEl.textContent = `Падений: ${falls}`;
}

function resetGame() {
  pot.x = 100; pot.y = 570; pot.px = pot.x; pot.py = pot.y;
  mid.x = 100; mid.y = 490; mid.px = mid.x; mid.py = mid.y;
  head.x = 100; head.y = 410; head.px = head.x; head.py = head.y;
  camera.x = 0; camera.y = 0;
  falls = 0;
  timeElapsed = 0;
  updateHUD();
  input.active = false;
}

// Кнопки
startBtn.addEventListener('click', () => {
  gameState = 'playing';
  startScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  resetGame();
  startTime = performance.now();
  lastTime = performance.now();
});

pauseBtn.addEventListener('click', () => {
  if (gameState === 'playing') {
    gameState = 'paused';
    pauseMenu.classList.remove('hidden');
    input.active = false;
  }
});

resumeBtn.addEventListener('click', () => {
  if (gameState === 'paused') {
    gameState = 'playing';
    pauseMenu.classList.add('hidden');
    lastTime = performance.now();
  }
});

restartBtn.addEventListener('click', () => {
  gameState = 'playing';
  pauseMenu.classList.add('hidden');
  resetGame();
  startTime = performance.now();
  lastTime = performance.now();
});

winRestartBtn.addEventListener('click', () => {
  gameState = 'playing';
  winScreen.classList.add('hidden');
  resetGame();
  startTime = performance.now();
  lastTime = performance.now();
});

resize();
requestAnimationFrame(loop);
