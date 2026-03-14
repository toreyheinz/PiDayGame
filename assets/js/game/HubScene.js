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

const STATIONS = [
  { x: 130, y: 130, game: "pi_memory", label: "Pi Memory\nSprint", icon: "\u{1F9E0}", color: 0x06b6d4 },
  { x: 670, y: 130, game: "monte_carlo", label: "Monte Carlo\nPi", icon: "\u{1F3AF}", color: 0x8b5cf6 },
  { x: 130, y: 460, game: "slice_the_pi", label: "Slice\nthe Pi", icon: "\u{1FA93}", color: 0xf59e0b },
  { x: 670, y: 460, game: "pi_trivia", label: "Pi Trivia\nBlitz", icon: "\u{1F4A1}", color: 0xec4899 },
  { x: 400, y: 300, game: "projectile_pi", label: "Projectile\nPi", icon: "\u{1F680}", color: 0x22c55e },
]

export class HubScene extends Phaser.Scene {
  constructor() {
    super({ key: "HubScene" })
    this.otherPlayers = {}
    this.otherBubbles = {}
    this.moveSpeed = 200
    this.joystickVector = { x: 0, y: 0 }
    this.nearStation = null
  }

  create() {
    this.hubChannel = this.registry.get("hubChannel")
    this.presence = this.registry.get("presence")

    this.drawRoom()
    this.createStations()
    this.createPlayer()
    this.setupControls()
    this.setupPresence()

    // Title
    this.add.text(400, 30, "Pi Station", {
      fontSize: "24px", fontFamily: "monospace", color: "#a78bfa",
    }).setOrigin(0.5)

    // Floating pi particles
    this.createParticles()
  }

  drawRoom() {
    const g = this.add.graphics()

    g.fillStyle(0x0a0a2e)
    g.fillRect(0, 0, 800, 600)

    // Grid
    g.lineStyle(1, 0x1e1b4b, 0.3)
    for (let x = 0; x <= 800; x += 40) {
      g.moveTo(x, 0); g.lineTo(x, 600)
    }
    for (let y = 0; y <= 600; y += 40) {
      g.moveTo(0, y); g.lineTo(800, y)
    }
    g.strokePath()

    // Border with glow effect
    g.lineStyle(2, 0x6366f1, 0.3)
    g.strokeRect(20, 20, 760, 560)
    g.lineStyle(1, 0x818cf8, 0.15)
    g.strokeRect(18, 18, 764, 564)

    // Pi decorations
    const piPositions = [[80, 500], [720, 80], [720, 500], [250, 300], [550, 300]]
    piPositions.forEach(([x, y]) => {
      this.add.text(x, y, "\u03C0", {
        fontSize: "40px", color: "#1e1b4b",
      }).setOrigin(0.5).setAlpha(0.3)
    })

    // "3.14" watermark
    this.add.text(400, 300, "3.14", {
      fontSize: "120px", fontFamily: "monospace", color: "#1e1b4b",
    }).setOrigin(0.5).setAlpha(0.15)
  }

  createParticles() {
    // Floating math symbols as ambient particles
    const symbols = ["\u03C0", "\u2211", "\u222B", "\u221E", "e", "\u2202", "\u2207"]
    for (let i = 0; i < 8; i++) {
      const sym = this.add.text(
        Phaser.Math.Between(50, 750),
        Phaser.Math.Between(50, 550),
        Phaser.Math.RND.pick(symbols),
        { fontSize: "16px", color: "#312e81" }
      ).setOrigin(0.5).setAlpha(0.2).setDepth(0)

      this.tweens.add({
        targets: sym,
        y: sym.y - 30,
        alpha: { from: 0.15, to: 0.3 },
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
      })
    }
  }

