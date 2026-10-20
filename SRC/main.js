// src/main.js — Полная сборка игры
import { Particle, DistanceConstraint, Segment, World } from './physics.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const VIEW = { width: 0, height: 0, dpr: 1 };

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

// --- Мир ---
const world = new World();
world.gravity.y = 2000;

// ЛЕВАЯ ГОРА С КОЗЫРЬКОМ
world.addSegment(new Segment(-300, 600, -300, -100, 0.95)); // Стена
world.addSegment(new Segment(-300, -100, 0, -50, 0.95));    // Козырек
world.addSegment(new Segment(0, -50, 0, -300, 0.95));       // Стена наверх

// ЗЕМЛЯ (высокое трение)
world.addSegment(new Segment(-300, 600, 5000, 600, 0.95));

// ПРЕПЯТСТВИЯ СПРАВА
world.addSegment(new Segment(300, 600, 300, 400, 0.95));    // Столб
world.addSegment(new Segment(300, 400, 600, 300, 0.95));    // Наклонный склон
world.addSegment(new Segment(600, 300, 800, 300, 0.95));    // Площадка
world.addSegment(new Segment(800, 300, 800, 100, 0.95));    // Отвесная стена
world.addSegment(new Segment(800, 100, 1100, 50, 0.95));    // Уступ

// --- Игрок ---
// Котёл тяжелый (масса 5, invMass = 0.2)
const pot = new Particle(100, 570, 30, 0.2); 
// Молот (масса 2, invMass = 0.5)
const head = new Particle(100, 410, 20, 0.5); 
world.addParticle(pot);
world.addParticle(head);

// Длина палки
const poleLength = 180;
world.addConstraint(new DistanceConstraint(pot, head, poleLength));

// --- Ввод ---
const input = { x: 100, y: 410, active: false };

function updatePointer(e) {
  const rect = canvas.getBoundingClientRect();
  input.x = e.clientX - rect.left;
  input.y = e.clientY - rect.top;
}
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  updatePointer(e);
  input.active = true;
});
canvas.addEventListener('pointermove', (e) => {
  updatePointer(e);
  input.active = true;
});
canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'mouse') input.active = false;
});
canvas.addEventListener('pointercancel', (e) => {
  if (e.pointerType !== 'mouse') input.active = false;
});

// --- Камера ---
const camera = { x: 0, y: 0 };
function updateCamera() {
  const tx = pot.x - VIEW.width / 2;
  const ty = (pot.y - 100) - VIEW.height / 2;
  camera.x += (tx - camera.x) * 0.1;
  camera.y += (ty - camera.y) * 0.1;
}

// --- Цикл ---
const FIXED_DT = 1 / 120;
let acc = 0;
let lastTime = performance.now();

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  acc += dt;
  while (acc >= FIXED_DT) {
    step(FIXED_DT);
    acc -= FIXED_DT;
  }
  updateCamera();
  render();
  requestAnimationFrame(loop);
}

function step(dt) {
  if (input.active) {
    const tx = input.x + camera.x;
    const ty = input.y + camera.y;

    // Физика тянет молот к пальцу
    const k = 4000; 
    const damping = 150; 

    const vx = (head.x - head.px) / dt;
    const vy = (head.y - head.py) / dt;

    let ax = (tx - head.x) * k - vx * damping;
    let ay = (ty - head.y) * k - vy * damping;

    // Ограничиваем силу, чтобы нельзя было поднять котёл в воздух
    const maxAccel = 20000; 
    const alen = Math.hypot(ax, ay);
    if (alen > maxAccel) {
      ax = (ax / alen) * maxAccel;
      ay = (ay / alen) * maxAccel;
    }

    head.px -= ax * dt * dt;
    head.py -= ay * dt * dt;

    // Ограничение скорости
    let hvx = head.x - head.px;
    let hvy = head.y - head.py;
    const maxSpeed = 25; 
    const speed = Math.hypot(hvx, hvy);
    if (speed > maxSpeed) {
      head.px = head.x - (hvx / speed) * maxSpeed;
      head.py = head.y - (hvy / speed) * maxSpeed;
    }
  }

  // Итераций побольше для надежного трения
  world.step(dt, 20);

  // Жесткий пол (страховка)
  if (pot.y > 600 - pot.radius) {
    pot.y = 600 - pot.radius;
    pot.py = pot.y;
  }
  if (head.y > 600 - head.radius) {
    head.y = 600 - head.radius;
    head.py = head.y;
  }

  if (pot.y > 1200) {
    pot.x = 100; pot.y = 570; pot.px = pot.x; pot.py = pot.y;
    head.x = 100; head.y = 410; head.px = head.x; head.py = head.y;
  }
}

// --- Отрисовка ---
function render() {
  ctx.fillStyle = '#1e1e24';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // Земля
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(-300, 600, 5300, 2000);
  
  // Линии уровня
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

  // Древко
  ctx.strokeStyle = '#d4a373';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(pot.x, pot.y);
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

  // Голова молота
  const angle = Math.atan2(head.y - pot.y, head.x - pot.x);
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

resize();
requestAnimationFrame(loop);