// Minimal PixiJS bootstrap with animated dark-street background

const state = {
  current: 'menu', // 'menu' | 'car-select'
  app: null,
  bg: {
    lanes: [],
    cars: [],
    police: [],
    lastSpawnAtMs: 0
  },
  sounds: {
    keyClick: null
  }
};

async function loadAudioBuffer(url) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = await audioContext.decodeAudioData(arrayBuffer);
  return { audioContext, buffer };
}

function playBuffer(ctx, buffer, volume = 0.5) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(gain).connect(ctx.destination);
  source.start(0);
}

function createGradientTexture(width, height, stops) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, height);
  for (const [offset, color] of stops) grd.addColorStop(offset, color);
  g.fillStyle = grd;
  g.fillRect(0, 0, width, height);
  return PIXI.Texture.from(canvas);
}

function createCarGraphics(color = 0xff4444) {
  const g = new PIXI.Graphics();
  g.roundRect(-18, -8, 36, 16, 4).fill(color).stroke({ width: 2, color: 0x000000, alpha: 0.6 });
  g.rect(-14, -10, 28, 6).fill(0x222a).stroke({ width: 0 });
  return g;
}

function createPoliceGraphics() {
  const g = new PIXI.Graphics();
  g.roundRect(-18, -8, 36, 16, 4).fill(0x111111).stroke({ width: 2, color: 0x000000, alpha: 0.6 });
  g.rect(-9, -7, 18, 6).fill(0xffffff);
  return g;
}

function setupPixi() {
  const app = new PIXI.Application();
  const container = document.getElementById('game-container');
  const width = container.clientWidth;
  const height = container.clientHeight;
  app.init({ background: '#000000', resizeTo: container, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2) }).then(() => {
    container.appendChild(app.canvas);

    // Road background
    const gradientTex = createGradientTexture(2, 512, [
      [0, '#000000'],
      [0.6, '#0b0b0b'],
      [1, '#000000']
    ]);
    const bg = new PIXI.TilingSprite({ texture: gradientTex, width: width, height: height });
    app.stage.addChild(bg);

    // Lane markers
    const lanesContainer = new PIXI.Container();
    app.stage.addChild(lanesContainer);
    const laneCount = 3;
    for (let i = 0; i <= laneCount; i++) {
      const x = (width / laneCount) * i;
      const line = new PIXI.Graphics();
      const alpha = i === 0 || i === laneCount ? 0.25 : 0.18;
      line.rect(-1, 0, 2, height).fill({ color: 0xffffff, alpha });
      line.x = x;
      lanesContainer.addChild(line);
      state.bg.lanes.push(line);
    }

    // Headlights bloom
    const bloom = new PIXI.Graphics();
    bloom.circle(width * 0.5, height * 0.9, Math.max(60, width * 0.2)).fill(0x00e5ff, 0.06);
    app.stage.addChild(bloom);

    state.app = app;
    app.ticker.add((tick) => update(tick));
  });
}

function spawnTraffic() {
  const { app } = state;
  if (!app) return;
  const width = app.renderer.width;
  const height = app.renderer.height;
  const laneCount = 3;
  const laneWidth = width / laneCount;
  const lane = Math.floor(Math.random() * laneCount);
  const x = (lane + 0.5) * laneWidth;
  const isPolice = Math.random() < 0.25;
  const sprite = isPolice ? createPoliceGraphics() : createCarGraphics(Math.random() < 0.5 ? 0xff3b3b : 0x3bf5ff);
  sprite.x = x;
  sprite.y = -20;
  sprite.alpha = 0.95;
  sprite.scale.set(1 + Math.random() * 0.2);
  app.stage.addChild(sprite);
  const obj = { g: sprite, v: 120 + Math.random() * 120, type: isPolice ? 'police' : 'car' };
  if (isPolice) state.bg.police.push(obj); else state.bg.cars.push(obj);
}

function update() {
  const { app } = state;
  if (!app) return;
  const now = performance.now();
  if (now - state.bg.lastSpawnAtMs > 600) {
    spawnTraffic();
    state.bg.lastSpawnAtMs = now;
  }
  // Move cars and police
  const height = app.renderer.height;
  const advance = (arr) => {
    for (let i = arr.length - 1; i >= 0; i--) {
      const o = arr[i];
      o.g.y += (o.v * app.ticker.deltaMS) / 1000;
      if (o.type === 'police') {
        const t = now / 200;
        const flash = (Math.sin(t * 6) + 1) * 0.5; // 0..1
        o.g.tint = flash > 0.5 ? 0x2244ff : 0xff2244;
      }
      if (o.g.y > height + 40) {
        app.stage.removeChild(o.g);
        arr.splice(i, 1);
      }
    }
  };
  advance(state.bg.cars);
  advance(state.bg.police);
}

