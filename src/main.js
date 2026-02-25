const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });

const controls = document.getElementById('controls');
const sizeInput = document.getElementById('size');
const densityInput = document.getElementById('density');
const tickInput = document.getElementById('tick');
const initBtn = document.getElementById('init');
const toggleBtn = document.getElementById('toggle');
const stepBtn = document.getElementById('step');
const info = document.getElementById('info');
const gridInput = document.getElementById('grid');

let size = 0;
let total = 0;
let current = new Uint8Array(0);
let next = new Uint8Array(0);
let displaySize = 0;
let renderImg = null;
let renderBuf32 = null;
let xCell = null;
let yCell = null;
let xLine = null;
let yLine = null;
const COLOR_ALIVE = 0xFF000000;
const COLOR_DEAD = 0xFFFFFFFF;
const COLOR_GRID = 0xFFE0E0E0;

let showGrid = gridInput.checked;
let running = false;
let generation = 0;
let aliveCount = 0;
let baselineAlivePercent = 0;
let tickMs = 100;
let acc = 0;
let lastTime = 0;
let ticksPerSec = 0;
let tickCounter = 0;
let lastRateTime = 0;

function clampInt(value, min, max) {
  let v = parseInt(value, 10);
  if (!Number.isFinite(v)) v = min;
  if (v < min) v = min;
  if (max != null && v > max) v = max;
  return v;
}

function rebuildMapping() {
  if (size <= 0 || displaySize <= 0) return;
  const scale = displaySize / size;

  if (!xCell || xCell.length !== displaySize) {
    xCell = new Uint16Array(displaySize);
    yCell = new Uint16Array(displaySize);
    xLine = new Uint8Array(displaySize);
    yLine = new Uint8Array(displaySize);
  }

  let prev = -1;
  for (let x = 0; x < displaySize; x++) {
    const cell = Math.floor(x / scale);
    xCell[x] = cell;
    xLine[x] = x > 0 && cell !== prev ? 1 : 0;
    prev = cell;
  }

  prev = -1;
  for (let y = 0; y < displaySize; y++) {
    const cell = Math.floor(y / scale);
    yCell[y] = cell;
    yLine[y] = y > 0 && cell !== prev ? 1 : 0;
    prev = cell;
  }
}

function resizeCanvasDisplay() {
  const available = Math.max(1, Math.floor(window.innerHeight - controls.offsetHeight));
  if (available !== displaySize) {
    displaySize = available;
    canvas.width = displaySize;
    canvas.height = displaySize;
    canvas.style.width = displaySize + 'px';
    canvas.style.height = displaySize + 'px';
    ctx.imageSmoothingEnabled = false;
    renderImg = ctx.createImageData(displaySize, displaySize);
    renderBuf32 = new Uint32Array(renderImg.data.buffer);
  } else {
    canvas.style.width = displaySize + 'px';
    canvas.style.height = displaySize + 'px';
  }
  rebuildMapping();
}

function readParams() {
  const newSize = clampInt(sizeInput.value, 5, 2000);
  const density = clampInt(densityInput.value, 0, 100);
  const newTick = clampInt(tickInput.value, 1, 10000);
  sizeInput.value = newSize;
  densityInput.value = density;
  tickInput.value = newTick;
  return { newSize, density, newTick };
}

function initGrid() {
  const { newSize, density, newTick } = readParams();
  tickMs = newTick;

  if (newSize !== size) {
    size = newSize;
    total = size * size;
    current = new Uint8Array(total);
    next = new Uint8Array(total);
  } else {
    current.fill(0);
    next.fill(0);
  }

  const aliveChance = density / 100;
  for (let i = 0; i < total; i++) {
    current[i] = Math.random() < aliveChance ? 1 : 0;
  }
  let alive = 0;
  for (let i = 0; i < total; i++) {
    alive += current[i];
  }
  aliveCount = alive;
  baselineAlivePercent = total > 0 ? (aliveCount / total) * 100 : 0;

  generation = 0;
  acc = 0;
  ticksPerSec = 0;
  tickCounter = 0;
  lastTime = performance.now();
  lastRateTime = lastTime;

  resizeCanvasDisplay();
  render();
  updateInfo();
}