  createStations() {
    STATIONS.forEach(station => {
      // Outer glow ring
      const glow = this.add.circle(station.x, station.y, 55, station.color, 0.08)
      this.tweens.add({
        targets: glow,
        scaleX: 1.2, scaleY: 1.2,
        alpha: { from: 0.08, to: 0.2 },
        duration: 1500, yoyo: true, repeat: -1,
      })

      // Station circle
      const circle = this.add.circle(station.x, station.y, 35, station.color, 0.6)
      circle.setStrokeStyle(2, station.color)
      station._circle = circle

      // Icon
      this.add.text(station.x, station.y - 5, station.icon, {
        fontSize: "24px"
      }).setOrigin(0.5)

      // Label
      this.add.text(station.x, station.y + 50, station.label, {
        fontSize: "11px", fontFamily: "monospace", color: "#e2e8f0",
        align: "center",
      }).setOrigin(0.5)

      // Larger interactive zone
      const zone = this.add.zone(station.x, station.y, 100, 100).setInteractive()
      zone.on("pointerdown", () => {
        if (window.piStation._currentGame) return
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y, station.x, station.y
        )
        if (dist < 150) {
          window.piStation.openMiniGame(station.game)
        }
      })
    })
  }

  createPlayer() {
    const x = 400, y = 300
    const avatarKey = window.PLAYER_AVATAR
    const color = AVATAR_COLORS[avatarKey] || 0x06b6d4

    this.player = this.add.container(x, y)

    const shadow = this.add.ellipse(0, 12, 30, 10, 0x000000, 0.3)
    const body = this.add.circle(0, 0, 18, color)
    body.setStrokeStyle(2, 0xffffff, 0.5)

    const symbol = this.add.text(0, 0, AVATAR_SYMBOLS[avatarKey] || "?", {
      fontSize: "18px", fontFamily: "serif", color: "#ffffff",
    }).setOrigin(0.5)

    const nameTag = this.add.text(0, -30, window.PLAYER_NAME, {
      fontSize: "11px", fontFamily: "monospace", color: "#ffffff",
      backgroundColor: "rgba(0,0,0,0.5)", padding: { x: 4, y: 2 },
    }).setOrigin(0.5)

    this.player.add([shadow, body, symbol, nameTag])
    this.player.setDepth(10)

    // Chat bubble for local player
    this.myChatBubble = this.add.text(0, -50, "", {
      fontSize: "11px", fontFamily: "monospace", color: "#ffffff",
      backgroundColor: "rgba(99,102,241,0.85)", padding: { x: 8, y: 4 },
      wordWrap: { width: 140 },
    }).setOrigin(0.5).setVisible(false).setDepth(100)
    this.player.add(this.myChatBubble)

    // Idle bobbing animation
    this.tweens.add({
      targets: body,
      y: -2,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    })
  }

  setupControls() {
    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })

    // Space to enter nearby station
    this.input.keyboard.on("keydown-SPACE", () => {
      if (window.piStation._currentGame) return
      if (document.activeElement === document.getElementById("chat-input")) return
      if (this.nearStation) {
        window.piStation.openMiniGame(this.nearStation.game)
      }
    })

    // Mobile joystick
    if ("ontouchstart" in window) {
      const joystickZone = document.createElement("div")
      joystickZone.style.cssText = "position:fixed;bottom:0;left:0;width:50%;height:40%;z-index:40;pointer-events:auto;"
      joystickZone.id = "joystick-zone"
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

    this.lastBroadcast = 0
    this.broadcastInterval = 50
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
          if (this.otherBubbles[id]) {
            this.otherBubbles[id].destroy()
            delete this.otherBubbles[id]
          }
        }
      })

      // Update or add players
      Object.entries(presences).forEach(([id, meta]) => {
        if (id === window.PLAYER_ID) return

        if (this.otherPlayers[id]) {
          this.tweens.add({
            targets: this.otherPlayers[id],
            x: meta.x, y: meta.y,
            duration: 100, ease: "Linear",
          })

          // Update status text
          const statusObj = this.otherPlayers[id].getAt(4)
          if (statusObj) {
            const label = meta.status !== "hub" ? `Playing ${meta.status}` : ""
            statusObj.setText(label)
          }
        } else {
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

    const statusLabel = meta.status !== "hub" ? `Playing ${meta.status}` : ""
    const status = this.add.text(0, 25, statusLabel, {
      fontSize: "8px", fontFamily: "monospace", color: "#22d3ee",
    }).setOrigin(0.5)

    container.add([shadow, body, symbol, nameTag, status])
    container.setDepth(5)

    // Bobbing animation
    this.tweens.add({
      targets: body,
      y: -2,
      duration: 800 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    })

    return container
  }

  // Called from game.js when chat message arrives
  showRemoteChat(playerId, name, message) {
    if (playerId === window.PLAYER_ID) {
      // Own message
      this.myChatBubble.setText(message).setVisible(true)
      if (this._myChatTimer) this._myChatTimer.remove()
      this._myChatTimer = this.time.delayedCall(4000, () => this.myChatBubble.setVisible(false))
    } else if (this.otherPlayers[playerId]) {
      // Other player's message
      if (this.otherBubbles[playerId]) {
        this.otherBubbles[playerId].destroy()
      }

      const container = this.otherPlayers[playerId]
      const bubble = this.add.text(container.x, container.y - 50, message, {
        fontSize: "10px", fontFamily: "monospace", color: "#ffffff",
        backgroundColor: "rgba(99,102,241,0.85)", padding: { x: 8, y: 4 },
        wordWrap: { width: 140 },
      }).setOrigin(0.5).setDepth(200)

      this.otherBubbles[playerId] = bubble

      // Fade out after 4 seconds
      this.time.delayedCall(4000, () => {
        if (this.otherBubbles[playerId] === bubble) {
          bubble.destroy()
          delete this.otherBubbles[playerId]
        }
      })
    }
  }

  update(time) {
    if (!this.player) return

    let vx = 0, vy = 0

    // Keyboard (only if chat input is not focused)
    const chatFocused = document.activeElement === document.getElementById("chat-input")
    if (!chatFocused) {
      if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1
      if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1
      if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1
      if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1
    }

    // Joystick
    if (Math.abs(this.joystickVector.x) > 0.1 || Math.abs(this.joystickVector.y) > 0.1) {
      vx = this.joystickVector.x
      vy = this.joystickVector.y
    }

    // Normalize
    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy)
      vx /= len
      vy /= len
    }

    const speed = this.moveSpeed * (1 / 60)
    this.player.x = Phaser.Math.Clamp(this.player.x + vx * speed, 40, 760)
    this.player.y = Phaser.Math.Clamp(this.player.y + vy * speed, 40, 560)

    // Station proximity — use HTML prompt instead of Phaser text (more tappable on mobile)
    let nearStation = null
    let closestDist = Infinity
    STATIONS.forEach(station => {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, station.x, station.y
      )
      if (dist < 150 && dist < closestDist) {
        nearStation = station
        closestDist = dist
      }
    })

    // Update station visual feedback
    if (nearStation !== this.nearStation) {
      this.nearStation = nearStation
      window.piStation.showStationPrompt(nearStation)

      // Pulse the station circle when near
      STATIONS.forEach(station => {
        if (station._circle) {
          if (station === nearStation) {
            station._circle.setStrokeStyle(3, 0xffffff)
          } else {
            station._circle.setStrokeStyle(2, station.color)
          }
        }
      })
    }

    // Update other players' bubble positions
    Object.entries(this.otherBubbles).forEach(([id, bubble]) => {
      if (this.otherPlayers[id]) {
        bubble.x = this.otherPlayers[id].x
        bubble.y = this.otherPlayers[id].y - 50
      }
    })

    // Broadcast position
    if (time - this.lastBroadcast > this.broadcastInterval && (vx !== 0 || vy !== 0)) {
      this.hubChannel.push("move", {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y)
      })
      this.lastBroadcast = time
    }

    // Y-sort depth
    this.children.list
      .filter(c => c.type === "Container")
      .forEach(c => c.setDepth(c.y))
  }
}
