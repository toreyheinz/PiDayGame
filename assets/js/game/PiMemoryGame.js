// Pi digits after the "3."
const PI_DIGITS = "14159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798214808651328230664709384460955058223172535940812848111745028410270193852110555964462294895493038196"

export const PiMemoryGame = {
  start(container, channel) {
    // Clear container safely
    while (container.firstChild) container.removeChild(container.firstChild)

    let position = 0
    let gameOver = false
    let startTime = null

    // Build UI
    const title = document.createElement("div")
    title.className = "mg-title"
    title.textContent = "Pi Memory Sprint"

    const subtitle = document.createElement("div")
    subtitle.className = "mg-subtitle"
    subtitle.textContent = "Type the digits of Pi: 3."

    const display = document.createElement("div")
    display.className = "pi-display"
    display.textContent = "3."

    const scoreDisplay = document.createElement("div")
    scoreDisplay.style.cssText = "font-size: 1.2rem; color: #a78bfa; margin: 0.5rem 0;"
    scoreDisplay.textContent = "Digits: 0"

    const raceContainer = document.createElement("div")
    raceContainer.style.cssText = "margin: 0.5rem 0; min-height: 2rem;"
    raceContainer.id = "pi-race"

    const numpad = document.createElement("div")
    numpad.className = "pi-numpad"

    const resultArea = document.createElement("div")
    resultArea.style.cssText = "margin: 1rem 0; min-height: 3rem;"

    container.appendChild(title)
    container.appendChild(subtitle)
    container.appendChild(display)
    container.appendChild(scoreDisplay)
    container.appendChild(raceContainer)
    container.appendChild(numpad)
    container.appendChild(resultArea)

    // Create numpad buttons
    for (let i = 1; i <= 9; i++) {
      const btn = document.createElement("button")
      btn.textContent = String(i)
      btn.addEventListener("click", () => handleDigit(String(i)))
      numpad.appendChild(btn)
    }
    const zeroBtn = document.createElement("button")
    zeroBtn.className = "zero"
    zeroBtn.textContent = "0"
    zeroBtn.addEventListener("click", () => handleDigit("0"))
    numpad.appendChild(zeroBtn)

    function handleDigit(digit) {
      if (gameOver) return
      if (!startTime) startTime = Date.now()

      const expected = PI_DIGITS[position]

      if (digit === expected) {
        position++
        display.textContent = "3." + PI_DIGITS.substring(0, position)
        scoreDisplay.textContent = `Digits: ${position}`

        // Scroll display to show latest digits
        display.scrollLeft = display.scrollWidth

        channel.push("pi_check_digit", { position: position - 1, digit })

        // Milestone celebrations
        if (position === 10 || position === 25 || position === 50 || position === 100) {
          const milestone = document.createElement("div")
          milestone.style.cssText = "color: #22d3ee; font-size: 1.5rem; animation: pulse 0.5s;"
          milestone.textContent = `${position} digits!`
          resultArea.appendChild(milestone)
          setTimeout(() => { if (milestone.parentNode) milestone.parentNode.removeChild(milestone) }, 2000)
        }
      } else {
        // Wrong digit — game over
        gameOver = true
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

        numpad.style.opacity = "0.3"
        numpad.style.pointerEvents = "none"

        const wrongIndicator = document.createElement("span")
        wrongIndicator.style.cssText = "color: #ef4444; text-decoration: line-through;"
        wrongIndicator.textContent = digit
        display.appendChild(wrongIndicator)

        const correctIndicator = document.createElement("span")
        correctIndicator.style.cssText = "color: #22c55e;"
        correctIndicator.textContent = ` (${expected})`
        display.appendChild(correctIndicator)

        // Submit score
        channel.push("pi_game_over", { score: position })
          .receive("ok", () => {
            while (resultArea.firstChild) resultArea.removeChild(resultArea.firstChild)

            const result = document.createElement("div")
            result.style.cssText = "color: #22d3ee; font-size: 1.5rem; margin-bottom: 0.5rem;"
            result.textContent = `${position} digits in ${elapsed}s!`
            resultArea.appendChild(result)

            const playAgain = document.createElement("button")
            playAgain.className = "mg-btn"
            playAgain.textContent = "Play Again"
            playAgain.addEventListener("click", () => PiMemoryGame.start(container, channel))
            resultArea.appendChild(playAgain)

            const close = document.createElement("button")
            close.className = "mg-btn secondary"
            close.textContent = "Back to Hub"
            close.addEventListener("click", () => window.piStation.closeMiniGame())
            resultArea.appendChild(close)
          })
      }
    }

    // Listen for other players' progress
    channel.on("pi_progress", ({ name, position: pos }) => {
      updateRace(name, pos, raceContainer)
    })

    channel.on("pi_score", ({ name, score }) => {
      const announcement = document.createElement("div")
      announcement.style.cssText = "color: #a78bfa; font-size: 0.8rem; margin-top: 0.25rem;"
      announcement.textContent = `${name} got ${score} digits!`
      raceContainer.appendChild(announcement)
      setTimeout(() => { if (announcement.parentNode) announcement.parentNode.removeChild(announcement) }, 5000)
    })

    // Keyboard support
    function keyHandler(e) {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key)
      }
    }
    document.addEventListener("keydown", keyHandler)

    // Cleanup on close
    const origClose = window.piStation.closeMiniGame
    window.piStation.closeMiniGame = function() {
      document.removeEventListener("keydown", keyHandler)
      channel.off("pi_progress")
      channel.off("pi_score")
      window.piStation.closeMiniGame = origClose
      origClose()
    }
  }
}

function updateRace(name, position, raceContainer) {
  let entry = raceContainer.querySelector(`[data-player="${CSS.escape(name)}"]`)
  if (!entry) {
    entry = document.createElement("div")
    entry.setAttribute("data-player", name)
    entry.style.cssText = "display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:#e2e8f0;margin:0.15rem 0;"
    raceContainer.appendChild(entry)
  }

  // Clear and rebuild entry
  while (entry.firstChild) entry.removeChild(entry.firstChild)

  const nameSpan = document.createElement("span")
  nameSpan.style.cssText = "width:60px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
  nameSpan.textContent = name

  const barOuter = document.createElement("div")
  barOuter.style.cssText = "flex:1;height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;"

  const barInner = document.createElement("div")
  const width = Math.min(position, 100)
  barInner.style.cssText = `height:100%;background:linear-gradient(90deg,#06b6d4,#8b5cf6);border-radius:4px;width:${width}%;transition:width 0.3s;`

  barOuter.appendChild(barInner)

  const posSpan = document.createElement("span")
  posSpan.style.cssText = "color:#22d3ee;min-width:2rem;"
  posSpan.textContent = position

  entry.appendChild(nameSpan)
  entry.appendChild(barOuter)
  entry.appendChild(posSpan)
}
