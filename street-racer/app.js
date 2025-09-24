// Minimal PixiJS bootstrap with animated dark-street background

const CONFIG = {
  // Put your final Yandex URL here (e.g., https://<bucket>.website.yandexcloud.net or https://storage.yandexcloud.net/<bucket>/)
  startUrl: 'https://street-racer-app.website.yandexcloud.net'
};

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
    keyClick: null,
    volume: 0.7
  },
  selected: {
    car: null,
    sprite: null,
    glow: null,
    baseY: 0
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
  const vol = Math.max(0, Math.min(1, (state.sounds.volume ?? 0.7) * volume));
  gain.gain.value = vol;
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
  g.beginFill(color, 1);
  g.drawRoundedRect(-18, -8, 36, 16, 4);
  g.endFill();
  g.lineStyle(2, 0x000000, 0.6);
  g.moveTo(-18, -8); g.lineTo(18, -8); g.lineTo(18, 8); g.lineTo(-18, 8); g.lineTo(-18, -8);
  g.lineStyle(0, 0, 0);
  g.beginFill(0x222222, 0.65);
  g.drawRect(-14, -10, 28, 6);
  g.endFill();
  return g;
}

function createPoliceGraphics() {
  const g = new PIXI.Graphics();
  g.beginFill(0x111111, 1);
  g.drawRoundedRect(-18, -8, 36, 16, 4);
  g.endFill();
  g.lineStyle(2, 0x000000, 0.6);
  g.moveTo(-18, -8); g.lineTo(18, -8); g.lineTo(18, 8); g.lineTo(-18, 8); g.lineTo(-18, -8);
  g.lineStyle(0, 0, 0);
  g.beginFill(0xffffff, 1);
  g.drawRect(-9, -7, 18, 6);
  g.endFill();
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
    const bg = new PIXI.Sprite(gradientTex);
    bg.width = app.renderer.width;
    bg.height = app.renderer.height;
    app.stage.addChild(bg);

    // Lane markers
    const lanesContainer = new PIXI.Container();
    app.stage.addChild(lanesContainer);
    const laneCount = 3;
    for (let i = 0; i <= laneCount; i++) {
      const x = (width / laneCount) * i;
      const line = new PIXI.Graphics();
      const alpha = i === 0 || i === laneCount ? 0.25 : 0.18;
      line.beginFill(0xffffff, alpha);
      line.drawRect(-1, 0, 2, height);
      line.endFill();
      line.x = x;
      lanesContainer.addChild(line);
      state.bg.lanes.push(line);
    }

    // Headlights bloom
    const bloom = new PIXI.Graphics();
    bloom.circle(width * 0.5, height * 0.9, Math.max(60, width * 0.2)).fill(0x00e5ff, 0.06);
    app.stage.addChild(bloom);

    state.app = app;
    app.ticker.add(() => update());
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
      const delta = app.ticker?.deltaMS || 16.7;
      o.g.y += (o.v * delta) / 1000;
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
  // Idle bobbing for selected car sprite if present
  if (state.selected.sprite) {
    const t = now / 1000;
    state.selected.sprite.y = state.selected.baseY + Math.sin(t * 2.0) * 4;
    if (state.selected.glow) state.selected.glow.y = state.selected.sprite.y + 14;
  }
}

function toCarSelect() {
  state.current = 'car-select';
  document.getElementById('ui').classList.add('hidden');
  document.getElementById('car-select').classList.remove('hidden');
}

