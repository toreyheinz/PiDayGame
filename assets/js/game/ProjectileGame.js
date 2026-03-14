const GRAVITY = 9.81
const MAX_ATTEMPTS = 5
const CANVAS_W = 450
const CANVAS_H = 250
const SCALE = 4 // pixels per meter

export const ProjectileGame = {
  start(container, channel) {
    while (container.firstChild) container.removeChild(container.firstChild)

    let attempts = 0
    let bestError = Infinity
    let bestScore = 0
    let targetX = 0
    let angle = 45
    let velocity = 20
    let animating = false
    let totalScore = 0
    let round = 0
    const TOTAL_ROUNDS = 3

    const title = document.createElement("div")
    title.className = "mg-title"
    title.textContent = "Projectile Pi"

    const subtitle = document.createElement("div")
    subtitle.className = "mg-subtitle"
    subtitle.textContent = "Launch to hit the target! Adjust angle and velocity."

    const canvas = document.createElement("canvas")
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    canvas.style.cssText = "border-radius:0.75rem;border:2px solid rgba(255,255,255,0.2);max-width:100%;background:#0f0a2e;"
    const ctx = canvas.getContext("2d")

    const statsEl = document.createElement("div")
    statsEl.style.cssText = "color:#a78bfa;font-size:0.85rem;margin:0.5rem 0;min-height:1.5rem;"

    // Angle control
    const angleRow = createSlider("Angle", 5, 85, 45, "\u00B0", (v) => { angle = v; drawScene() })
    // Velocity control
    const velRow = createSlider("Velocity", 5, 50, 20, " m/s", (v) => { velocity = v; drawScene() })

    const launchBtn = document.createElement("button")
    launchBtn.className = "mg-btn"
    launchBtn.textContent = "Launch!"
    launchBtn.addEventListener("click", () => launch())

    const feedbackEl = document.createElement("div")
    feedbackEl.style.cssText = "min-height: 2rem; margin: 0.5rem 0; font-size: 1rem;"

    const resultArea = document.createElement("div")
    resultArea.style.cssText = "margin-top: 0.5rem;"

    container.appendChild(title)
    container.appendChild(subtitle)
    container.appendChild(canvas)
    container.appendChild(statsEl)
    container.appendChild(angleRow.container)
    container.appendChild(velRow.container)
    container.appendChild(launchBtn)
    container.appendChild(feedbackEl)
    container.appendChild(resultArea)

    function startRound() {
      round++
      attempts = 0
      bestError = Infinity
      bestScore = 0
      feedbackEl.textContent = ""
      launchBtn.style.display = ""

      channel.push("projectile_get_target", {}).receive("ok", (data) => {
        targetX = data.target_x
        statsEl.textContent = `Round ${round}/${TOTAL_ROUNDS} | Target: ${targetX}m (\u2248 ${(targetX / Math.PI).toFixed(0)}\u03C0) | Attempts: ${attempts}/${MAX_ATTEMPTS}`
        drawScene()
      })
    }

    function drawScene(trail) {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
      grad.addColorStop(0, "#0a0a2e")
      grad.addColorStop(1, "#1a1040")
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Ground
      ctx.fillStyle = "#1a3a1a"
      ctx.fillRect(0, CANVAS_H - 20, CANVAS_W, 20)

      // Grid markers
      ctx.font = "9px monospace"
      ctx.fillStyle = "#555"
      ctx.textAlign = "center"
      for (let m = 20; m <= 120; m += 20) {
        const px = m * SCALE
        if (px < CANVAS_W) {
          ctx.fillText(`${m}m`, px, CANVAS_H - 5)
          ctx.strokeStyle = "rgba(255,255,255,0.05)"
          ctx.beginPath()
          ctx.moveTo(px, 0)
          ctx.lineTo(px, CANVAS_H - 20)
          ctx.stroke()
        }
      }

      // Target
      if (targetX > 0) {
        const tx = targetX * SCALE
        ctx.fillStyle = "#ef4444"
        ctx.fillRect(tx - 3, CANVAS_H - 35, 6, 15)
        // Flag
        ctx.fillStyle = "#ef4444"
        ctx.beginPath()
        ctx.moveTo(tx + 3, CANVAS_H - 35)
        ctx.lineTo(tx + 18, CANVAS_H - 28)
        ctx.lineTo(tx + 3, CANVAS_H - 21)
        ctx.fill()
        // Label
        ctx.font = "10px monospace"
        ctx.fillStyle = "#ef4444"
        ctx.textAlign = "center"
        ctx.fillText(`${targetX}m`, tx, CANVAS_H - 40)
      }

      // Launcher
      const launchX = 15
      const launchY = CANVAS_H - 20
      ctx.save()
      ctx.translate(launchX, launchY)
      ctx.rotate(-angle * Math.PI / 180)
      ctx.fillStyle = "#06b6d4"
      ctx.fillRect(0, -3, 20, 6)
      ctx.restore()
      ctx.beginPath()
      ctx.arc(launchX, launchY, 6, 0, Math.PI * 2)
      ctx.fillStyle = "#06b6d4"
      ctx.fill()

      // Trajectory preview (dotted)
      ctx.setLineDash([3, 4])
      ctx.strokeStyle = "rgba(6, 182, 212, 0.3)"
      ctx.beginPath()
      const vx = velocity * Math.cos(angle * Math.PI / 180)
      const vy = velocity * Math.sin(angle * Math.PI / 180)
      for (let t = 0; t < 8; t += 0.1) {
        const px = launchX + vx * t * SCALE
        const py = launchY - (vy * t - 0.5 * GRAVITY * t * t) * SCALE
        if (t === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
        if (py > launchY) break
      }
      ctx.stroke()
      ctx.setLineDash([])

      // Draw trails from previous attempts
      if (trail) {
        ctx.strokeStyle = "rgba(139, 92, 246, 0.6)"
        ctx.lineWidth = 2
        ctx.beginPath()
        trail.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        })
        ctx.stroke()
        ctx.lineWidth = 1

        // Impact point
        const last = trail[trail.length - 1]
        ctx.beginPath()
        ctx.arc(last.x, last.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = "#8b5cf6"
        ctx.fill()
      }
    }

    function launch() {
      if (animating || attempts >= MAX_ATTEMPTS) return
      animating = true
      attempts++
      if (window.SoundFX) window.SoundFX.dart()

      const launchX = 15
      const launchY = CANVAS_H - 20
      const vx = velocity * Math.cos(angle * Math.PI / 180)
      const vy = velocity * Math.sin(angle * Math.PI / 180)

      const trail = []
      let t = 0
      const dt = 0.03

      function animate() {
        t += dt
        const px = launchX + vx * t * SCALE
        const py = launchY - (vy * t - 0.5 * GRAVITY * t * t) * SCALE
        trail.push({ x: px, y: py })

        drawScene(trail)

        // Draw projectile
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fillStyle = "#f59e0b"
        ctx.fill()
        ctx.strokeStyle = "#fff"
        ctx.lineWidth = 1
        ctx.stroke()

        if (py < launchY && px < CANVAS_W) {
          requestAnimationFrame(animate)
        } else {
          // Landed
          animating = false
          const landingM = (px - launchX) / SCALE
          const error = Math.abs(landingM - targetX)
          const pts = Math.max(0, Math.round(500 - error * 50))

          if (error < bestError) {
            bestError = error
            bestScore = pts
          }

          statsEl.textContent = `Round ${round}/${TOTAL_ROUNDS} | Target: ${targetX}m | Attempts: ${attempts}/${MAX_ATTEMPTS} | Landing: ${landingM.toFixed(1)}m`

          if (error < 1) {
            feedbackEl.style.color = "#22c55e"
            feedbackEl.textContent = `Bullseye! ${landingM.toFixed(1)}m (error: ${error.toFixed(2)}m) +${pts}pts`
            if (window.SoundFX) window.SoundFX.milestone()
          } else if (error < 5) {
            feedbackEl.style.color = "#f59e0b"
            feedbackEl.textContent = `Close! ${landingM.toFixed(1)}m (error: ${error.toFixed(2)}m) +${pts}pts`
            if (window.SoundFX) window.SoundFX.correct()
          } else {
            feedbackEl.style.color = "#ef4444"
            feedbackEl.textContent = `${landingM.toFixed(1)}m — ${error.toFixed(1)}m off! +${pts}pts`
            if (window.SoundFX) window.SoundFX.wrong()
          }

          if (attempts >= MAX_ATTEMPTS) {
            totalScore += bestScore
            setTimeout(() => {
              if (round >= TOTAL_ROUNDS) {
                endGame()
              } else {
                feedbackEl.textContent += ` | Best this round: ${bestScore}pts. Next round...`
                setTimeout(startRound, 1500)
              }
            }, 1000)
          }
        }
      }

      requestAnimationFrame(animate)
    }

    function endGame() {
      launchBtn.style.display = "none"

      channel.push("projectile_submit", {
        score: totalScore,
        target_x: targetX,
        best_error: parseFloat(bestError.toFixed(2))
      }).receive("ok", () => {
        if (window.SoundFX) window.SoundFX.score()

        while (resultArea.firstChild) resultArea.removeChild(resultArea.firstChild)

        const result = document.createElement("div")
        result.style.cssText = "font-size: 1.5rem; color: #22d3ee; margin-bottom: 0.5rem;"
        result.textContent = `Total Score: ${totalScore}`

        const playAgain = document.createElement("button")
        playAgain.className = "mg-btn"
        playAgain.textContent = "Play Again"
        playAgain.addEventListener("click", () => ProjectileGame.start(container, channel))

        const close = document.createElement("button")
        close.className = "mg-btn secondary"
        close.textContent = "Back to Hub"
        close.addEventListener("click", () => window.piStation.closeMiniGame())

        resultArea.appendChild(result)
        resultArea.appendChild(playAgain)
        resultArea.appendChild(close)
      })
    }

    channel.on("projectile_score", ({ name, score: s }) => {
      if (name === window.PLAYER_NAME) return
      const el = document.createElement("div")
      el.style.cssText = "color: #22d3ee; font-size: 0.8rem; margin-top: 0.25rem;"
      el.textContent = `${name} scored ${s} points!`
      resultArea.appendChild(el)
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el) }, 5000)
    })

    startRound()
  }
}

function createSlider(label, min, max, initial, unit, onChange) {
  const container = document.createElement("div")
  container.style.cssText = "display:flex;align-items:center;gap:0.75rem;margin:0.4rem auto;max-width:400px;color:white;"

  const labelEl = document.createElement("span")
  labelEl.style.cssText = "width:60px;font-size:0.85rem;text-align:right;"
  labelEl.textContent = label

  const slider = document.createElement("input")
  slider.type = "range"
  slider.min = min
  slider.max = max
  slider.value = initial
  slider.style.cssText = "flex:1;accent-color:#8b5cf6;height:24px;"

  const valueEl = document.createElement("span")
  valueEl.style.cssText = "width:65px;font-size:0.9rem;color:#22d3ee;font-weight:bold;"
  valueEl.textContent = `${initial}${unit}`

  slider.addEventListener("input", () => {
    const v = parseInt(slider.value)
    valueEl.textContent = `${v}${unit}`
    onChange(v)
  })

  container.appendChild(labelEl)
  container.appendChild(slider)
  container.appendChild(valueEl)

  return { container, slider, valueEl }
}
