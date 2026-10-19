// src/physics.js
// Лёгкий Verlet-движок для 2D-клонов Getting Over It.

const DAMPING = 0.998; // сопротивление воздуха

export class Particle {
  constructor(x, y, radius = 0, invMass = 1) {
    this.x = x;   this.y = y;
    this.px = x;  this.py = y; // предыдущая позиция (для Verlet)
    this.radius = radius;
    this.invMass = invMass;    // 0 = закреплённая
  }

  integrate(dt, gx, gy) {
    if (this.invMass === 0) return;
    const vx = (this.x - this.px) * DAMPING;
    const vy = (this.y - this.py) * DAMPING;
    this.px = this.x;
    this.py = this.y;
    this.x += vx + gx * dt * dt;
    this.y += vy + gy * dt * dt;
  }

  get vx() { return this.x - this.px; }
  get vy() { return this.y - this.py; }
}

export class DistanceConstraint {
  constructor(a, b, restLength) {
    this.a = a; this.b = b;
    this.restLength = restLength;
  }
  solve() {
    const { a, b } = this;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-9) return;
    const w = a.invMass + b.invMass;
    if (w === 0) return;
    const nx = dx / d;
    const ny = dy / d;
    const C = d - this.restLength; // >0 — растянута, <0 — сжата
    const ka = (a.invMass / w) * C;
    const kb = (b.invMass / w) * C;
    a.x += nx * ka;
    a.y += ny * ka;
    b.x -= nx * kb;
    b.y -= ny * kb;
  }
}

export class Segment {
  constructor(x1, y1, x2, y2, friction = 0.9) {
    this.x1 = x1; this.y1 = y1;
    this.x2 = x2; this.y2 = y2;
    this.friction = friction; // 0=лёд, 1=прилипание
  }
}

function closestPointOnSegment(seg, px, py) {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { x: seg.x1, y: seg.y1 };
  let t = ((px - seg.x1) * dx + (py - seg.y1) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { x: seg.x1 + dx * t, y: seg.y1 + dy * t };
}

function resolveCircleSegment(p, seg) {
  const c = closestPointOnSegment(seg, p.x, p.y);
  let dx = p.x - c.x;
  let dy = p.y - c.y;
  let d = Math.hypot(dx, dy);
  const r = p.radius;
  if (d >= r) return false;
  if (d < 1e-9) {
    // Центр ровно на отрезке — берём нормаль к нему
    const nx = -(seg.y2 - seg.y1);
    const ny = (seg.x2 - seg.x1);
    const nl = Math.hypot(nx, ny) || 1;
    dx = nx / nl; dy = ny / nl;
  } else {
    dx /= d; dy /= d;
  }
  const push = r - d;
  const vx = p.x - p.px;
  const vy = p.y - p.py;
  p.x += dx * push;
  p.y += dy * push;
  // Убиваем нормальную скорость, к тангенциальной применяем трение
  const vn = vx * dx + vy * dy;
  const tvx = (vx - dx * vn) * seg.friction;
  const tvy = (vy - dy * vn) * seg.friction;
  p.px = p.x - tvx;
  p.py = p.y - tvy;
  return true;
}

export class World {
  constructor() {
    this.particles = [];
    this.constraints = [];
    this.segments = [];
    this.gravity = { x: 0, y: 1800 }; // px/s²
  }
  addParticle(p) { this.particles.push(p); return p; }
  addConstraint(c) { this.constraints.push(c); return c; }
  addSegment(s) { this.segments.push(s); return s; }

  step(dt, iterations = 8) {
    for (const p of this.particles) p.integrate(dt, this.gravity.x, this.gravity.y);
    for (let i = 0; i < iterations; i++) {
      for (const c of this.constraints) c.solve();
      for (const p of this.particles) {
        if (p.invMass === 0) continue;
        for (const s of this.segments) resolveCircleSegment(p, s);
      }
    }
  }
  }