function setupUI() {
  const startBtn = document.getElementById('start-btn');
  const backBtn = document.getElementById('back-to-menu');
  const hamburger = document.getElementById('hamburger');
  const settings = document.getElementById('settings');
  const settingsClose = document.getElementById('settings-close');
  const volumeRange = document.getElementById('volume');
  const langSelect = document.getElementById('lang');
  startBtn.addEventListener('click', async () => {
    try {
      if (!state.sounds.keyClick) {
        state.sounds.keyClick = await loadAudioBuffer('https://cdn.jsdelivr.net/gh/naptha/tiny-sfx@latest/click1.wav');
      }
      playBuffer(state.sounds.keyClick.audioContext, state.sounds.keyClick.buffer, 0.5);
    } catch {}
    toCarSelect();
  });
  backBtn.addEventListener('click', () => {
    state.current = 'menu';
    document.getElementById('car-select').classList.add('hidden');
    document.getElementById('ui').classList.remove('hidden');
  });

  // Settings modal events
  hamburger?.addEventListener('click', () => settings?.classList.remove('hidden'));
  settingsClose?.addEventListener('click', () => settings?.classList.add('hidden'));
  // Volume
  const savedV = Number(localStorage.getItem('volume') || '70');
  if (!Number.isNaN(savedV)) {
    state.sounds.volume = Math.max(0, Math.min(1, savedV / 100));
    if (volumeRange) volumeRange.value = String(savedV);
  }
  volumeRange?.addEventListener('input', (e) => {
    const v = Number(e.target.value);
    state.sounds.volume = Math.max(0, Math.min(1, v / 100));
    localStorage.setItem('volume', String(v));
  });
  // Language
  const savedLang = localStorage.getItem('lang') || 'ru';
  if (langSelect) langSelect.value = savedLang;
  applyI18n(savedLang);
  langSelect?.addEventListener('change', () => {
    localStorage.setItem('lang', langSelect.value);
    applyI18n(langSelect.value);
  });
}

const REAL_CARS = [
  {
    id: 'supra-a40',
    make: 'Toyota',
    model: 'Supra A40',
    year: 1978,
    color: '#ff6b6b',
    photo: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Toyota_Celica_Supra_Mark_I_in_Bangkok.jpg',
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
    photo: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/1964_Ford_Mustang_coupe.jpg',
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
    photo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Chevrolet_Impala_Sport_Sedan_1967.jpg',
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
    // Lightweight inline SVG preview (no nested Pixi)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '240');
    svg.setAttribute('height', '120');
    svg.setAttribute('viewBox', '0 0 240 120');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '90');
    rect.setAttribute('y', '52');
    rect.setAttribute('rx', '8');
    rect.setAttribute('ry', '8');
    rect.setAttribute('width', '60');
    rect.setAttribute('height', '16');
    rect.setAttribute('fill', car.color);
    rect.setAttribute('stroke', '#000');
    rect.setAttribute('stroke-opacity', '0.6');
    const roof = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    roof.setAttribute('x', '96');
    roof.setAttribute('y', '46');
    roof.setAttribute('width', '48');
    roof.setAttribute('height', '8');
    roof.setAttribute('fill', '#222');
    roof.setAttribute('fill-opacity', '0.65');
    svg.appendChild(rect);
    svg.appendChild(roof);
    preview.appendChild(svg);

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
    choose.setAttribute('data-i18n','choose');
    choose.textContent = t('choose');
    choose.addEventListener('click', () => {
      openInspect(car);
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
  try {
    if (typeof PIXI !== 'undefined') {
      setupPixi();
    } else {
      console.warn('PIXI is not available. Background will be disabled.');
    }
  } catch (e) {
    console.error('Failed to init PIXI', e);
  }
  setupUI();
  renderCarCards();
  // Wire main-menu buttons
  document.getElementById('menu-cars')?.addEventListener('click', () => alert('Список машин (в разработке)'));
  document.getElementById('menu-store')?.addEventListener('click', () => alert('Магазин скоро будет доступен'));
  document.getElementById('menu-start')?.addEventListener('click', () => {
    if (CONFIG.startUrl && /^https?:\/\//.test(CONFIG.startUrl)) {
      location.href = CONFIG.startUrl;
    } else {
      alert('Ссылка недоступна. Укажите корректный Yandex URL в CONFIG.startUrl');
    }
  });
});

// i18n
const I18N = {
  ru: { title: 'Street Racer', start: 'Начать заезд', back: 'Назад', settings: 'Настройки', language: 'Язык', volume: 'Громкость', close: 'Закрыть', carSelectTitle: 'Выбор машины', carSelectSubtitle: 'Фон чёрный, выберите автомобиль:', choose: 'Выбрать', inspectTitle: 'Осмотр автомобиля', color: 'Цвет', name: 'Имя персонажа', next: 'Далее', league: 'Гоночная лига (обязательно)', emblem: 'Эмблема' },
  en: { title: 'Street Racer', start: 'Start Race', back: 'Back', settings: 'Settings', language: 'Language', volume: 'Volume', close: 'Close', carSelectTitle: 'Car Selection', carSelectSubtitle: 'Black background, choose a car:', choose: 'Choose', inspectTitle: 'Car Inspection', color: 'Color', name: 'Character Name', next: 'Next', league: 'Racing League (required)', emblem: 'Emblem' },
  fr: { title: 'Street Racer', start: 'Commencer', back: 'Retour', settings: 'Paramètres', language: 'Langue', volume: 'Volume', close: 'Fermer', carSelectTitle: 'Sélection de voiture', carSelectSubtitle: 'Fond noir, choisissez une voiture:', choose: 'Choisir', inspectTitle: 'Inspection de voiture', color: 'Couleur', name: 'Nom du personnage', next: 'Suivant', league: 'Ligue de course (obligatoire)', emblem: 'Emblème' },
  de: { title: 'Street Racer', start: 'Rennen starten', back: 'Zurück', settings: 'Einstellungen', language: 'Sprache', volume: 'Lautstärke', close: 'Schließen', carSelectTitle: 'Fahrzeugauswahl', carSelectSubtitle: 'Schwarzer Hintergrund, wählen Sie ein Auto:', choose: 'Wählen', inspectTitle: 'Fahrzeuginspektion', color: 'Farbe', name: 'Charaktername', next: 'Weiter', league: 'Rennliga (erforderlich)', emblem: 'Emblem' },
  es: { title: 'Street Racer', start: 'Iniciar carrera', back: 'Atrás', settings: 'Configuración', language: 'Idioma', volume: 'Volumen', close: 'Cerrar', carSelectTitle: 'Selección de coche', carSelectSubtitle: 'Fondo negro, elige un coche:', choose: 'Elegir', inspectTitle: 'Inspección del coche', color: 'Color', name: 'Nombre del personaje', next: 'Siguiente', league: 'Liga de carreras (obligatorio)', emblem: 'Emblema' }
};
let currentLang = 'ru';
function t(key){
  return (I18N[currentLang] && I18N[currentLang][key]) || key;
}
function applyI18n(lang){
  currentLang = lang in I18N ? lang : 'ru';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    el.textContent = t(key);
  });
}

