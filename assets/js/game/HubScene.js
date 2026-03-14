import Phaser from "phaser"
import nipplejs from "nipplejs"

const AVATAR_SYMBOLS = {
  pi: "\u03C0", sigma: "\u03A3", delta: "\u0394", omega: "\u03A9",
  theta: "\u03B8", lambda: "\u03BB", phi: "\u03C6", psi: "\u03C8",
  epsilon: "\u03B5", zeta: "\u03B6"
}

const AVATAR_COLORS = {
  pi: 0x06b6d4, sigma: 0x8b5cf6, delta: 0xf59e0b, omega: 0xef4444,
  theta: 0x22c55e, lambda: 0xec4899, phi: 0x3b82f6, psi: 0xf97316,
  epsilon: 0x14b8a6, zeta: 0xa855f7
}

// Game station definitions
const STATIONS = [
  { x: 150, y: 150, game: "pi_memory", label: "Pi Memory\nSprint", icon: "\u{1F9E0}", color: 0x06b6d4 },
  { x: 650, y: 150, game: "monte_carlo", label: "Monte Carlo\nPi", icon: "\u{1F3AF}", color: 0x8b5cf6 },
  { x: 400, y: 450, game: "slice_the_pi", label: "Slice\nthe Pi", icon: "\u{1FA93}", color: 0xf59e0b },
]

export class HubScene extends Phaser.Scene {
  constructor() {
    super({ key: "HubScene" })
    this.otherPlayers = {}
    this.moveSpeed = 200
    this.joystickVector = { x: 0, y: 0 }
  }

  create() {
    this.hubChannel = this.registry.get("hubChannel")
    this.presence = this.registry.get("presence")

    this.drawRoom()
    this.createStations()
    this.createPlayer()
    this.setupControls()
    this.setupPresence()
    this.setupChat()

    // Title text
    this.add.text(400, 30, "Pi Station", {
      fontSize: "24px", fontFamily: "monospace", color: "#a78bfa",
    }).setOrigin(0.5)

    // Instructions
    this.add.text(400, 570, "Walk to a station and tap it to play!", {
      fontSize: "14px", fontFamily: "monospace", color: "#6366f1",
    }).setOrigin(0.5)
  }

  drawRoom() {
    // Floor grid
    const g = this.add.graphics()

    // Dark background
    g.fillStyle(0x0a0a2e)
    g.fillRect(0, 0, 800, 600)

    // Grid lines
    g.lineStyle(1, 0x1e1b4b, 0.3)
    for (let x = 0; x <= 800; x += 40) {
      g.moveTo(x, 0); g.lineTo(x, 600)
    }
    for (let y = 0; y <= 600; y += 40) {
      g.moveTo(0, y); g.lineTo(800, y)
    }
    g.strokePath()

    // Border
    g.lineStyle(3, 0x6366f1, 0.5)
    g.strokeRect(20, 20, 760, 560)

    // Pi decorations scattered around
    const piPositions = [
      [80, 500], [720, 80], [720, 500], [250, 300], [550, 300]
    ]
    piPositions.forEach(([x, y]) => {
      this.add.text(x, y, "\u03C0", {
        fontSize: "40px", color: "#1e1b4b",
      }).setOrigin(0.5).setAlpha(0.3)
    })

    // "3.14" large watermark
    this.add.text(400, 300, "3.14", {
      fontSize: "120px", fontFamily: "monospace", color: "#1e1b4b",
    }).setOrigin(0.5).setAlpha(0.15)
  }

