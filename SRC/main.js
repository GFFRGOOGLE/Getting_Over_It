// src/main.js — точка входа игры

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Логический размер «мира» в пикселях. Дальше камера будет двигаться по нему,
// а canvas растягивается под экран. Пока просто задаём базу.
const VIEW = { width: 0, height: 0, dpr: 1 };

/**
 * Подгоняем canvas под размер окна с учётом devicePixelRatio.
 * Это нужно, чтобы на телефонах и Retina-мониторах картинка не была мыльной.
 */
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // выше 2 смысла нет
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  // Рисуем в «логических» пикселях
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  VIEW.width = w;
  VIEW.height = h;
  VIEW.dpr = dpr;
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

/**
 * Игровой цикл. Пока просто заглушка: очищаем и пишем текст.
 * Физику будем вызывать отсюда с фиксированным шагом (60 Гц) на шаге 2.
 */
let lastTime = performance.now();

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05); // защита от «скачков» после сворачивания таба
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

function update(dt) {
  // TODO шаг 2: физика (Verlet + constraints)
  // TODO шаг 3: управление (pointer/touch)
}

function render() {
  // Фон
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Заглушка
  ctx.fillStyle = '#eee';
  ctx.font = '20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Каркас готов', VIEW.width / 2, VIEW.height / 2);

  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText(`${Math.round(VIEW.width)} × ${Math.round(VIEW.height)} @${VIEW.dpr}x`, VIEW.width / 2, VIEW.height / 2 + 32);
}

// --- старт ---
resize();
requestAnimationFrame(loop);
