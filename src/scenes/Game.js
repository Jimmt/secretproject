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
    this.cameras.main.setZoom(4)
    this.map = this.make.tilemap({ key: 'map'})
    const map = this.map
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

    this.books = []
    this.bookSize = 54

    this.configureMap()

    this.input.once('pointerdown', () => {
      // this.scene.start('GameOver');
    });
    this.cursors = this.input.keyboard.createCursorKeys();

    let player = new Player(this, 800, 300, 'cat');
    this.player = player
    player.body.setSize(20, 15)
    player.body.setOffset(6, 17)
    player.setScale(1);
    player.setDepth(2);
    player.body.setCollideWorldBounds(true)
    this.physics.add.collider(player, this.mapColliders);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player)

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
    this.configureCustomers()
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

    // need a progress bar ui or something

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
        if (book.frozen) return
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

  configureCustomers() {
    const customerFrontLayer = this.map.getObjectLayer("customer_spawn")
    const o = customerFrontLayer.objects[0]
    const customerCount = 1
    this.customers = []
    const spawnYs = []
    for (let i = 0; i < customerCount; i++) {
      spawnYs.push(i)
    }
    for (let i = 0; i < customerCount; i++) {
      const spawnYIndex = spawnYs[Math.Between(0, spawnYs.length - 1)]
      const spawnYOffset = o.height / customerCount * spawnYIndex
      spawnYs.splice(spawnYIndex, 1)
      const requests = [0]
      const customer = new Customer(this, o.x, o.y + spawnYOffset + Math.Between(-3, 3),  "fox", requests)
      this.customers.push(customer);
      this.add.rectangle(customer.x - 10, customer.y + 5.5, customer.width, customer.height, 0xff0000, 0.5)
    }
    this.customers[0].animateEntry()
    this.debugBookRect = this.add.rectangle(0, 0, 100, 100, 0xff0000, 0.5)
  }

  spawnBook() {
    const cumulativeAreas = []
    let areaSum = 0
    this.bookSpawnRects.forEach((rect) => {
      areaSum += rect.width * rect.height
      cumulativeAreas.push(areaSum)
    })
    const areaProbs = []
    const areaChooser = Math.Between(0, areaSum - 1)
    let chosenAreaIndex;
    cumulativeAreas.some((cumulativeArea, index) => {
      if (areaChooser < cumulativeArea) { chosenAreaIndex = index; return true; }
      return false;
    })
    const chosenRect = this.bookSpawnRects[chosenAreaIndex]
    const bookX = chosenRect.x + Math.Between(0, chosenRect.width)
    const bookY = chosenRect.y + Math.Between(0, chosenRect.height)
    // should be Between(0,20)
    this.books.push(new Book(this, bookX, bookY, Math.Between(0, 2)))
  }

  update ()
  {
    this.handleMovement()
    this.player.update()

    this.customers.forEach((c) => {
      this.books.forEach((book) => {
        if (!book.onGround()) {
        this.debugBookRect.setPosition(book.x, book.y)
        this.debugBookRect.setSize(book.displayWidth, book.displayHeight) 
      }
        const bookRect = new Phaser.Geom.Rectangle(book.x, book.y, book.displayWidth, book.displayHeight)
        const pickupRect = new Phaser.Geom.Rectangle(c.x - 21, c.y, c.width, c.height)
        if (Phaser.Geom.Intersects.RectangleToRectangle(bookRect, pickupRect) && book.onGround() && c.requests.includes(book.type)) {
          c.giveBook(book)
        }
      })
    })
  }

  handleMovement() {
    let player = this.player
    let cursors = this.cursors
    
    let horizSpeed = 260
    if (cursors.left.isDown || this.input.keyboard.addKey('A').isDown) {
      player.body.setVelocityX(-horizSpeed)
      player.flipX = 1
    } else if (cursors.right.isDown || this.input.keyboard.addKey('D').isDown) {
      player.body.setVelocityX(horizSpeed)
      player.flipX = 0
    } else {
      player.body.setVelocityX(0)
    }
    
    let verticalSpeed = 240
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

class Customer extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, tex, requests) {
    super(scene, x, y, tex);
    scene.add.existing(this);
    this.setFrame(0)
    this.flipX = -1
    this.requests = requests
 
    this.bookUiSprites = requests.map((request) => {
      const bookUiSprite = new Book(scene, 0, 0, request);
      bookUiSprite.setFrame(request)
      return bookUiSprite
    })
    this.alignBookUiPositions()

    let idleFrameStart = 0;
    let idleFrameEnd = 0;
    let runFrameStart = 0;
    let runFrameEnd = 0;
    let celebrateFrameStart = 0;
    let celebrateFrameEnd = 0;
    if (tex === "fox") {
      idleFrameEnd = 4
      runFrameStart = 28
      runFrameEnd = 35
      celebrateFrameStart = 42
      celebrateFrameEnd = 52
    }

    this.anims.create({
      key: 'idle',
      frames: this.anims.generateFrameNumbers(tex, { start: idleFrameStart, end: idleFrameEnd }),
      frameRate: 6,
      repeat: -1
    });
    this.anims.create({
      key: 'run',
      frames: this.anims.generateFrameNumbers(tex, { start: runFrameStart, end: runFrameEnd }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'celebrate',
      frames: this.anims.generateFrameNumbers(tex, { start: celebrateFrameStart, end: celebrateFrameEnd }),
      frameRate: 10,
      repeat: 2
    });
  }

  alignBookUiPositions() {
    this.bookUiSprites.forEach((sprite, index) => {
      const bookUiBaselineX = this.x - sprite.displayWidth * this.bookUiSprites.length / 2
      sprite.setPosition(bookUiBaselineX + index * sprite.displayHeight, this.y - sprite.displayHeight / 2)
    })
  }

  giveBook(book) { 
    book.frozen = true
    const requests = this.requests
    const index = requests.indexOf(book.type)
    if (index != -1) {
      requests.splice(index, 1)
      this.bookUiSprites[index].destroy(true)
      this.bookUiSprites.splice(index, 1)
    }
    this.alignBookUiPositions()
    if (requests.length == 0) {
      this.play('celebrate', true).chain('idle')
    }
  }

  animateEntry() {
    this.scene.tweens.add({
      targets: this.bookUiSprites.concat(this),
      x: '-=140',
      duration: 2500,
      onStart:() => {
        this.play('run', true)
      },
      onComplete :() => {
        this.play('idle', true)
      }
    })
  }
}

class Player extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, frame) {
    super(scene, x, y, "cat");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setFrame(frame)
  }

  attachBook(book) { this.book = book; book.setOnGround(false); }

  detachBook() { this.book.setOnGround(true); this.book = null; }

  update() {
    if (!this.book) return
    let xDir = this.flipX == 1 ? -1 : 1
    this.book.x = this.x + xDir * 12
    this.book.y = this.y + 11
  }
}

class Book extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, frame) {
    super(scene, x, y, "books");
    scene.add.existing(this);
    this.setFrame(frame)
    this.setScale(0.25)

    this.type = frame
    this.frozen = false
  }

  onGround() { return this.angle == 0 ? true : false }

  setOnGround(onGround) { this.setAngle(onGround ? 0 : -45) }
}
