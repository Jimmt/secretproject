import { Math, Scene } from 'phaser';


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

    let player = new Player(this, 300, 300, 'cat');
    this.player = player
    player.body.setSize(20, 15)
    player.body.setOffset(6, 17)
    player.setScale(4);
    player.body.setCollideWorldBounds(true)

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

    this.books = [new Book(this, 100, 100, 10), new Book(this, 290, 290, 8), new Book(this, 300, 300, 9)]
    this.bookHeight = 54
    this.handleSpacebar()
    // TODO(austin): have customers come from the right
  }

  handleSpacebar() {
    const player = this.player
    const spaceKey = this.input.keyboard.addKey('SPACE');
    spaceKey.on('down', () => {
      const grabRadius = this.bookHeight / 2
      let minDist = 999999999
      let minDistBook = null
      this.books.forEach(book => {
        const playerRect = new Phaser.Geom.Rectangle(player.body.x, player.body.y, player.body.width, player.body.height)
        // Sprite x/y coordinates for book are centered for some reason.
        const bookRect = new Phaser.Geom.Rectangle(book.getTopLeft().x, book.getTopLeft().y, book.width, book.height)
        const dist = Math.Distance.Between(bookRect.centerX, bookRect.centerY, playerRect.centerX, playerRect.centerY)
        if (dist < minDist && Phaser.Geom.Intersects.RectangleToRectangle(playerRect, bookRect)) { 
          minDist = dist
          minDistBook = book
        }
      })
      if (minDistBook) player.attach(minDistBook)
    });

  }

  update ()
  {
    this.handleMovement()
    this.player.update()
  }

  handleMovement() {
    let player = this.player
    let cursors = this.cursors
    
    let horizSpeed = 160
    if (cursors.left.isDown || this.input.keyboard.addKey('A').isDown) {
      player.body.setVelocityX(-horizSpeed)
      player.flipX = 1
    } else if (cursors.right.isDown || this.input.keyboard.addKey('D').isDown) {
      player.body.setVelocityX(horizSpeed)
      player.flipX = 0
    } else {
      player.body.setVelocityX(0)
    }
    
    let verticalSpeed = 160
    if (cursors.up.isDown || this.input.keyboard.addKey('W').isDown) {
      player.body.setVelocityY(-verticalSpeed)
    } else if (cursors.down.isDown || this.input.keyboard.addKey('S').isDown) {
      player.body.setVelocityY(verticalSpeed)
    } else {
      player.body.setVelocityY(0)
    }

    if (player.body.velocity.length() > 0) {
      player.play('run', true);
    } else {
      player.play('idle', true)
    }
  }
}


class Player extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, frame) {
    super(scene, x, y, "cat");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setFrame(frame)
  }

  attach(book) {
    this.book = book
  }

  update() {
    if (!this.book) return
    let xDir = this.flipX == 1 ? -1 : 1
    this.book.x = this.x + xDir * 48
    this.book.y = this.y + 45
  }
}

class Book extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, frame) {
    super(scene, x, y, "books");
    scene.add.existing(this);
    this.setFrame(frame)
  }
}