function toCarSelect() {
  state.current = 'car-select';
  document.getElementById('ui').classList.add('hidden');
  document.getElementById('car-select').classList.remove('hidden');
}

function setupUI() {
  const startBtn = document.getElementById('start-btn');
  const backBtn = document.getElementById('back-to-menu');
  startBtn.addEventListener('click', async () => {
    try {
      if (!state.sounds.keyClick) {
        state.sounds.keyClick = await loadAudioBuffer('https://cdn.jsdelivr.net/gh/naptha/tiny-sfx@latest/click1.wav');
      }
      playBuffer(state.sounds.keyClick.audioContext, state.sounds.keyClick.buffer, 0.35);
    } catch {}
    toCarSelect();
  });
  backBtn.addEventListener('click', () => {
    state.current = 'menu';
    document.getElementById('car-select').classList.add('hidden');
    document.getElementById('ui').classList.remove('hidden');
  });
}

const REAL_CARS = [
  {
    id: 'supra-a40',
    make: 'Toyota',
    model: 'Supra A40',
    year: 1978,
    color: '#ff6b6b',
    specs: {
      engine: '2.6L inline-6 (4M-E)',
      power: '110–125 hp',
      torque: '172–187 Nm',
      weight: '≈1,250 kg',
      drive: 'RWD',
      gearbox: '5MT / 4AT',
      topSpeed: '≈180 km/h',
      zeroTo100: '≈10.5 s'
    }
  },
  {
    id: 'mustang-64',
    make: 'Ford',
    model: 'Mustang I',
    year: 1964,
    color: '#5ec8ff',
    specs: {
      engine: '2.8–4.7L I6/V8',
      power: '101–271 hp',
      torque: '216–423 Nm',
      weight: '≈1,100–1,300 kg',
      drive: 'RWD',
      gearbox: '3MT/4MT/3AT',
      topSpeed: '≈190–220 km/h',
      zeroTo100: '≈7.0–12.5 s'
    }
  },
  {
    id: 'impala-67',
    make: 'Chevrolet',
    model: 'Impala',
    year: 1967,
    color: '#b389ff',
    specs: {
      engine: '4.1–7.0L I6/V8',
      power: '155–385 hp',
      torque: '319–624 Nm',
      weight: '≈1,700–1,900 kg',
      drive: 'RWD',
      gearbox: '3MT/4MT/3AT/4AT',
      topSpeed: '≈190–230 km/h',
      zeroTo100: '≈7.5–12.0 s'
    }
  }
];

function renderCarCards() {
  const container = document.getElementById('car-cards');
  container.innerHTML = '';
  for (const car of REAL_CARS) {
    const card = document.createElement('div');
    card.className = 'card';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = `${car.make} ${car.model} • ${car.year}`;
    const preview = document.createElement('div');
    preview.style.height = '120px';
    preview.style.display = 'grid';
    preview.style.placeItems = 'center';
    // preview car graphic
    const canvas = document.createElement('canvas');
    canvas.width = 240; canvas.height = 120;
    const app = new PIXI.Application();
    app.init({ backgroundAlpha: 0, resizeTo: canvas, width: 240, height: 120 }).then(() => {
      const g = createCarGraphics(PIXI.utils.string2hex(car.color));
      g.x = 120; g.y = 60; g.scale.set(1.6);
      app.stage.addChild(g);
      preview.appendChild(app.canvas);
    });

    const specs = document.createElement('div');
    specs.className = 'specs';
    const entries = Object.entries(car.specs);
    for (const [k, v] of entries) {
      const key = document.createElement('div');
      key.className = 'k';
      key.textContent = k;
      const val = document.createElement('div');
      val.textContent = v;
      specs.appendChild(key);
      specs.appendChild(val);
    }
    const choose = document.createElement('button');
    choose.className = 'btn primary choose';
    choose.textContent = 'Выбрать';
    choose.addEventListener('click', () => {
      alert(`Вы выбрали: ${car.make} ${car.model} ${car.year}`);
    });

    card.appendChild(title);
    card.appendChild(preview);
    card.appendChild(specs);
    card.appendChild(choose);
    container.appendChild(card);
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  setupPixi();
  setupUI();
  renderCarCards();
});

