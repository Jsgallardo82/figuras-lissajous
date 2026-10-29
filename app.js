'use strict';

const $ = (id) => document.getElementById(id);

const DEFAULTS = {
  a: 3,
  b: 2,
  delta: 90,             // grados
  A: 1,
  B: 1,
  colorMode: 'gradiente', // 'gradiente' | 'solido'
  color: '#38bdf8',
  hue: 190,
  lineWidth: 2,
  bg: '#0b1020',
  glow: true,
  showGrid: false,
  phaseSpeed: 30,        // grados por segundo
  traceSeconds: 8,       // segundos para trazar la curva completa
};

const MAX_VUELTAS = 100; // límite de vueltas de t para curvas que no se cierran pronto
const STORAGE_KEY = 'figuras-lissajous:v1';

const state = { ...DEFAULTS, ...loadSaved() };
const anim = { phase: false, trace: false, progress: 1 };

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* sin almacenamiento */ }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmt = (v) => String(Number(v.toFixed(3)));
const gcd = (x, y) => (y ? gcd(y, x % y) : x);

// ---------------------------------------------------------------------------
// Matemáticas
// ---------------------------------------------------------------------------

/**
 * Cuántas vueltas (múltiplos de 2π) necesita t para que la curva se cierre.
 * Se cierra cuando a·t y b·t son a la vez múltiplos de 2π. Se trabaja con
 * 3 decimales: a = A'/1000, b = B'/1000.
 */
function cierre(a, b) {
  const p = Math.round(a * 1000);
  const q = Math.round(b * 1000);
  if (p === 0 || q === 0) return { vueltas: 1, razon: null, cerrada: true };
  const g = gcd(p, q);
  const vueltas = 1000 / gcd(1000, g);
  return {
    vueltas: Math.min(vueltas, MAX_VUELTAS),
    razon: [p / g, q / g],
    cerrada: vueltas <= MAX_VUELTAS,
  };
}

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------