// 3D inspect
function openInspect(car){
  document.getElementById('car-select').classList.add('hidden');
  const inspect = document.getElementById('inspect');
  inspect.classList.remove('hidden');
  setupLeaguesAndEmblems();
  try { initThree(car); } catch (e) { console.error(e); }
  const nameInput = document.getElementById('player-name');
  const leaguesRoot = document.getElementById('league-options');
  const emblemsRoot = document.getElementById('emblem-options');
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) nextBtn.disabled = true;
  nameInput?.addEventListener('input', () => {
    const leagueSelected = document.querySelector('.league-card.selected');
    const emblemSelected = document.querySelector('.emblem.selected');
    validateInspectForm(!!leagueSelected, !!emblemSelected);
  });
  // Wire Next to navigate to new main menu
  if (nextBtn) nextBtn.onclick = () => {
    const name = document.getElementById('player-name')?.value?.trim();
    const leagueSelected = document.querySelector('.league-card.selected');
    if (!name || !leagueSelected) return;
    // Remember chosen car
    state.selected.car = car;
    // Add selected car to background
    try { addSelectedCarSprite(); } catch(e) { console.error(e); }
    document.getElementById('inspect').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    // Allow direct open via URL parameter
    const url = new URL(location.href);
    url.searchParams.set('screen','main');
    history.replaceState({}, '', url);
  };
}
function addSelectedCarSprite(){
  if (!state.app || !state.selected.car) return;
  const app = state.app;
  // cleanup old
  if (state.selected.sprite) { app.stage.removeChild(state.selected.sprite); state.selected.sprite = null; }
  if (state.selected.glow) { app.stage.removeChild(state.selected.glow); state.selected.glow = null; }
  // Create glow ellipse
  const glow = new PIXI.Graphics();
  const w = Math.max(120, app.renderer.width * 0.25);
  glow.ellipse(0, 0, w * 0.45, 16).fill(0x00e5ff, 0.08);
  glow.x = app.renderer.width * 0.5;
  glow.y = app.renderer.height - 70;
  app.stage.addChild(glow);
  // Create simple car silhouette
  const g = new PIXI.Graphics();
  const color = PIXI.utils.string2hex(state.selected.car.color || '#ffffff');
  g.beginFill(color, 0.95);
  g.drawRoundedRect(-36, -16, 72, 32, 8);
  g.endFill();
  g.beginFill(0x222222, 0.8);
  g.drawRect(-26, -24, 52, 10);
  g.endFill();
  g.x = glow.x;
  const baseY = glow.y - 14;
  g.y = baseY;
  g.scale.set(1.6);
  app.stage.addChild(g);
  state.selected.sprite = g;
  state.selected.glow = glow;
  state.selected.baseY = baseY;
}

