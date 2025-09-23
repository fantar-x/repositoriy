export default class RaceScene extends Phaser.Scene {
  constructor() {
    super('Race');
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.cameras.main.setBackgroundColor('#0a0a0f');

    const title = this.add.text(width * 0.5, height * 0.3, 'Экран заезда (заглушка)', {
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      fontSize: Math.round(height * 0.035) + 'px',
      fontStyle: 'bold',
      color: '#e6e6ec'
    }).setOrigin(0.5);

    const hint = this.add.text(width * 0.5, title.y + title.height * 0.9, 'Здесь появится трасса и управление', {
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      fontSize: Math.round(height * 0.022) + 'px',
      color: '#9aa0a6'
    }).setOrigin(0.5);

    // Back button
    const back = this.add.text(width * 0.08, height * 0.08, '← Назад', {
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      fontSize: Math.round(height * 0.03) + 'px',
      color: '#7bd389'
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    back.on('pointerdown', () => {
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('MainMenu');
      });
    });
  }
}

