import { Math, Scene } from 'phaser';

class DepthManager {
  static cake() { return 2; }
  static player() { return 3; }
  static customer() { return 4; }
  static mapOverlap() { return 5; }
  static ui() { return 6; }
  static uiText() { return 7; }
}

export class Game extends Scene
{
  constructor ()
  {
    super('Game');
  }

  create ()
  {
    this.cameras.main.setBackgroundColor(0xffffff);
    this.cameras.main.setZoom(3.5)
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

    let player = new Player(this, 750, 370, 'cat');
    this.player = player
    player.body.setSize(20, 15)
    player.body.setOffset(6, 17)
    player.setDepth(DepthManager.player());
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

    const interiorLayers = ["bookshelves", "plants", "plants2", "overlapping", "frontlight"]
    const interiorLayersMap = {}
    interiorLayers.forEach((layerName) => {
      interiorLayersMap[layerName] = map.createLayer(layerName, interiorTileset)
    })
    interiorLayersMap["plants"].setDepth(DepthManager.mapOverlap())
    interiorLayersMap["plants2"].setDepth(DepthManager.mapOverlap())

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

    const cakeAnchorLayer = map.getObjectLayer("cake_anchor")
    this.cakeAnchor = cakeAnchorLayer.objects[0]

    for (let i = 0; i < 50; i++) {
      const type = Math.Between(0,20)
      this.spawnBook(type)
    }
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
        const bookRect = new Phaser.Geom.Rectangle(book.getTopLeft().x, book.getTopLeft().y, book.displayWidth, book.displayHeight)
        const dist = Math.Distance.Between(bookRect.centerX, bookRect.centerY, playerRect.centerX, playerRect.centerY)
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
    const customerCount = 6
    this.customers = []
    let spawnYs = []
    for (let i = 0; i < customerCount; i++) {
      spawnYs.push(i)
    }
    let availableYs = [...spawnYs]
    const customerTypes = ["fox", "cat2", "raccoon"]
    const requestsDistrib = [1, 1, 1, 2, 2, 2, 3]
    for (let i = 0; i < customerCount; i++) {
      const randomIndex = Math.Between(0, availableYs.length - 1);
      const assignedY = availableYs[randomIndex] * o.height / customerCount;
      availableYs.splice(randomIndex, 1);

      const numRequests = requestsDistrib[Math.Between(0, requestsDistrib.length - 1)]
      const requests = []
      // copy
      const booksChecklist = [...this.books]
      for (let i = 0; i < numRequests; i++) {
        const type = booksChecklist[Math.Between(0, booksChecklist.length - 1)].type
        requests.push(type)
      }
      const type = customerTypes[Math.Between(0, customerTypes.length - 1)]
      const isFinalCustomer = i == customerCount - 1
      const customer = new Customer(this, o.x, o.y + assignedY + Math.Between(-2, 2), type, isFinalCustomer ? [] : requests, isFinalCustomer)
      this.customers.push(customer);
      // customer.animateEntry(); // remove
      // this.add.rectangle(customer.x - 10, customer.y + 5.5, customer.width, customer.height, 0xff0000, 0.5)
    }
    this.customers[0].animateEntry()
    // this.debugBookRect = this.add.rectangle(0, 0, 100, 100, 0xff0000, 0.5)
  }

  spawnBook(type) {
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
    this.books.push(new Book(this, bookX, bookY, type))
  }

  update ()
  {
    this.handleMovement()
    this.player.update()

    this.customers.forEach((c) => {
      c.update()
      this.books.forEach((book) => {
        if (book.frozen) return
        if (!book.onGround()) {
        // this.debugBookRect.setPosition(book.x, book.y)
        // this.debugBookRect.setSize(book.displayWidth, book.displayHeight) 
        }
        const bookRect = new Phaser.Geom.Rectangle(book.x, book.y, book.displayWidth, book.displayHeight)
        const pickupRect = new Phaser.Geom.Rectangle(c.x - 21, c.y, c.width, c.height)
        if (Phaser.Geom.Intersects.RectangleToRectangle(bookRect, pickupRect) && book.onGround() && c.requests.includes(book.type)) {
          const customerComplete = c.giveBook(book)
          if (customerComplete) { 
            const nextCustomer = this.customers.find((cust) => !cust.complete)
            if (nextCustomer) {
              nextCustomer.animateEntry()
            } else {
              return;
            }
          }
        }
      })
    })
  }