let three = { scene: null, renderer: null, camera: null, controls: null, mesh: null };
function initThree(car){
  if (typeof THREE === 'undefined') {
    alert('3D is unavailable on this device/browser');
    return;
  }
  const container = document.getElementById('inspect-viewport');
  container.innerHTML = '';
  // If we have a photo, render it prominently
  if (car.photo) {
    const wrap = document.createElement('div');
    wrap.className = 'photo-wrap';
    const img = document.createElement('img');
    img.className = 'car-photo';
    img.alt = `${car.make} ${car.model}`;
    img.src = car.photo;
    wrap.appendChild(img);
    container.appendChild(wrap);
    // Also prepare optional tint overlay for color feel
    const tint = document.createElement('div');
    tint.className = 'photo-tint';
    tint.style.background = car.color;
    wrap.appendChild(tint);
    // Hook smooth color change to photo tint instead of mesh
    three._photoTint = tint;
  }
  const width = container.clientWidth || 600;
  const height = container.clientHeight || 400;
  // Only build WebGL canvas if we still want the 3D model visible alongside photo
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 100);
  camera.position.set(3, 2, 4);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.0);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 5, 5);
  scene.add(dir);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0.5, 0);

  // Always-create procedural car model (body + cabin + wheels)
  const bodyColor = new THREE.Color(car.color);
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.4, roughness: 0.5 });
  const bodyGeo = new THREE.BoxGeometry(2.2, 0.6, 1.0);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.6;
  scene.add(body);

  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.2, roughness: 0.7 });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 0.9), cabinMat);
  cabin.position.set(0, 1.0, 0);
  scene.add(cabin);

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.4 });
  const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.2, 22);
  const w1 = new THREE.Mesh(wheelGeo, wheelMat);
  const w2 = new THREE.Mesh(wheelGeo, wheelMat);
  const w3 = new THREE.Mesh(wheelGeo, wheelMat);
  const w4 = new THREE.Mesh(wheelGeo, wheelMat);
  [w1,w2,w3,w4].forEach(w=>{ w.rotation.z = Math.PI/2; w.castShadow = true; w.receiveShadow = true; scene.add(w); });
  w1.position.set(-0.9, 0.4,  0.5);
  w2.position.set( 0.9, 0.4,  0.5);
  w3.position.set(-0.9, 0.4, -0.5);
  w4.position.set( 0.9, 0.4, -0.5);

  three.mesh = body;

  // Smooth color transition helper
  three._colorLerp = {
    from: body.material.color.clone(),
    to: body.material.color.clone(),
    t: 1,
    durMs: 2500,
    startMs: performance.now()
  };

  const ground = new THREE.Mesh(new THREE.CircleGeometry(5, 64), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 }));
  ground.rotation.x = -Math.PI/2;
  scene.add(ground);

  three = { scene, renderer, camera, controls, mesh: body };

  const animate = () => {
    controls.update();
    // animate color
    if (three._photoTint) {
      // Blend photo tint
      const now = performance.now();
      const elapsed = now - three._colorLerp.startMs;
      const k = Math.min(1, elapsed / three._colorLerp.durMs);
      const r = THREE.MathUtils.lerp(three._colorLerp.from.r, three._colorLerp.to.r, k);
      const g = THREE.MathUtils.lerp(three._colorLerp.from.g, three._colorLerp.to.g, k);
      const b = THREE.MathUtils.lerp(three._colorLerp.from.b, three._colorLerp.to.b, k);
      const hex = `#${new THREE.Color(r, g, b).getHexString()}`;
      three._photoTint.style.background = hex;
    } else if (three._colorLerp && three.mesh && three.mesh.material) {
      const now = performance.now();
      const elapsed = now - three._colorLerp.startMs;
      const k = Math.min(1, elapsed / three._colorLerp.durMs);
      three.mesh.material.color.r = THREE.MathUtils.lerp(three._colorLerp.from.r, three._colorLerp.to.r, k);
      three.mesh.material.color.g = THREE.MathUtils.lerp(three._colorLerp.from.g, three._colorLerp.to.g, k);
      three.mesh.material.color.b = THREE.MathUtils.lerp(three._colorLerp.from.b, three._colorLerp.to.b, k);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  animate();

  // color swatches
  setupColorSwatches(car);

  // next button
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) nextBtn.onclick = () => {
    alert(`${t('next')}: ${car.make} ${car.model} ${car.year} | name: ${document.getElementById('player-name').value || '-'}`);
  };
}

