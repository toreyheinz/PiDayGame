const ROUND_TIME = 10 // seconds per question
const TOTAL_QUESTIONS = 10

export const SliceThePiGame = {
  start(container, channel) {
    while (container.firstChild) container.removeChild(container.firstChild)

    let score = 0
    let streak = 0
    let correctCount = 0
    let questionNum = 0
    let timerInterval = null
    let questionStartTime = null
    let answering = false

    // Build UI
    const title = document.createElement("div")
    title.className = "mg-title"
    title.textContent = "Slice the Pi"

    const subtitle = document.createElement("div")
    subtitle.className = "mg-subtitle"
    subtitle.textContent = "Answer circle math questions! Speed matters!"

    const timerEl = document.createElement("div")
    timerEl.className = "slice-timer"
    timerEl.textContent = ROUND_TIME

    const progressEl = document.createElement("div")
    progressEl.style.cssText = "color: #a78bfa; font-size: 0.9rem; margin: 0.25rem 0;"
    progressEl.textContent = `Question 0 / ${TOTAL_QUESTIONS}`

    const scoreEl = document.createElement("div")
    scoreEl.className = "slice-score-display"
    scoreEl.textContent = `Score: 0 | Streak: 0`

    const questionEl = document.createElement("div")
    questionEl.className = "slice-question"

    const choicesEl = document.createElement("div")
    choicesEl.className = "slice-choices"

    const feedbackEl = document.createElement("div")
    feedbackEl.style.cssText = "min-height: 2rem; margin: 0.5rem 0; font-size: 1rem;"

    const resultArea = document.createElement("div")
    resultArea.style.cssText = "margin-top: 1rem;"

    container.appendChild(title)
    container.appendChild(subtitle)
    container.appendChild(timerEl)
    container.appendChild(progressEl)
    container.appendChild(scoreEl)
    container.appendChild(questionEl)
    container.appendChild(choicesEl)
    container.appendChild(feedbackEl)
    container.appendChild(resultArea)

    function nextQuestion() {
      if (questionNum >= TOTAL_QUESTIONS) {
        endGame()
        return
      }

      answering = true
      questionNum++
      progressEl.textContent = `Question ${questionNum} / ${TOTAL_QUESTIONS}`
      feedbackEl.textContent = ""

      channel.push("slice_get_problem", {})
        .receive("ok", (problem) => {
          questionEl.textContent = problem.question
          questionStartTime = Date.now()

          // Clear choices
          while (choicesEl.firstChild) choicesEl.removeChild(choicesEl.firstChild)

          problem.choices.forEach(choice => {
            const btn = document.createElement("button")
            btn.className = "slice-choice"
            btn.textContent = choice
            btn.addEventListener("click", () => handleAnswer(choice, problem.answer, btn))
            choicesEl.appendChild(btn)
          })

          // Start timer
          let timeLeft = ROUND_TIME
          timerEl.textContent = timeLeft
          timerEl.style.color = "#22d3ee"

          if (timerInterval) clearInterval(timerInterval)
          timerInterval = setInterval(() => {
            timeLeft--
            timerEl.textContent = timeLeft

            if (timeLeft <= 3) timerEl.style.color = "#ef4444"
            else if (timeLeft <= 5) timerEl.style.color = "#f59e0b"

            if (timeLeft <= 0) {
              clearInterval(timerInterval)
              handleTimeout()
            }
          }, 1000)
        })
    }

    function handleAnswer(chosen, correct, btnEl) {
      if (!answering) return
      answering = false
      clearInterval(timerInterval)

      const timeMs = Date.now() - questionStartTime
      const isCorrect = Math.abs(chosen - correct) < 0.01

      // Highlight choices
      const buttons = choicesEl.querySelectorAll("button")
      buttons.forEach(btn => {
        const val = parseFloat(btn.textContent)
        if (Math.abs(val - correct) < 0.01) {
          btn.className = "slice-choice correct"
        } else if (btn === btnEl && !isCorrect) {
          btn.className = "slice-choice wrong"
        }
        btn.style.pointerEvents = "none"
      })

      if (isCorrect) {
        streak++
        correctCount++
      } else {
        streak = 0
      }

      channel.push("slice_answer", {
        correct: isCorrect,
        time_ms: timeMs,
        streak: streak
      }).receive("ok", ({ points }) => {
        score += points
        scoreEl.textContent = `Score: ${score} | Streak: ${streak}`

        if (isCorrect) {
          feedbackEl.style.color = "#22c55e"
          feedbackEl.textContent = `Correct! +${points} points (${(timeMs / 1000).toFixed(1)}s)`
        } else {
          feedbackEl.style.color = "#ef4444"
          feedbackEl.textContent = "Wrong!"
        }

        setTimeout(nextQuestion, 1500)
      })
    }

    function handleTimeout() {
      answering = false
      streak = 0
      feedbackEl.style.color = "#ef4444"
      feedbackEl.textContent = "Time's up!"
      scoreEl.textContent = `Score: ${score} | Streak: ${streak}`

      // Show correct answer
      const buttons = choicesEl.querySelectorAll("button")
      buttons.forEach(btn => {
        btn.style.pointerEvents = "none"
      })

      channel.push("slice_answer", { correct: false, time_ms: ROUND_TIME * 1000, streak: 0 })

      setTimeout(nextQuestion, 1500)
    }

    function endGame() {
      clearInterval(timerInterval)
      questionEl.textContent = ""
      while (choicesEl.firstChild) choicesEl.removeChild(choicesEl.firstChild)
      timerEl.textContent = ""

      channel.push("slice_game_over", {
        score: score,
        correct: correctCount,
        total: TOTAL_QUESTIONS
      }).receive("ok", () => {
        while (resultArea.firstChild) resultArea.removeChild(resultArea.firstChild)

        const result = document.createElement("div")
        result.style.cssText = "font-size: 1.5rem; color: #22d3ee; margin-bottom: 0.5rem;"
        result.textContent = `Final Score: ${score}`

        const details = document.createElement("div")
        details.style.cssText = "color: #a78bfa; margin-bottom: 1rem;"
        details.textContent = `${correctCount} / ${TOTAL_QUESTIONS} correct`

        const playAgain = document.createElement("button")
        playAgain.className = "mg-btn"
        playAgain.textContent = "Play Again"
        playAgain.addEventListener("click", () => SliceThePiGame.start(container, channel))

        const close = document.createElement("button")
        close.className = "mg-btn secondary"
        close.textContent = "Back to Hub"
        close.addEventListener("click", () => window.piStation.closeMiniGame())

        resultArea.appendChild(result)
        resultArea.appendChild(details)
        resultArea.appendChild(playAgain)
        resultArea.appendChild(close)
      })
    }

    // Listen for others' activity
    channel.on("slice_correct", ({ name, streak: s }) => {
      const announcement = document.createElement("div")
      announcement.style.cssText = "color: #a78bfa; font-size: 0.75rem;"
      announcement.textContent = `${name} got one right! (streak: ${s})`
      feedbackEl.appendChild(announcement)
      setTimeout(() => { if (announcement.parentNode) announcement.parentNode.removeChild(announcement) }, 3000)
    })

    channel.on("slice_score", ({ name, score: s }) => {
      const announcement = document.createElement("div")
      announcement.style.cssText = "color: #22d3ee; font-size: 0.8rem; margin-top: 0.25rem;"
      announcement.textContent = `${name} finished with ${s} points!`
      resultArea.appendChild(announcement)
      setTimeout(() => { if (announcement.parentNode) announcement.parentNode.removeChild(announcement) }, 5000)
    })

    // Start!
    nextQuestion()
  }
}