  handleMovement() {
    let player = this.player
    let cursors = this.cursors
    
    let horizSpeed = 100
    if (cursors.left.isDown || this.input.keyboard.addKey('A').isDown) {
      player.body.setVelocityX(-horizSpeed)
      player.flipX = 1
    } else if (cursors.right.isDown || this.input.keyboard.addKey('D').isDown) {
      player.body.setVelocityX(horizSpeed)
      player.flipX = 0
    } else {
      player.body.setVelocityX(0)
    }
    
    let verticalSpeed = 80
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
  constructor(scene, x, y, tex, requests, isFinalCustomer) {
    super(scene, x, y, tex);
    scene.add.existing(this);
    this.setFrame(0)
    this.setDepth(DepthManager.customer())
    this.flipX = -1
    this.requests = requests
    this.isFinalCustomer = isFinalCustomer
    this.complete = false
    this.reachedCounter = false
 
    this.bookUiSprites = []
    this.bubble = scene.add.graphics(0, 0)
    const bubble = this.bubble
    this.bubble.setDepth(DepthManager.ui());
    this.bubble.setAlpha(0)
    if (isFinalCustomer) {
      this.cake = scene.add.sprite(x, y, 'cake')
      this.cake.setDepth(DepthManager.cake())
      const style = { font: "16px Arial", fill: "#454545" };
      this.text = scene.add.text(x, y, 'Happy birthday!!!', style)
      this.text.setScale(0.5)
      this.text.setAlpha(0)
      this.text.setDepth(DepthManager.uiText());
      const text = this.text
      bubble.clear()
      bubble.fillStyle(0xffffff, 1);
      bubble.lineStyle(1, 0x565656, 1)
      bubble.fillRoundedRect(0, 0, text.displayWidth + 10, text.displayHeight + 10, 2)
      bubble.strokeRoundedRect(0, 0, text.displayWidth + 10, text.displayHeight + 10, 2)
    } else {
      this.bookUiSprites = requests.map((request) => {
        const bookUiSprite = new Book(scene, 0, 0, request);
        bookUiSprite.setDepth(DepthManager.ui());
        bookUiSprite.setFrame(request)
        bookUiSprite.setAlpha(0)
        return bookUiSprite
      })
      this.alignBookUiPositions()
    }

    let idleFrameStart = 0;
    let idleFrameEnd = 0;
    let runFrameStart = 0;
    let runFrameEnd = 0;
    let celebrateFrameStart = 0;
    let celebrateFrameEnd = 0;
    let celebrateRepeatCount = 2;
    if (tex === "fox") {
      idleFrameEnd = 4
      runFrameStart = 28
      runFrameEnd = 35
      celebrateFrameStart = 42
      celebrateFrameEnd = 52
    } else if (tex === "cat2") {
      idleFrameEnd = 3
      runFrameStart = 32
      runFrameEnd = 39
      celebrateFrameStart = 56
      celebrateFrameEnd = 61
    } else if (tex == "raccoon") {
      idleFrameEnd = 7
      runFrameStart = 8
      runFrameEnd = 15
      celebrateFrameStart = 16
      celebrateFrameEnd = 19
    }

    this.anims.create({
      key: 'idle',
      frames: this.anims.generateFrameNumbers(tex, { start: idleFrameStart, end: idleFrameEnd }),
      frameRate: 6,
      repeat: -1,
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
      repeat: celebrateRepeatCount
    });
  }

  update() {
    if (this.cake) {
      if (this.reachedCounter) {
        const anchor = this.scene.cakeAnchor
        this.cake.setPosition(anchor.x + anchor.width /  2, anchor.y + anchor.height / 2)
      } else {
        this.cake.setPosition(this.x, this.y - this.cake.displayHeight / 2);
      }
    }
    if (this.isFinalCustomer) {
      this.text.setPosition(this.x - this.displayWidth / 2 - this.text.displayWidth / 2 + 2, this.y - 18)
      this.bubble.setPosition(this.x - this.displayWidth / 2 - this.text.displayWidth / 2, this.y - 20)
    } else if (this.bookUiSprites.length > 0) {
      const firstBookUi = this.bookUiSprites[0]
      this.bubble.setPosition(firstBookUi.getTopLeft().x, firstBookUi.getTopLeft().y)
    }
  }

  alignBookUiPositions() {
    this.bookUiSprites.forEach((sprite, index) => {
      const bookUiTopLeftX = this.x - sprite.displayWidth * this.bookUiSprites.length / 2
      const topLeftX = bookUiTopLeftX + index * sprite.displayWidth - 2
      sprite.setPosition(topLeftX + sprite.displayWidth / 2, this.y - sprite.displayHeight / 2)
    })

    if (this.bookUiSprites.length == 0) { this.bubble.clear(); return }
    const firstBookUi = this.bookUiSprites[0]
    const bubble = this.bubble
    bubble.clear()
    bubble.fillStyle(0xffffff, 1);
    bubble.lineStyle(1, 0x565656, 1)
    bubble.fillRoundedRect(0, 0, this.bookUiSprites.length * firstBookUi.displayWidth, firstBookUi.displayHeight, 2)
    bubble.strokeRoundedRect(0, 0, this.bookUiSprites.length * firstBookUi.displayWidth, firstBookUi.displayHeight, 2)
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
      this.complete = true
      return true
    }
    return false
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
        this.reachedCounter = true
        this.play('idle', true)
        if (this.isFinalCustomer) {
          this.text.setAlpha(0.8)
          this.bubble.setAlpha(0.8)
          // Terrible
          this.scene.customers.forEach((customer) => { customer.play('celebrate', true).chain({ key: 'idle', delay: Math.Between(0, 500) }) })
          return;
        }
        this.bookUiSprites.forEach((sprite) => { sprite.setAlpha(1) })
        if (this.bubble) this.bubble.setAlpha(1)
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
