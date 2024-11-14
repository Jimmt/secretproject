import { Scene } from 'phaser';


export class Game extends Scene
{
  constructor ()
  {
    super('Game');
  }

  create ()
  {
    this.cameras.main.setBackgroundColor(0x00ff00);

    this.add.image(512, 384, 'background').setAlpha(0.5)

    this.input.once('pointerdown', () => {
      // this.scene.start('GameOver');
    });
    this.cursors = this.input.keyboard.createCursorKeys();

    let player = this.physics.add.sprite(300, 300, 'cat'); //create the player sprite
    this.player = player
    player.setSize(20, 15)
    player.setOffset(6, 17)
    player.setScale(4);
    this.frame = 0

    // Create an animation
    this.anims.create({
      key: 'idle',
      frames: this.anims.generateFrameNumbers('cat', { start: 0, end: 15 }),
      frameRate: 6,
      repeat: -1
    });
    this.anims.create({
      key: 'run',
      frames: this.anims.generateFrameNumbers('cat', { start: 32, end: 47 }),
      frameRate: 10,
      repeat: -1
    });
  }

  update ()
  {
    let player = this.player
    let cursors = this.cursors
    
    let horizSpeed = 160
    if (cursors.left.isDown || this.input.keyboard.addKey('A').isDown) {
      player.setVelocityX(-horizSpeed)
      player.flipX = 1
    } else if (cursors.right.isDown || this.input.keyboard.addKey('D').isDown) {
      player.setVelocityX(horizSpeed)
      player.flipX = 0
    } else {
      player.setVelocityX(0)
    }
    
    let verticalSpeed = 160
    if (cursors.up.isDown || this.input.keyboard.addKey('W').isDown) {
      player.setVelocityY(-verticalSpeed)
    } else if (cursors.down.isDown || this.input.keyboard.addKey('S').isDown) {
      player.setVelocityY(verticalSpeed)
    } else {
      player.setVelocityY(0)
    }

    console.log(player.body.velocity.length)
    if (player.body.velocity.length() > 0) {
      player.play('run', true);
    } else {
      player.play('idle', true)
    }
  }
}
