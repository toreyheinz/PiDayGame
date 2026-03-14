import Phaser from "phaser"
import { Socket, Presence } from "phoenix"
import { HubScene } from "./game/HubScene"
import { PiMemoryGame } from "./game/PiMemoryGame"
import { MonteCarloGame } from "./game/MonteCarloGame"
import { SliceThePiGame } from "./game/SliceThePiGame"
import { TriviaGame } from "./game/TriviaGame"
import { ProjectileGame } from "./game/ProjectileGame"
import { SoundFX } from "./game/SoundFX"

// --- Phoenix Socket Connection ---
const socket = new Socket("/game_socket", {
  params: { token: window.PLAYER_TOKEN }
})
socket.connect()

const hubChannel = socket.channel("game:hub", {})
const miniChannel = (gameType) => {
  const ch = socket.channel(`game:mini:${gameType}`, {})
  ch.join()
  return ch
}

const presence = new Presence(hubChannel)

// --- Phaser Game Config ---
const config = {
  type: Phaser.AUTO,
  parent: "game-canvas",
  width: 800,
  height: 600,
  backgroundColor: "#0a0a2e",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [HubScene],
  physics: {
    default: "arcade",
    arcade: { debug: false }
  },
  input: {
    activePointers: 2,
  }
}

const game = new Phaser.Game(config)

// Pass dependencies to scene
game.registry.set("hubChannel", hubChannel)
game.registry.set("presence", presence)
game.registry.set("socket", socket)
game.registry.set("miniChannel", miniChannel)

// Join hub channel
hubChannel.join()
  .receive("ok", () => {
    console.log("Joined hub!")
    // Auto-open game if navigated to a game URL (e.g. /projectile-pi)
    if (window.AUTO_OPEN_GAME) {
      setTimeout(() => window.piStation.openMiniGame(window.AUTO_OPEN_GAME), 500)
    }
  })
  .receive("error", (resp) => console.error("Unable to join hub", resp))

// --- Mini-game Manager ---
window.piStation = {
  openMiniGame(gameType) {
    // Don't re-open if a game is already active
    if (window.piStation._currentGame) return

    const overlay = document.getElementById("mini-game-overlay")
    const content = document.getElementById("mini-game-content")
    overlay.classList.add("active")

    // Hide station prompt
    document.getElementById("station-prompt").classList.remove("visible")

    // Disable Phaser input while overlay is active
    const scene = game.scene.getScene("HubScene")
    if (scene) scene.input.enabled = false

    hubChannel.push("enter_game", { game: gameType })
    SoundFX.countdown()

    const channel = miniChannel(gameType)

    switch (gameType) {
      case "pi_memory":
        PiMemoryGame.start(content, channel)
        break
      case "monte_carlo":
        MonteCarloGame.start(content, channel)
        break
      case "slice_the_pi":
        SliceThePiGame.start(content, channel)
        break
      case "pi_trivia":
        TriviaGame.start(content, channel)
        break
      case "projectile_pi":
        ProjectileGame.start(content, channel)
        break
    }

    window.piStation._currentChannel = channel
    window.piStation._currentGame = gameType
  },

  closeMiniGame() {
    const overlay = document.getElementById("mini-game-overlay")
    overlay.classList.remove("active")

    const content = document.getElementById("mini-game-content")
    while (content.firstChild) content.removeChild(content.firstChild)

    hubChannel.push("leave_game", {})

    // Re-enable Phaser input
    const scene = game.scene.getScene("HubScene")
    if (scene) scene.input.enabled = true

    if (window.piStation._currentChannel) {
      window.piStation._currentChannel.leave()
      window.piStation._currentChannel = null
    }
    window.piStation._currentGame = null
  },

  // Chat
  sendChat(message) {
    if (message) {
      hubChannel.push("chat", { message })
    }
  },

  // Station prompt — called from HubScene
  showStationPrompt(station) {
    const el = document.getElementById("station-prompt")
    const isMobile = "ontouchstart" in window
    if (station) {
      const action = isMobile ? "Tap" : "Press SPACE"
      el.textContent = `${action} to play ${station.label.replace("\n", " ")}!`
      el.classList.add("visible")
      el.onclick = () => window.piStation.openMiniGame(station.game)
    } else {
      el.classList.remove("visible")
      el.onclick = null
    }
  },

  _currentChannel: null,
  _currentGame: null,
}

// --- Chat messages from server ---
hubChannel.on("chat", ({ player_id, name, message }) => {
  SoundFX.chat()

  // Pass to Phaser scene for bubble rendering
  const scene = game.scene.getScene("HubScene")
  if (scene && scene.showRemoteChat) {
    scene.showRemoteChat(player_id, name, message)
  }
})

// --- Players List UI ---
const playersListEl = document.getElementById("players-list")

const avatarSymbols = {
  pi: "\u03C0", sigma: "\u03A3", delta: "\u0394", omega: "\u03A9",
  theta: "\u03B8", lambda: "\u03BB", phi: "\u03C6", psi: "\u03C8",
  epsilon: "\u03B5", zeta: "\u03B6"
}

let prevPlayerCount = 0

function updatePlayersList() {
  const players = []
  presence.list((id, { metas: [meta] }) => {
    players.push({ id, ...meta })
  })

  // Play join sound when new player appears
  if (players.length > prevPlayerCount && prevPlayerCount > 0) {
    SoundFX.join()
  }
  prevPlayerCount = players.length

  players.sort((a, b) => (b.score || 0) - (a.score || 0))

  while (playersListEl.firstChild) playersListEl.removeChild(playersListEl.firstChild)

  // Header
  const header = document.createElement("div")
  header.style.cssText = "color:#a78bfa;font-size:0.6rem;padding:0.2rem 0.4rem;font-weight:bold;"
  header.textContent = `Online: ${players.length}`
  playersListEl.appendChild(header)

  players.forEach(p => {
    const entry = document.createElement("div")
    entry.className = "player-entry"

    const avatar = document.createElement("span")
    avatar.className = "player-avatar"
    avatar.textContent = avatarSymbols[p.avatar_key] || "?"

    const name = document.createElement("span")
    name.textContent = p.name

    const score = document.createElement("span")
    score.className = "player-score"
    score.textContent = p.score || 0

    entry.appendChild(avatar)
    entry.appendChild(name)
    entry.appendChild(score)
    playersListEl.appendChild(entry)
  })
}

presence.onSync(() => updatePlayersList())

// Export SoundFX globally for mini-games
window.SoundFX = SoundFX
