import Phaser from "phaser"
import { Socket, Presence } from "phoenix"
import { HubScene } from "./game/HubScene"
import { PiMemoryGame } from "./game/PiMemoryGame"
import { MonteCarloGame } from "./game/MonteCarloGame"
import { SliceThePiGame } from "./game/SliceThePiGame"

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
  .receive("ok", () => console.log("Joined hub!"))
  .receive("error", (resp) => console.error("Unable to join hub", resp))

// --- Mini-game Manager (exposed globally for HTML overlay) ---
window.piStation = {
  openMiniGame(gameType) {
    const overlay = document.getElementById("mini-game-overlay")
    const content = document.getElementById("mini-game-content")
    overlay.classList.add("active")

    // Notify hub we're in a game
    hubChannel.push("enter_game", { game: gameType })

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
    }

    window.piStation._currentChannel = channel
    window.piStation._currentGame = gameType
  },

  closeMiniGame() {
    const overlay = document.getElementById("mini-game-overlay")
    overlay.classList.remove("active")

    // Clear content safely
    const content = document.getElementById("mini-game-content")
    while (content.firstChild) content.removeChild(content.firstChild)

    hubChannel.push("leave_game", {})

    if (window.piStation._currentChannel) {
      window.piStation._currentChannel.leave()
      window.piStation._currentChannel = null
    }
    window.piStation._currentGame = null
  },

  _currentChannel: null,
  _currentGame: null,
}

// --- Players List UI (using safe DOM methods) ---
const playersListEl = document.getElementById("players-list")

const avatarSymbols = {
  pi: "\u03C0", sigma: "\u03A3", delta: "\u0394", omega: "\u03A9",
  theta: "\u03B8", lambda: "\u03BB", phi: "\u03C6", psi: "\u03C8",
  epsilon: "\u03B5", zeta: "\u03B6"
}

function updatePlayersList() {
  const players = []
  presence.list((id, { metas: [meta] }) => {
    players.push({ id, ...meta })
  })

  players.sort((a, b) => (b.score || 0) - (a.score || 0))

  // Clear existing entries safely
  while (playersListEl.firstChild) playersListEl.removeChild(playersListEl.firstChild)

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
