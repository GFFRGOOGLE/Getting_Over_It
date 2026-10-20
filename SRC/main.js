// SRC/main.js — Шаг 3 (Исправленная физика и полный код)
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

// Карта (гора)
world.addSegment(new Segment(-500, 600, 5000, 600, 0.85)); // Земля
world.addSegment(new Segment(300, 600, 300, 400, 0.9));    // 1
world.addSegment(new Segment(300, 400, 600, 300, 0.9));    // 2
world.addSegment(new Segment(600, 300, 800, 300, 0.9));    // 3
world.addSegment(new Segment(800, 300, 800, 100, 0.9));    // 4
world.addSegment(new Segment(800, 100, 1100, 50, 0.9));    // 5
world.addSegment(new Segment(1100, 50, 1300, 150, 0.9));   // 6
world.addSegment(new Segment(1300, 150, 1500, -200, 0.9)); // 7

// --- Игрок ---
// Котёл тяжелее молота (invMass = 0.2)
const pot = new Particle(100, 570, 30, 0.2); 
// Молот легче (invMass = 1)
const head = new Particle(100, 430, 14, 1); 
world.addParticle(pot);
world.addParticle(head);

const poleLength = 140;
world.addConstraint(new DistanceConstraint(pot, head, poleLength));

// --- Ввод ---
const input = { x: 100, y: 430, active: false };

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
    const mx = input.x + camera.x;
    const my = input.y + camera.y;
    
    let dx = mx - pot.x;
    let dy = my - pot.y;
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl; dy /= dl;
    
    const tx = pot.x + dx * poleLength;
    const ty = pot.y + dy * poleLength;
    
    let hx = tx - head.x;
    let hy = ty - head.y;
    
    const k = 1500; // Жесткость пружины
    let ax = hx * k;
    let ay = hy * k;
    
    const maxAccel = 6000;
    const alen = Math.hypot(ax, ay);
    if (alen > maxAccel) {
      ax = (ax / alen) * maxAccel;
      ay = (ay / alen) * maxAccel;
    }
    
    head.px -= ax * dt * dt;
    head.py -= ay * dt * dt;
  }
  
  world.step(dt);
  
  if (pot.y > 1200) {
    pot.x = 100; pot.y = 570; pot.px = pot.x; pot.py = pot.y;
    head.x = 100; head.y = 430; head.px = head.x; head.py = head.y;
  }
}

// --- Отрисовка ---
function render() {
  ctx.fillStyle = '#1e1e24';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // Уровень
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

  // Молоток
  ctx.strokeStyle = '#d4a373';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(pot.x, pot.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();

  const angle = Math.atan2(head.y - pot.y, head.x - pot.x);
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(angle);
  ctx.fillStyle = '#888';
  ctx.fillRect(-6, -16, 12, 32);
  ctx.fillStyle = '#ccc';
  ctx.fillRect(0, -20, 16, 40);
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, -20, 16, 40);
  ctx.restore();

  // Котёл
  ctx.fillStyle = '#2b2b36';
  ctx.beginPath();
  ctx.arc(pot.x, pot.y, pot.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Человечек
  ctx.save();
  ctx.translate(pot.x, pot.y);
  ctx.rotate(angle);
  ctx.fillStyle = '#e0b088'; 
  ctx.fillRect(-5, -30, 10, 20); 
  ctx.beginPath();
  ctx.arc(0, -35, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

// Запуск
resize();
requestAnimationFrame(loop);
