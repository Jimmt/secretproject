import { Math, Scene } from 'phaser';

export class Game extends Scene
{
  constructor ()
  {
    super('Game');
  }

  create ()
  {
    this.cameras.main.setBackgroundColor(0xffffff);
    this.cameras.main.setZoom(3)
    this.map = this.make.tilemap({ key: 'map'})
    const map = this.map
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

    this.books = []
    this.bookHeight = 54

    this.configureMap()

    this.input.once('pointerdown', () => {
      // this.scene.start('GameOver');
    });
    this.cursors = this.input.keyboard.createCursorKeys();

    let player = new Player(this, 300, 300, 'cat');
    this.player = player
    player.body.setSize(20, 15)
    player.body.setOffset(6, 17)
    player.setScale(1);
    player.setDepth(2);
    player.body.setCollideWorldBounds(true)
    this.physics.add.collider(player, this.mapColliders);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player)

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

    this.handleSpacebar()
    // TODO(austin): have customers come from the right
  }

  configureMap() {
    const map = this.map
    const interiorTileset = map.addTilesetImage('Interiors_free_32x32')
    const roomTileset = map.addTilesetImage('Room_Builder_free_32x32')
    this.groundLayer = map.createLayer("ground", roomTileset)
    this.shelvesLayer = map.createLayer("bookshelves", interiorTileset)

    this.mapColliders = this.physics.add.staticGroup();
    const collisionLayer = map.getObjectLayer("collision")
    collisionLayer.objects.forEach((object) => {
      const collider = this.mapColliders.create(object.x + object.width / 2, object.y + object.height / 2, "", "", /* isVisible= */ false)
      collider.body.setSize(object.width, object.height)
    })

    this.bookSpawnRects = []
    const bookSpawnLayer = map.getObjectLayer("book_spawn")
    bookSpawnLayer.objects.forEach((object) => {
      const rect = new Phaser.Geom.Rectangle(object.x, object.y, object.width, object.height)
      this.bookSpawnRects.push(rect)
    })

    // const bookPickupLayer = 

    for (let i = 0; i < 100; i++)
    this.spawnBook()
  }

  handleSpacebar() {
    const player = this.player
    const spaceKey = this.input.keyboard.addKey('SPACE');
    spaceKey.on('down', () => {
      if (player.book) { player.detachBook(); return; }

      let minDist = 999999999
      let minDistBook = null
      this.books.forEach(book => {
        const playerRect = new Phaser.Geom.Rectangle(player.body.x, player.body.y, player.body.width, player.body.height)
        // Sprite x/y coordinates for book are centered for some reason.
        const bookRect = new Phaser.Geom.Rectangle(book.getTopLeft().x, book.getTopLeft().y, book.width, book.height)
        const dist = Math.Distance.Between(bookRect.centerX, bookRect.centerY, playerRect.centerX, playerRect.centerY)
        // console.log(dist < minDist, Phaser.Geom.Intersects.RectangleToRectangle(playerRect, bookRect));
        if (dist < minDist && Phaser.Geom.Intersects.RectangleToRectangle(playerRect, bookRect)) { 
          minDist = dist
          minDistBook = book
        }
      })
      if (minDistBook) player.attachBook(minDistBook)
    });
  }

  spawnBook() {
    const cumulativeAreas = []
    let areaSum = 0
    this.bookSpawnRects.forEach((rect) => {
      areaSum += rect.width * rect.height
      cumulativeAreas.push(areaSum)
    })
    const areaProbs = []
    const areaChooser = Phaser.Math.Between(0, areaSum - 1)
    let chosenAreaIndex;
    cumulativeAreas.some((cumulativeArea, index) => {
      if (areaChooser < cumulativeArea) { chosenAreaIndex = index; return true; }
      return false;
    })
    const chosenRect = this.bookSpawnRects[chosenAreaIndex]
    const bookX = chosenRect.x + Phaser.Math.Between(0, chosenRect.width)
    const bookY = chosenRect.y + Phaser.Math.Between(0, chosenRect.height)
    console.log(this)
    this.books.push(new Book(this, bookX, bookY, 10))
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

  attachBook(book) { this.book = book }

  detachBook() { this.book = null }

  update() {
    if (!this.book) return
    let xDir = this.flipX == 1 ? -1 : 1
    this.book.x = this.x + xDir * 12
    console.log(this.book.x)
    this.book.y = this.y + 11
  }
}

class Book extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, frame) {
    super(scene, x, y, "books");
    scene.add.existing(this);
    this.setFrame(frame)
    this.setScale(0.25)
  }
}