function step() {
  const n = size;
  const cur = current;
  const nxt = next;
  let alive = 0;

  for (let y = 0; y < n; y++) {
    const ym1 = y === 0 ? n - 1 : y - 1;
    const yp1 = y === n - 1 ? 0 : y + 1;
    const row = y * n;
    const rowm1 = ym1 * n;
    const rowp1 = yp1 * n;

    for (let x = 0; x < n; x++) {
      const xm1 = x === 0 ? n - 1 : x - 1;
      const xp1 = x === n - 1 ? 0 : x + 1;
      const i = row + x;

      const neighbors =
        cur[rowm1 + xm1] + cur[rowm1 + x] + cur[rowm1 + xp1] +
        cur[row + xm1] + cur[row + xp1] +
        cur[rowp1 + xm1] + cur[rowp1 + x] + cur[rowp1 + xp1];

      const wasAlive = cur[i];
      const nextAlive = wasAlive ? (neighbors === 2 || neighbors === 3 ? 1 : 0) : (neighbors === 3 ? 1 : 0);
      nxt[i] = nextAlive;
      alive += nextAlive;
    }
  }

  // Double buffer swap (synchronous tick).
  current = nxt;
  next = cur;
  generation++;
  aliveCount = alive;
  tickCounter++;
}

function render() {
  if (!renderImg || !renderBuf32 || !xCell || !yCell || !xLine || !yLine) return;
  const cur = current;
  const n = size;
  const w = displaySize;
  const buf = renderBuf32;
  const drawGrid = showGrid;

  for (let y = 0; y < w; y++) {
    const rowStart = y * w;
    const rowOffset = yCell[y] * n;
    const yHasLine = yLine[y] === 1;
    for (let x = 0; x < w; x++) {
      const idx = rowStart + x;
      if (drawGrid && (yHasLine || xLine[x] === 1)) {
        buf[idx] = COLOR_GRID;
      } else {
        const alive = cur[rowOffset + xCell[x]];
        buf[idx] = alive ? COLOR_ALIVE : COLOR_DEAD;
      }
    }
  }

  ctx.putImageData(renderImg, 0, 0);
}

function updateInfo() {
  const alivePercent = total > 0 ? (aliveCount / total) * 100 : 0;
  const delta = alivePercent - baselineAlivePercent;
  const deltaText = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
  info.textContent = `Gen: ${generation} | Lebendanteil: ${alivePercent.toFixed(1)}% (Delta ${deltaText})`;
}

function loop(time) {
  if (!running) return;

  const delta = time - lastTime;
  lastTime = time;
  acc += delta;

  let stepped = false;
  while (acc >= tickMs) {
    step();
    acc -= tickMs;
    stepped = true;
  }

  if (stepped) {
    render();
    updateInfo();
  }

  if (time - lastRateTime >= 1000) {
    ticksPerSec = tickCounter;
    tickCounter = 0;
    lastRateTime = time;
    updateInfo();
  }

  requestAnimationFrame(loop);
}

initBtn.addEventListener('click', () => {
  initGrid();
});

toggleBtn.addEventListener('click', () => {
  if (!running) {
    tickMs = clampInt(tickInput.value, 1, 10000);
    tickInput.value = tickMs;
    running = true;
    acc = 0;
    lastTime = performance.now();
    lastRateTime = lastTime;
    tickCounter = 0;
    toggleBtn.textContent = 'Pause';
    requestAnimationFrame(loop);
  } else {
    running = false;
    toggleBtn.textContent = 'Start';
    ticksPerSec = 0;
    updateInfo();
  }
});

gridInput.addEventListener('change', () => {
  showGrid = gridInput.checked;
  render();
});

stepBtn.addEventListener('click', () => {
  step();
  render();
  if (!running) ticksPerSec = 0;
  updateInfo();
});

window.addEventListener('resize', () => {
  resizeCanvasDisplay();
  render();
});

initGrid();
