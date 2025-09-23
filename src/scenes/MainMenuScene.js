export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
    this.roadBands = []; // visual road strips
    this.laneCentersY = [];
    this.activeVehicles = [];
    this.spawnTimer = null;
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.cameras.main.setBackgroundColor('#0a0a0f');

    this._createVehicleTextures();
    this._createButtonTexture();
    this._createRoads();

    this._spawnLoop();

    const title = this.add.text(width * 0.5, height * 0.18, 'Ночные гонки', {
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      fontSize: Math.round(height * 0.045) + 'px',
      fontStyle: 'bold',
      color: '#e6e6ec',
      align: 'center'
    }).setOrigin(0.5);

    const subtitle = this.add.text(width * 0.5, title.y + title.height * 0.9, 'Гонщики удирают — полиция на хвосте', {
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      fontSize: Math.round(height * 0.022) + 'px',
      color: '#9aa0a6',
      align: 'center'
    }).setOrigin(0.5);

    const buttonSprite = this.add.sprite(width * 0.5, height * 0.52, 'btn-primary');
    buttonSprite.setDisplaySize(Math.min(width * 0.7, 520), Math.max(64, Math.round(height * 0.075)));
    buttonSprite.setInteractive({ useHandCursor: true });

    const buttonLabel = this.add.text(buttonSprite.x, buttonSprite.y, 'Начать заезд', {
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      fontSize: Math.round(buttonSprite.displayHeight * 0.45) + 'px',
      fontStyle: '600',
      color: '#0a0a0f'
    }).setOrigin(0.5);

    buttonSprite.on('pointerover', () => {
      this.tweens.add({ targets: [buttonSprite, buttonLabel], scale: 1.04, duration: 120, ease: 'sine.out' });
    });
    buttonSprite.on('pointerout', () => {
      this.tweens.add({ targets: [buttonSprite, buttonLabel], scale: 1.0, duration: 140, ease: 'sine.out' });
    });
    buttonSprite.on('pointerdown', () => {
      this.cameras.main.flash(180, 255, 255, 255, false);
      this.cameras.main.fadeOut(220, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this._cleanupVehicles();
        this.scene.start('Race');
      });
    });
  }

  update(_, deltaMs) {
    const width = this.scale.width;

    for (let i = this.activeVehicles.length - 1; i >= 0; i -= 1) {
      const vehicle = this.activeVehicles[i];
      if (!vehicle.active) {
        this.activeVehicles.splice(i, 1);
        continue;
      }
      // Remove vehicles once they pass the screen edge
      if (vehicle.x > width + 160) {
        vehicle.destroy();
        this.activeVehicles.splice(i, 1);
      }
    }
  }

  _createRoads() {
    const width = this.scale.width;
    const height = this.scale.height;

    // Build 5 horizontal streets across the screen
    const laneCount = 5;
    const bandHeight = Math.max(76, Math.round(height * 0.065));
    const topMargin = Math.round(height * 0.28);
    const bottomMargin = Math.round(height * 0.14);
    const usableHeight = height - topMargin - bottomMargin;

    this.laneCentersY = [];

    for (let i = 0; i < laneCount; i += 1) {
      const y = topMargin + (usableHeight * i) / (laneCount - 1);
      const road = this.add.rectangle(width * 0.5, y, width * 0.96, bandHeight, 0x111318, 1.0);
      road.setStrokeStyle(2, 0x171a20, 1.0);
      road.setAlpha(0.92);
      this.roadBands.push(road);
      this.laneCentersY.push(y);

      // Lane dashed markers
      const dashCount = 18;
      const dashWidth = Math.max(18, Math.round(width * 0.018));
      const dashHeight = Math.max(6, Math.round(bandHeight * 0.12));
      const gap = (width * 0.9 - dashCount * dashWidth) / (dashCount - 1);
      for (let d = 0; d < dashCount; d += 1) {
        const dx = (width * 0.05) + d * (dashWidth + gap) + dashWidth * 0.5;
        const dash = this.add.rectangle(dx, y, dashWidth, dashHeight, 0x2a2f3a, 1.0);
        dash.setAlpha(0.65);
      }
    }

    // Subtle vignette for cinematic feel
    const vignette = this.add.graphics();
    const gradient = vignette.createRadialGradient(width * 0.5, height * 0.5, Math.min(width, height) * 0.3, width * 0.5, height * 0.5, Math.max(width, height) * 0.6);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.55)');
    vignette.fillStyle(gradient);
    vignette.fillRect(0, 0, width, height);
    vignette.setDepth(50);
    vignette.setScrollFactor(0);
  }

  _createVehicleTextures() {
    const makeCar = (key, bodyColor, accentColor) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const w = 96;
      const h = 48;
      g.fillStyle(0x000000, 0.0);
      g.fillRect(0, 0, w, h);
      // Shadow
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(w * 0.48, h * 0.55, w * 0.92, h * 0.58);
      // Body
      g.fillStyle(bodyColor, 1.0);
      g.fillRoundedRect(6, 4, w - 12, h - 8, 10);
      // Cockpit
      g.fillStyle(0x1b2430, 0.9);
      g.fillRoundedRect(w * 0.58, h * 0.18, w * 0.28, h * 0.64, 8);
      // Accents / lights
      g.fillStyle(accentColor, 1.0);
      g.fillCircle(w - 10, h * 0.28, 3);
      g.fillCircle(w - 10, h * 0.72, 3);
      // Wheels
      g.fillStyle(0x0a0a0f, 1.0);
      g.fillRoundedRect(12, 2, 10, 12, 3);
      g.fillRoundedRect(12, h - 14, 10, 12, 3);
      g.fillRoundedRect(w - 22, 2, 10, 12, 3);
      g.fillRoundedRect(w - 22, h - 14, 10, 12, 3);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    const makePolice = (key, lightColor) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const w = 100;
      const h = 50;
      g.fillStyle(0x000000, 0.0);
      g.fillRect(0, 0, w, h);
      // Shadow
      g.fillStyle(0x000000, 0.28);
      g.fillEllipse(w * 0.48, h * 0.56, w * 0.95, h * 0.62);
      // Body (dark)
      g.fillStyle(0x0d1218, 1.0);
      g.fillRoundedRect(6, 4, w - 12, h - 8, 10);
      // Cockpit
      g.fillStyle(0x111a24, 1.0);
      g.fillRoundedRect(w * 0.58, h * 0.18, w * 0.28, h * 0.64, 8);
      // Light bar
      g.fillStyle(lightColor, 1.0);
      g.fillRoundedRect(w * 0.42, h * 0.1, 14, h * 0.8, 4);
      // Headlights
      g.fillStyle(0xfefced, 0.9);
      g.fillCircle(w - 10, h * 0.28, 3);
      g.fillCircle(w - 10, h * 0.72, 3);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    makeCar('car-red', 0xd93c3c, 0xffb3b3);
    makeCar('car-teal', 0x2cb5a8, 0xb6fff4);
    makeCar('car-yellow', 0xf1b434, 0xffecc0);
    makeCar('car-purple', 0x7b5ad4, 0xd8c6ff);

    makePolice('police-red', 0xff3b30);
    makePolice('police-blue', 0x007aff);

    this.anims.create({
      key: 'police-strobe',
      frames: [
        { key: 'police-blue' },
        { key: 'police-red' }
      ],
      frameRate: 8,
      repeat: -1
    });
  }

  _spawnLoop() {
    const width = this.scale.width;
    const randomColor = () => {
      const keys = ['car-red', 'car-teal', 'car-yellow', 'car-purple'];
      return keys[Math.floor(Math.random() * keys.length)];
    };

    const spawnChase = () => {
      const laneIndex = Math.floor(Math.random() * this.laneCentersY.length);
      const y = this.laneCentersY[laneIndex];
      const baseSpeed = Phaser.Math.Between(220, 360);

      const racer = this.physics.add.sprite(-140, y, randomColor());
      racer.setDepth(5);
      racer.setVelocityX(baseSpeed);
      racer.setAngle(0);
      racer.setAlpha(0.98);
      this.activeVehicles.push(racer);

      const police = this.physics.add.sprite(racer.x - Phaser.Math.Between(90, 150), y + Phaser.Math.Between(-4, 4), 'police-blue');
      police.play('police-strobe');
      police.setDepth(6);
      police.setVelocityX(baseSpeed + Phaser.Math.Between(60, 120));
      police.setAlpha(0.98);
      this.activeVehicles.push(police);
    };

    const spawnSolo = () => {
      const laneIndex = Math.floor(Math.random() * this.laneCentersY.length);
      const y = this.laneCentersY[laneIndex];
      const baseSpeed = Phaser.Math.Between(180, 320);
      const car = this.physics.add.sprite(-140, y, randomColor());
      car.setVelocityX(baseSpeed);
      car.setDepth(4);
      car.setAlpha(0.95);
      this.activeVehicles.push(car);
    };

    // Kick off a repeating timer with varying cadence
    this.spawnTimer = this.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => {
        const roll = Math.random();
        if (roll < 0.6) spawnChase(); else spawnSolo();
      }
    });
  }

  _createButtonTexture() {
    if (this.textures.exists('btn-primary')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const w = 640;
    const h = 128;
    // Base with subtle gradient
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#25d366');
    grad.addColorStop(1, '#1ea75e');
    g.fillStyle(grad);
    g.fillRoundedRect(0, 0, w, h, 24);
    // Shine
    g.fillStyle(0xffffff, 0.15);
    g.fillRoundedRect(8, 8, w - 16, h * 0.42, 18);
    // Border
    g.lineStyle(4, 0x0a602f, 0.9);
    g.strokeRoundedRect(2, 2, w - 4, h - 4, 22);
    g.generateTexture('btn-primary', w, h);
    g.destroy();
  }

  _cleanupVehicles() {
    if (this.spawnTimer) {
      this.spawnTimer.remove(false);
      this.spawnTimer = null;
    }
    for (let i = this.activeVehicles.length - 1; i >= 0; i -= 1) {
      const v = this.activeVehicles[i];
      if (v && v.destroy) v.destroy();
    }
    this.activeVehicles = [];
  }
}

