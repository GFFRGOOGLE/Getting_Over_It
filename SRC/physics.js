// src/physics.js
const DAMPING = 0.998;

export class Particle {
  constructor(x, y, radius = 0, invMass = 1) {
    this.x = x;   this.y = y;
    this.px = x;  this.py = y;
    this.radius = radius;
    this.invMass = invMass;
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
    const C = d - this.restLength;
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
    this.friction = friction;
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
  
  let nx = 0, ny = 0;
  if (d < 1e-9) {
    nx = -(seg.y2 - seg.y1);
    ny = (seg.x2 - seg.x1);
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl; ny /= nl;
  } else {
    nx = dx / d;
    ny = dy / d;
  }
  
  // Защита от проваливания под горизонтальный пол
  if (seg.y1 === seg.y2 && p.y > seg.y1) {
    ny = -1; nx = 0; d = p.y - seg.y1;
  }
  
  const push = r - d;
  if (push <= 0) return false;
  
  p.x += nx * push;
  p.y += ny * push;
  
  const vx = p.x - p.px;
  const vy = p.y - p.py;
  const vn = vx * nx + vy * ny;
  const tvx = vx - nx * vn;
  const tvy = vy - ny * vn;
  
  p.px = p.x - (nx * vn + tvx * (1 - seg.friction));
  p.py = p.y - (ny * vn + tvy * (1 - seg.friction));
  return true;
}

export class World {
  constructor() {
    this.particles = [];
    this.constraints = [];
    this.segments = [];
    this.gravity = { x: 0, y: 2000 };
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