function setupColorSwatches(car){
  const swatches = document.getElementById('color-swatches');
  if (!swatches) return;
  swatches.innerHTML = '';
  const colors = ['#ff6b6b', '#5ec8ff', '#b389ff', '#fff200', '#00e5ff', '#ffffff', '#222222'];
  for (const c of colors) {
    const btn = document.createElement('button');
    btn.style.background = c;
    btn.title = c;
    btn.addEventListener('click', () => {
      setCarColorSmooth(c, 2000 + Math.random()*2000);
      car.color = c;
    });
    swatches.appendChild(btn);
  }
  const picker = document.getElementById('color-picker');
  if (picker) picker.addEventListener('input', (e) => {
    const c = e.target.value;
    setCarColorSmooth(c, 2000 + Math.random()*2000);
    car.color = c;
  });
}

function setCarColorSmooth(hex, durationMs = 2500){
  if (typeof THREE === 'undefined') return;
  const to = new THREE.Color(hex);
  const from = three._photoTint ? new THREE.Color(three._photoTint.style.background || '#000000') : (three.mesh?.material?.color?.clone?.() || new THREE.Color(hex));
  three._colorLerp = {
    from,
    to,
    t: 0,
    durMs: durationMs,
    startMs: performance.now()
  };
}

// Leagues and emblems
const LEAGUES = [
  { id: 'glory-ring', name: 'Кольцо славы', bonuses: ['+20% к скорости', '+20% к славе', '+10% к деньгам', '-15% к долговечности деталей'] },
  { id: 'iron-horses', name: 'Железные кони', bonuses: ['+20% к долговечности деталей', '-20% к стоимости топлива', '-5% к деньгам', '-5% к ТО'] },
  { id: 'formula-x', name: 'Формула X', bonuses: ['-40% к стоимости топлива', '+30% к скорости', '+20% к деньгам', '+20% к славе', '-40% к долговечности деталей', '+15% к стоимости авто'] }
];
const EMBLEMS = ['🏁','🔥','⚡','🛡️','🦅','🐍','👑'];

function setupLeaguesAndEmblems(){
  const leaguesRoot = document.getElementById('league-options');
  const emblemsRoot = document.getElementById('emblem-options');
  if (!leaguesRoot || !emblemsRoot) return;
  leaguesRoot.innerHTML = '';
  emblemsRoot.innerHTML = '';
  let selectedLeague = null;
  let selectedEmblem = null;

  for (const lg of LEAGUES) {
    const card = document.createElement('div');
    card.className = 'league-card';
    const name = document.createElement('div');
    name.className = 'league-name';
    name.textContent = lg.name;
    const bonuses = document.createElement('div');
    bonuses.className = 'league-bonuses';
    bonuses.textContent = lg.bonuses.join(' · ');
    card.appendChild(name);
    card.appendChild(bonuses);
    card.addEventListener('click', () => {
      selectedLeague = lg.id;
      document.querySelectorAll('.league-card').forEach(el=>el.classList.remove('selected'));
      card.classList.add('selected');
      validateInspectForm(selectedLeague, selectedEmblem);
    });
    leaguesRoot.appendChild(card);
  }

  for (const sym of EMBLEMS) {
    const e = document.createElement('button');
    e.className = 'emblem';
    e.textContent = sym;
    e.addEventListener('click', () => {
      selectedEmblem = sym;
      document.querySelectorAll('.emblem').forEach(el=>el.classList.remove('selected'));
      e.classList.add('selected');
      validateInspectForm(selectedLeague, selectedEmblem);
    });
    emblemsRoot.appendChild(e);
  }

  // store handlers on DOM for access
  leaguesRoot.dataset.selected = '';
  emblemsRoot.dataset.selected = '';
}

function validateInspectForm(selectedLeague, selectedEmblem){
  const name = document.getElementById('player-name')?.value?.trim();
  const next = document.getElementById('next-btn');
  const ok = Boolean(name) && Boolean(selectedLeague);
  if (next) next.disabled = !ok;
}

