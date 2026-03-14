export const MonteCarloGame = {
  start(container, channel) {
    while (container.firstChild) container.removeChild(container.firstChild)

    const CANVAS_SIZE = 300
    const MAX_DARTS = 200
    let dartsInCircle = 0
    let totalDarts = 0
    let submitted = false

    // Build UI
    const title = document.createElement("div")
    title.className = "mg-title"
    title.textContent = "Monte Carlo Pi"

    const subtitle = document.createElement("div")
    subtitle.className = "mg-subtitle"
    subtitle.textContent = "Tap to throw darts! Estimate Pi by the ratio of hits inside the circle."

    const canvas = document.createElement("canvas")
    canvas.id = "mc-canvas"
    canvas.width = CANVAS_SIZE
    canvas.height = CANVAS_SIZE
    canvas.style.cssText = "border-radius:0.75rem;border:2px solid rgba(255,255,255,0.2);touch-action:none;cursor:crosshair;"
    const ctx = canvas.getContext("2d")

    const stats = document.createElement("div")
    stats.className = "mc-stats"

    const dartsStatEl = createStat("0 / " + MAX_DARTS, "Darts")
    const estimateStatEl = createStat("?.????", "Pi Estimate")
    const actualStatEl = createStat("3.1416", "Actual Pi")
    stats.appendChild(dartsStatEl.container)
    stats.appendChild(estimateStatEl.container)
    stats.appendChild(actualStatEl.container)

    const resultArea = document.createElement("div")
    resultArea.style.cssText = "margin-top: 1rem; min-height: 3rem;"

    container.appendChild(title)
    container.appendChild(subtitle)
    container.appendChild(canvas)
    container.appendChild(stats)
    container.appendChild(resultArea)

    // Draw initial state
    drawBackground(ctx, CANVAS_SIZE)

    // Handle dart throws
    canvas.addEventListener("pointerdown", (e) => {
      if (totalDarts >= MAX_DARTS || submitted) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = CANVAS_SIZE / rect.width
      const scaleY = CANVAS_SIZE / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      throwDart(x, y)
    })

    // Also support rapid tapping / random throw button
    const rapidBtn = document.createElement("button")
    rapidBtn.className = "mg-btn"
    rapidBtn.textContent = "Throw 10 Random Darts"
    rapidBtn.addEventListener("click", () => {
      for (let i = 0; i < 10 && totalDarts < MAX_DARTS; i++) {
        throwDart(Math.random() * CANVAS_SIZE, Math.random() * CANVAS_SIZE)
      }
    })
    container.appendChild(rapidBtn)

    function throwDart(x, y) {
      totalDarts++

      // Check if inside circle (centered, radius = CANVAS_SIZE/2)
      const cx = CANVAS_SIZE / 2
      const cy = CANVAS_SIZE / 2
      const r = CANVAS_SIZE / 2
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      const inside = dist <= r

      if (inside) dartsInCircle++

      // Draw dart
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fillStyle = inside ? "#22d3ee" : "#ef4444"
      ctx.fill()

      // Update stats
      const estimate = totalDarts > 0 ? (4 * dartsInCircle / totalDarts) : 0
      dartsStatEl.value.textContent = `${totalDarts} / ${MAX_DARTS}`
      estimateStatEl.value.textContent = estimate.toFixed(4)

      // Color estimate based on accuracy
      const error = Math.abs(estimate - Math.PI)
      if (error < 0.05) {
        estimateStatEl.value.style.color = "#22c55e"
      } else if (error < 0.2) {
        estimateStatEl.value.style.color = "#f59e0b"
      } else {
        estimateStatEl.value.style.color = "#22d3ee"
      }

      // Auto-submit when all darts thrown
      if (totalDarts >= MAX_DARTS && !submitted) {
        submitted = true
        const finalEstimate = 4 * dartsInCircle / totalDarts

        channel.push("mc_submit", {
          estimate: parseFloat(finalEstimate.toFixed(6)),
          darts: totalDarts
        }).receive("ok", ({ score, error: err }) => {
          while (resultArea.firstChild) resultArea.removeChild(resultArea.firstChild)

          const result = document.createElement("div")
          result.style.cssText = "color: #22d3ee; font-size: 1.3rem; margin-bottom: 0.5rem;"
          result.textContent = `Your estimate: ${finalEstimate.toFixed(4)}`

          const errorEl = document.createElement("div")
          errorEl.style.cssText = "color: #a78bfa; margin-bottom: 0.5rem;"
          errorEl.textContent = `Error: ${err} | Score: ${score} points`

          const playAgain = document.createElement("button")
          playAgain.className = "mg-btn"
          playAgain.textContent = "Play Again"
          playAgain.addEventListener("click", () => MonteCarloGame.start(container, channel))

          const close = document.createElement("button")
          close.className = "mg-btn secondary"
          close.textContent = "Back to Hub"
          close.addEventListener("click", () => window.piStation.closeMiniGame())

          resultArea.appendChild(result)
          resultArea.appendChild(errorEl)
          resultArea.appendChild(playAgain)
          resultArea.appendChild(close)
        })

        rapidBtn.style.display = "none"
      }
    }

    // Listen for other players' results
    channel.on("mc_result", ({ name, estimate, score }) => {
      const announcement = document.createElement("div")
      announcement.style.cssText = "color: #a78bfa; font-size: 0.8rem; margin-top: 0.25rem;"
      announcement.textContent = `${name} estimated ${estimate.toFixed(4)} (${score} pts)`
      resultArea.appendChild(announcement)
      setTimeout(() => { if (announcement.parentNode) announcement.parentNode.removeChild(announcement) }, 5000)
    })
  }
}

function drawBackground(ctx, size) {
  // Square background
  ctx.fillStyle = "#1e1b4b"
  ctx.fillRect(0, 0, size, size)

  // Circle
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fillStyle = "rgba(99, 102, 241, 0.15)"
  ctx.fill()
  ctx.strokeStyle = "rgba(99, 102, 241, 0.5)"
  ctx.lineWidth = 2
  ctx.stroke()

  // Crosshairs
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size)
  ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2)
  ctx.stroke()
}

function createStat(initialValue, label) {
  const c = document.createElement("div")
  c.className = "mc-stat"

  const v = document.createElement("div")
  v.className = "mc-stat-value"
  v.textContent = initialValue

  const l = document.createElement("div")
  l.className = "mc-stat-label"
  l.textContent = label

  c.appendChild(v)
  c.appendChild(l)

  return { container: c, value: v, label: l }
}
