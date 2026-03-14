// If you want to use Phoenix channels, run `mix help phx.gen.channel`
// to get started and then uncomment the line below.
// import "./user_socket.js"

// You can include dependencies in two ways.
//
// The simplest option is to put them in assets/vendor and
// import them using relative paths:
//
//     import "../vendor/some-package.js"
//
// Alternatively, you can `npm install some-package --prefix assets` and import
// them using a path starting with the package name:
//
//     import "some-package"
//
// If you have dependencies that try to import CSS, esbuild will generate a separate `app.css` file.
// To load it, simply add a second `<link>` to your `root.html.heex` file.

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html"
// Establish Phoenix Socket and LiveView configuration.
import {Socket} from "phoenix"
import {LiveSocket} from "phoenix_live_view"
import {hooks as colocatedHooks} from "phoenix-colocated/pi_day"
import topbar from "../vendor/topbar"

const AVATAR_SYMBOLS = {
  pi: "\u03C0", sigma: "\u03A3", delta: "\u0394", omega: "\u03A9",
  theta: "\u03B8", lambda: "\u03BB", phi: "\u03C6", psi: "\u03C8",
  epsilon: "\u03B5", zeta: "\u03B6"
}

const AVATAR_COLORS = {
  pi: "#06b6d4", sigma: "#8b5cf6", delta: "#f59e0b", omega: "#ef4444",
  theta: "#22c55e", lambda: "#ec4899", phi: "#3b82f6", psi: "#f97316",
  epsilon: "#14b8a6", zeta: "#a855f7"
}

const STATIONS = [
  { x: 150, y: 150, label: "Pi Memory\nSprint", icon: "\u{1F9E0}", color: "#06b6d4" },
  { x: 650, y: 150, label: "Monte Carlo\nPi", icon: "\u{1F3AF}", color: "#8b5cf6" },
  { x: 400, y: 450, label: "Slice\nthe Pi", icon: "\u{1FA93}", color: "#f59e0b" },
]

const SpectateHub = {
  mounted() {
    const canvas = this.el.querySelector("canvas")
    const ctx = canvas.getContext("2d")
    this.players = []

    const resize = () => {
      const rect = this.el.getBoundingClientRect()
      canvas.width = 800
      canvas.height = 600
    }
    resize()
    window.addEventListener("resize", resize)

    this.handleEvent("hub_players", ({ players }) => {
      this.players = players
      this.draw(ctx, canvas)
    })

    // Initial draw
    this.draw(ctx, canvas)
  },

  draw(ctx, canvas) {
    const W = 800, H = 600
    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = "#0a0a2e"
    ctx.fillRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = "rgba(30, 27, 75, 0.3)"
    ctx.lineWidth = 1
    for (let x = 0; x <= W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }
    for (let y = 0; y <= H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }

    // Border
    ctx.strokeStyle = "rgba(99, 102, 241, 0.3)"
    ctx.lineWidth = 2
    ctx.strokeRect(20, 20, 760, 560)

    // "3.14" watermark
    ctx.fillStyle = "rgba(30, 27, 75, 0.3)"
    ctx.font = "bold 120px monospace"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("3.14", 400, 300)

    // Stations
    STATIONS.forEach(s => {
      ctx.beginPath()
      ctx.arc(s.x, s.y, 35, 0, Math.PI * 2)
      ctx.fillStyle = s.color + "99"
      ctx.fill()
      ctx.strokeStyle = s.color
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.font = "24px serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillStyle = "white"
      ctx.fillText(s.icon, s.x, s.y - 3)

      ctx.font = "11px monospace"
      ctx.fillStyle = "#e2e8f0"
      const lines = s.label.split("\n")
      lines.forEach((line, i) => {
        ctx.fillText(line, s.x, s.y + 48 + i * 14)
      })
    })

    // Title
    ctx.font = "bold 24px monospace"
    ctx.fillStyle = "#a78bfa"
    ctx.textAlign = "center"
    ctx.fillText("Pi Station", 400, 30)

    // Players
    this.players.forEach(p => {
      const color = AVATAR_COLORS[p.avatar_key] || "#888888"
      const symbol = AVATAR_SYMBOLS[p.avatar_key] || "?"

      // Shadow
      ctx.beginPath()
      ctx.ellipse(p.x, p.y + 12, 15, 5, 0, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(0,0,0,0.3)"
      ctx.fill()

      // Body
      ctx.beginPath()
      ctx.arc(p.x, p.y, 18, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = "rgba(255,255,255,0.4)"
      ctx.lineWidth = 2
      ctx.stroke()

      // Symbol
      ctx.font = "18px serif"
      ctx.fillStyle = "white"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(symbol, p.x, p.y)

      // Name
      ctx.font = "11px monospace"
      const nameWidth = ctx.measureText(p.name).width
      ctx.fillStyle = "rgba(0,0,0,0.5)"
      ctx.fillRect(p.x - nameWidth / 2 - 4, p.y - 35, nameWidth + 8, 16)
      ctx.fillStyle = "white"
      ctx.fillText(p.name, p.x, p.y - 27)

      // Status badge
      if (p.status && p.status !== "hub") {
        ctx.font = "9px monospace"
        ctx.fillStyle = "#22d3ee"
        ctx.fillText("Playing: " + p.status, p.x, p.y + 28)
      }
    })

    // Player count
    ctx.font = "12px monospace"
    ctx.fillStyle = "#a78bfa"
    ctx.textAlign = "left"
    ctx.fillText("Online: " + this.players.length, 30, 580)
  }
}

const csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")
const liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: {_csrf_token: csrfToken},
  hooks: {...colocatedHooks, SpectateHub},
})

// Show progress bar on live navigation and form submits
topbar.config({barColors: {0: "#29d"}, shadowColor: "rgba(0, 0, 0, .3)"})
window.addEventListener("phx:page-loading-start", _info => topbar.show(300))
window.addEventListener("phx:page-loading-stop", _info => topbar.hide())

// connect if there are any LiveViews on the page
liveSocket.connect()

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
window.liveSocket = liveSocket

// The lines below enable quality of life phoenix_live_reload
// development features:
//
//     1. stream server logs to the browser console
//     2. click on elements to jump to their definitions in your code editor
//
if (process.env.NODE_ENV === "development") {
  window.addEventListener("phx:live_reload:attached", ({detail: reloader}) => {
    // Enable server log streaming to client.
    // Disable with reloader.disableServerLogs()
    reloader.enableServerLogs()

    // Open configured PLUG_EDITOR at file:line of the clicked element's HEEx component
    //
    //   * click with "c" key pressed to open at caller location
    //   * click with "d" key pressed to open at function component definition location
    let keyDown
    window.addEventListener("keydown", e => keyDown = e.key)
    window.addEventListener("keyup", e => keyDown = null)
    window.addEventListener("click", e => {
      if(keyDown === "c"){
        e.preventDefault()
        e.stopImmediatePropagation()
        reloader.openEditorAtCaller(e.target)
      } else if(keyDown === "d"){
        e.preventDefault()
        e.stopImmediatePropagation()
        reloader.openEditorAtDef(e.target)
      }
    }, true)

    window.liveReloader = reloader
  })
}

