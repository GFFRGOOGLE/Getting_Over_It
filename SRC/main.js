// src/main.js — точка входа
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

// Тестовый уровень (пока черновой — потом заменим на настоящую карту)
const LEVEL_W = 2000;
world.addSegment(new Segment(0, 600, LEVEL_W, 600, 0.85)); // земля
world.addSegment(new Segment(400, 600, 400, 450, 0.9));   // столбик 1
world.addSegment(new Segment(700, 600, 700, 500, 0.9));   // столбик 2
world.addSegment(new Segment(700, 500, 1000, 500, 0.9));  // площадка
world.addSegment(new Segment(1000, 500, 1200, 500, 0.9)); // продолжение
world.addSegment(new Segment(1200, 500, 1200, 400, 0.9)); // ступенька

// Игрок: котёл + голова молотка, соединены жёсткой связью
const pot = new Particle(200, 570, 30, 1);
const head = new Particle(200, 430, 14, 1);
world.addParticle(pot);
world.addParticle(head);
const poleLength = 140;
world.addConstraint(new DistanceConstraint(pot, head, poleLength));

// --- Ввод (мышь + тач через Pointer Events) ---
const input = { x: 200, y: 430, active: false };

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
  const ty = pot.y - VIEW.height / 2;
  camera.x += (tx - camera.x) * 0.15;
  camera.y += (ty - camera.y) * 0.15;
}

// --- Цикл с фиксированным шагом ---
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
    // Мировая точка курсора
    const mx = input.x + camera.x;
    const my = input.y + camera.y;
    // Направление от котла к курсору
    let dx = mx - pot.x;
    let dy = my - pot.y;
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl; dy /= dl;
    // Желаемая позиция головы — на окружности радиуса poleLength
    const tx = pot.x + dx * poleLength;
    const ty = pot.y + dy * poleLength;
    // Тянем голову к этой точке через скорость, с потолком
    let hx = tx - head.x;
    let hy = ty - head.y;
    const hd = Math.hypot(hx, hy) || 1;
    const speed = Math.min(hd * 25, 1500);
    head.px = head.x - (hx / hd) * speed * dt;
    head.py = head.y - (hy / hd) * speed * dt;
  }
  world.step(dt);
  // Упал с уровня — вернуть на старт
  if (pot.y > 3000) {
    pot.x = 200; pot.y = 570; pot.px = pot.x; pot.py = pot.y;
    head.x = 200; head.y = 430; head.px = head.x; head.py = head.y;
  }
}

function render() {
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // Уровень
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const s of world.segments) {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }

  // Древко молотка
  ctx.strokeStyle = '#b88a5a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(pot.x, pot.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();

  // Котёл
  ctx.fillStyle = '#3a3a4a';
  ctx.beginPath();
  ctx.arc(pot.x, pot.y, pot.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Голова молотка
  ctx.fillStyle = '#a0a0a0';
  ctx.beginPath();
  ctx.arc(head.x, head.y, head.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Веди мышью / пальцем — молоток следует за курсором', 12, VIEW.height - 12);
}

resize();
requestAnimationFrame(loop);