  createStations() {
    this.stationZones = []

    STATIONS.forEach(station => {
      // Glow circle
      const glow = this.add.circle(station.x, station.y, 50, station.color, 0.15)
      this.tweens.add({
        targets: glow, alpha: { from: 0.1, to: 0.3 },
        duration: 1500, yoyo: true, repeat: -1,
      })

      // Station circle
      const circle = this.add.circle(station.x, station.y, 35, station.color, 0.6)
      circle.setStrokeStyle(2, station.color)

      // Icon
      this.add.text(station.x, station.y - 5, station.icon, {
        fontSize: "24px"
      }).setOrigin(0.5)

      // Label
      this.add.text(station.x, station.y + 50, station.label, {
        fontSize: "11px", fontFamily: "monospace", color: "#e2e8f0",
        align: "center",
      }).setOrigin(0.5)

      // Interactive zone
      const zone = this.add.zone(station.x, station.y, 80, 80).setInteractive()
      zone.on("pointerdown", () => {
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y, station.x, station.y
        )
        if (dist < 120) {
          window.piStation.openMiniGame(station.game)
        }
      })

      this.stationZones.push({ zone, station })
    })
  }

  createPlayer() {
    const x = 400, y = 300
    const avatarKey = window.PLAYER_AVATAR
    const color = AVATAR_COLORS[avatarKey] || 0x06b6d4

    // Player container
    this.player = this.add.container(x, y)

    // Shadow
    const shadow = this.add.ellipse(0, 12, 30, 10, 0x000000, 0.3)

    // Body circle
    const body = this.add.circle(0, 0, 18, color)
    body.setStrokeStyle(2, 0xffffff, 0.5)

    // Avatar symbol
    const symbol = this.add.text(0, 0, AVATAR_SYMBOLS[avatarKey] || "?", {
      fontSize: "18px", fontFamily: "serif", color: "#ffffff",
    }).setOrigin(0.5)

    // Name tag
    const nameTag = this.add.text(0, -30, window.PLAYER_NAME, {
      fontSize: "11px", fontFamily: "monospace", color: "#ffffff",
      backgroundColor: "rgba(0,0,0,0.5)", padding: { x: 4, y: 2 },
    }).setOrigin(0.5)

    this.player.add([shadow, body, symbol, nameTag])
    this.player.setDepth(10)

    // Chat bubble (hidden by default)
    this.chatBubble = this.add.text(0, -50, "", {
      fontSize: "10px", fontFamily: "monospace", color: "#ffffff",
      backgroundColor: "rgba(99,102,241,0.8)", padding: { x: 6, y: 3 },
      wordWrap: { width: 120 },
    }).setOrigin(0.5).setVisible(false)
    this.player.add(this.chatBubble)

    // Proximity highlight for stations
    this.proximityText = this.add.text(400, 530, "", {
      fontSize: "16px", fontFamily: "monospace", color: "#22d3ee",
    }).setOrigin(0.5).setDepth(20)
  }

  setupControls() {
    // Keyboard
    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })

    // Mobile joystick
    if ("ontouchstart" in window) {
      const joystickZone = document.createElement("div")
      joystickZone.style.cssText = "position:fixed;bottom:0;left:0;width:50%;height:40%;z-index:40;"
      document.body.appendChild(joystickZone)

      const manager = nipplejs.create({
        zone: joystickZone,
        mode: "dynamic",
        color: "rgba(99,102,241,0.5)",
        size: 100,
      })

      manager.on("move", (_evt, data) => {
        const force = Math.min(data.force, 2) / 2
        this.joystickVector.x = Math.cos(data.angle.radian) * force
        this.joystickVector.y = -Math.sin(data.angle.radian) * force
      })

      manager.on("end", () => {
        this.joystickVector.x = 0
        this.joystickVector.y = 0
      })
    }

    // Throttled position broadcast
    this.lastBroadcast = 0
    this.broadcastInterval = 50 // ms
  }

  setupPresence() {
    this.presence.onSync(() => {
      const presences = {}
      this.presence.list((id, { metas: [meta] }) => {
        presences[id] = meta
      })

      // Remove players who left
      Object.keys(this.otherPlayers).forEach(id => {
        if (!presences[id]) {
          this.otherPlayers[id].destroy()
          delete this.otherPlayers[id]
        }
      })

      // Update or add players
      Object.entries(presences).forEach(([id, meta]) => {
        if (id === window.PLAYER_ID) return

        if (this.otherPlayers[id]) {
          // Smoothly move existing player
          this.tweens.add({
            targets: this.otherPlayers[id],
            x: meta.x, y: meta.y,
            duration: 100, ease: "Linear",
          })
        } else {
          // Create new player
          this.otherPlayers[id] = this.createOtherPlayer(meta)
        }
      })
    })
  }

  createOtherPlayer(meta) {
    const color = AVATAR_COLORS[meta.avatar_key] || 0x888888
    const container = this.add.container(meta.x, meta.y)

    const shadow = this.add.ellipse(0, 12, 30, 10, 0x000000, 0.3)
    const body = this.add.circle(0, 0, 18, color, 0.7)
    body.setStrokeStyle(2, 0xffffff, 0.3)

    const symbol = this.add.text(0, 0, AVATAR_SYMBOLS[meta.avatar_key] || "?", {
      fontSize: "18px", fontFamily: "serif", color: "#ffffff",
    }).setOrigin(0.5).setAlpha(0.9)

    const nameTag = this.add.text(0, -30, meta.name, {
      fontSize: "10px", fontFamily: "monospace", color: "#cccccc",
      backgroundColor: "rgba(0,0,0,0.4)", padding: { x: 4, y: 2 },
    }).setOrigin(0.5)

    // Status indicator
    const statusText = meta.status !== "hub" ? meta.status : ""
    const status = this.add.text(0, 25, statusText ? `Playing: ${statusText}` : "", {
      fontSize: "8px", fontFamily: "monospace", color: "#22d3ee",
    }).setOrigin(0.5)

    container.add([shadow, body, symbol, nameTag, status])
    container.setDepth(5)

    return container
  }

  setupChat() {
    this.hubChannel.on("chat", ({ player_id, name, message }) => {
      if (player_id === window.PLAYER_ID) {
        this.showChatBubble(this.player, message, this.chatBubble)
      } else if (this.otherPlayers[player_id]) {
        const bubble = this.add.text(
          this.otherPlayers[player_id].x,
          this.otherPlayers[player_id].y - 50,
          message,
          {
            fontSize: "10px", fontFamily: "monospace", color: "#ffffff",
            backgroundColor: "rgba(99,102,241,0.8)", padding: { x: 6, y: 3 },
            wordWrap: { width: 120 },
          }
        ).setOrigin(0.5).setDepth(20)

        this.time.delayedCall(3000, () => bubble.destroy())
      }
    })
  }

  showChatBubble(container, message, bubble) {
    bubble.setText(message).setVisible(true)
    this.time.delayedCall(3000, () => bubble.setVisible(false))
  }

  update(time) {
    if (!this.player) return

    // Movement
    let vx = 0, vy = 0

    // Keyboard
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1

    // Joystick override
    if (Math.abs(this.joystickVector.x) > 0.1 || Math.abs(this.joystickVector.y) > 0.1) {
      vx = this.joystickVector.x
      vy = this.joystickVector.y
    }

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy)
      vx /= len
      vy /= len
    }

    // Apply movement
    const speed = this.moveSpeed * (1 / 60)
    this.player.x = Phaser.Math.Clamp(this.player.x + vx * speed, 40, 760)
    this.player.y = Phaser.Math.Clamp(this.player.y + vy * speed, 40, 560)

    // Check station proximity
    let nearStation = null
    STATIONS.forEach(station => {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, station.x, station.y
      )
      if (dist < 120) nearStation = station
    })

    this.proximityText.setText(
      nearStation ? `Tap ${nearStation.icon} to play ${nearStation.label.replace("\n", " ")}!` : ""
    )

    // Broadcast position (throttled)
    if (time - this.lastBroadcast > this.broadcastInterval && (vx !== 0 || vy !== 0)) {
      this.hubChannel.push("move", {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y)
      })
      this.lastBroadcast = time
    }

    // Sort players by Y for depth
    this.children.list
      .filter(c => c.type === "Container")
      .forEach(c => c.setDepth(c.y))
  }
}