/** Dibuja la figura en un contexto de `size` x `size` px. `progress` (0..1) recorta el trazo. */
function draw(ctx, size, s, opts = {}) {
  const k = size / 800; // escala grosores y textos al tamaño del lienzo
  const R = size * 0.42;
  const progress = opts.progress ?? 1;
  const { vueltas } = cierre(s.a, s.b);
  const tFin = 2 * Math.PI * vueltas * progress;
  const d = (s.delta * Math.PI) / 180;
  const px = (t) => s.A * R * Math.sin(s.a * t + d);
  const py = (t) => -s.B * R * Math.sin(s.b * t); // y hacia arriba

  // Pasos suficientes para que las curvas rápidas se vean suaves
  const pasos = Math.ceil(clamp((Math.abs(s.a) + Math.abs(s.b) + 1) * vueltas * progress * 400, 200, 300000));

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (opts.transparent) {
    ctx.clearRect(0, 0, size, size);
  } else {
    ctx.fillStyle = s.bg;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.translate(size / 2, size / 2);

  if (s.showGrid) {
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1 * k;
    ctx.strokeRect(-s.A * R, -s.B * R, 2 * s.A * R, 2 * s.B * R);
    ctx.beginPath();
    ctx.moveTo(-size / 2, 0); ctx.lineTo(size / 2, 0);
    ctx.moveTo(0, -size / 2); ctx.lineTo(0, size / 2);
    ctx.stroke();
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = s.lineWidth * k;
  if (s.glow) ctx.shadowBlur = 14 * k;

  // En degradado se traza por tramos, cada uno con su tono
  const tramos = s.colorMode === 'gradiente' ? Math.min(240, pasos) : 1;
  for (let j = 0; j < tramos; j++) {
    const i0 = Math.floor((j * pasos) / tramos);
    const i1 = Math.floor(((j + 1) * pasos) / tramos);
    const color = s.colorMode === 'gradiente'
      ? `hsl(${(s.hue + (300 * j) / tramos) % 360}, 90%, 62%)`
      : s.color;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.beginPath();
    for (let i = i0; i <= i1; i++) {
      const t = (tFin * i) / pasos;
      if (i === i0) ctx.moveTo(px(t), py(t)); else ctx.lineTo(px(t), py(t));
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Punto que recorre la curva y sus proyecciones (lo que "ven" los dos osciladores)
  if (opts.cursor) {
    const x = px(tFin), y = py(tFin);
    ctx.setLineDash([4 * k, 6 * k]);
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
    ctx.lineWidth = 1 * k;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x, -size / 2);
    ctx.moveTo(x, y); ctx.lineTo(-size / 2, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.arc(x, y, 6 * k, 0, 2 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(x, -size / 2 + 8 * k, 4 * k, 0, 2 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(-size / 2 + 8 * k, y, 4 * k, 0, 2 * Math.PI); ctx.fill();
  }
  ctx.restore();

  if (opts.label) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `600 ${22 * k}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`a = ${fmt(s.a)}   ·   b = ${fmt(s.b)}   ·   δ = ${fmt(s.delta)}°`, 24 * k, size - 22 * k);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Lienzo en pantalla
// ---------------------------------------------------------------------------

const canvas = $('lienzo');
const ctx = canvas.getContext('2d');
const stage = $('stage');

function resize() {
  const cs = getComputedStyle(stage);
  const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const css = Math.max(100, Math.floor(Math.min(w, h)));
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = canvas.style.height = `${css}px`;
  canvas.width = canvas.height = Math.round(css * dpr);
  requestRender();
}
new ResizeObserver(resize).observe(stage);

let pending = false;
function requestRender() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    draw(ctx, canvas.width, state, { progress: anim.progress, cursor: anim.trace });
    updateHud();
  });
}

function updateHud() {
  const c = cierre(state.a, state.b);
  const razon = c.razon ? `a:b = ${c.razon[0]}:${c.razon[1]}` : 'a:b = —';
  const extra = c.cerrada ? '' : ` · no se cierra (${MAX_VUELTAS} vueltas)`;
  $('hud').textContent = `${razon} · δ = ${fmt(state.delta)}°${extra}`;
}

// ---------------------------------------------------------------------------
// Controles
// ---------------------------------------------------------------------------

const pares = {
  a: { num: $('a-num'), range: $('a-range'), min: 0, max: 1000 },
  b: { num: $('b-num'), range: $('b-range'), min: 0, max: 1000 },
  delta: { num: $('d-num'), range: $('d-range'), min: -1e6, max: 1e6 },
};

/** Refleja el estado en los controles, sin tocar el que el usuario está escribiendo. */
function syncInputs() {
  const active = document.activeElement;
  const put = (el, v) => { if (el !== active) el.value = v; };

  for (const [key, p] of Object.entries(pares)) {
    put(p.num, fmt(state[key]));
    const v = key === 'delta' ? ((state.delta % 360) + 360) % 360 : state[key];
    put(p.range, clamp(v, +p.range.min, +p.range.max));
  }
  document.querySelectorAll('[data-key]').forEach((el) => {
    const v = state[el.dataset.key];
    if (el.type === 'checkbox') el.checked = v; else put(el, v);
  });
  $('row-color').hidden = state.colorMode !== 'solido';
  $('row-hue').hidden = state.colorMode === 'solido';

  document.querySelectorAll('.presets button').forEach((btn) => {
    btn.classList.toggle('active',
      +btn.dataset.a === state.a && +btn.dataset.b === state.b && +btn.dataset.dg === state.delta);
  });
}

function setParam(key, v) {
  if (!Number.isFinite(v)) return;
  const p = pares[key];
  state[key] = clamp(Math.round(v * 1e6) / 1e6, p.min, p.max);
  syncInputs();
  requestRender();
}

for (const [key, p] of Object.entries(pares)) {
  p.range.addEventListener('input', () => { setParam(key, +p.range.value); persist(); });
  // Escribir a mano: se aplica mientras escribes y se normaliza al salir del campo
  p.num.addEventListener('input', () => setParam(key, parseFloat(p.num.value)));
  p.num.addEventListener('change', () => { p.num.blur(); syncInputs(); persist(); });
}

document.querySelectorAll('[data-param]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.param;
    setParam(key, state[key] + parseFloat(btn.dataset.d));
    persist();
  });
});

document.querySelectorAll('[data-delta]').forEach((btn) => {
  btn.addEventListener('click', () => { setParam('delta', +btn.dataset.delta); persist(); });
});

document.querySelectorAll('.presets button').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.a = +btn.dataset.a;
    state.b = +btn.dataset.b;
    state.delta = +btn.dataset.dg;
    syncInputs();
    requestRender();
    persist();
  });
});

document.querySelectorAll('[data-key]').forEach((el) => {
  el.addEventListener('input', () => {
    const key = el.dataset.key;
    if (el.type === 'checkbox') state[key] = el.checked;
    else if (el.type === 'range' || el.type === 'number') state[key] = parseFloat(el.value);
    else state[key] = el.value;
    syncInputs();
    requestRender();
    persist();
  });
});

$('reset').addEventListener('click', () => {
  stopPhase();
  stopTrace();
  Object.assign(state, DEFAULTS);
  syncInputs();
  requestRender();
  persist();
});

// ---------------------------------------------------------------------------
// Animación: girar δ y trazar la curva poco a poco
// ---------------------------------------------------------------------------

let running = false;
let lastT = 0;
function tick(t) {
  if (!anim.phase && !anim.trace) { running = false; return; }
  const dt = lastT ? (t - lastT) / 1000 : 0;
  lastT = t;
  if (anim.phase) {
    state.delta = (state.delta + state.phaseSpeed * dt) % 360;
    syncInputs();
  }
  if (anim.trace) {
    anim.progress += dt / state.traceSeconds;
    if (anim.progress >= 1) anim.progress = 0; // vuelve a empezar
  }
  requestRender();
  requestAnimationFrame(tick);
}
function ensureLoop() {
  if (running) return;
  running = true;
  lastT = 0;
  requestAnimationFrame(tick);
}

function startPhase() { anim.phase = true; $('play-phase').innerHTML = '&#10073;&#10073; Pausar δ'; ensureLoop(); }
function stopPhase() { anim.phase = false; $('play-phase').innerHTML = '&#9654; Girar δ'; persist(); }
function startTrace() { anim.trace = true; anim.progress = 0; $('play-trace').innerHTML = '&#9632; Detener trazo'; ensureLoop(); }
function stopTrace() { anim.trace = false; anim.progress = 1; $('play-trace').innerHTML = '&#9654; Trazar'; requestRender(); }

const togglePhase = () => (anim.phase ? stopPhase() : startPhase());
const toggleTrace = () => (anim.trace ? stopTrace() : startTrace());
$('play-phase').addEventListener('click', togglePhase);
$('play-trace').addEventListener('click', toggleTrace);

// ---------------------------------------------------------------------------
// Guardar PNG (siempre la curva completa)
// ---------------------------------------------------------------------------

function guardar() {
  const size = +$('export-size').value;
  const off = document.createElement('canvas');
  off.width = off.height = size;
  draw(off.getContext('2d'), size, state, {
    label: $('export-label').checked,
    transparent: $('export-transparent').checked,
  });
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lissajous_a${fmt(state.a)}_b${fmt(state.b)}_d${fmt(state.delta)}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
}
$('save').addEventListener('click', guardar);

// ---------------------------------------------------------------------------
// Teclado
// ---------------------------------------------------------------------------

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea, button')) return;
  const paso = e.shiftKey ? 0.01 : 1;
  switch (e.key) {
    case ' ': e.preventDefault(); togglePhase(); break;
    case 't': case 'T': toggleTrace(); break;
    case 'ArrowRight': e.preventDefault(); setParam('a', state.a + paso); break;
    case 'ArrowLeft': e.preventDefault(); setParam('a', state.a - paso); break;
    case 'ArrowUp': e.preventDefault(); setParam('b', state.b + paso); break;
    case 'ArrowDown': e.preventDefault(); setParam('b', state.b - paso); break;
    case 's': case 'S': guardar(); break;
    default: return;
  }
  persist();
});

syncInputs();
resize();
