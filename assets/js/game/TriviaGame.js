const TOTAL_QUESTIONS = 10
const ROUND_TIME = 15

export const TriviaGame = {
  start(container, channel) {
    while (container.firstChild) container.removeChild(container.firstChild)

    let score = 0
    let streak = 0
    let correctCount = 0
    let questionNum = 0
    let timerInterval = null
    let questionStartTime = null
    let answering = false

    const title = document.createElement("div")
    title.className = "mg-title"
    title.textContent = "Pi Trivia Blitz"

    const subtitle = document.createElement("div")
    subtitle.className = "mg-subtitle"
    subtitle.textContent = "Math, science & Pi history! Speed gives bonus points."

    const timerEl = document.createElement("div")
    timerEl.className = "slice-timer"

    const progressEl = document.createElement("div")
    progressEl.style.cssText = "color: #a78bfa; font-size: 0.9rem; margin: 0.25rem 0;"

    const scoreEl = document.createElement("div")
    scoreEl.className = "slice-score-display"
    scoreEl.textContent = "Score: 0 | Streak: 0"

    const questionEl = document.createElement("div")
    questionEl.className = "slice-question"
    questionEl.style.fontSize = "1.1rem"
    questionEl.style.minHeight = "3rem"

    const choicesEl = document.createElement("div")
    choicesEl.style.cssText = "display:grid;grid-template-columns:1fr;gap:0.5rem;max-width:450px;margin:0.75rem auto;"

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
      if (questionNum >= TOTAL_QUESTIONS) { endGame(); return }

      answering = true
      questionNum++
      progressEl.textContent = `Question ${questionNum} / ${TOTAL_QUESTIONS}`
      feedbackEl.textContent = ""

      channel.push("trivia_get_question", {}).receive("ok", (problem) => {
        questionEl.textContent = problem.question
        questionStartTime = Date.now()

        while (choicesEl.firstChild) choicesEl.removeChild(choicesEl.firstChild)

        problem.choices.forEach(choice => {
          const btn = document.createElement("button")
          btn.className = "slice-choice"
          btn.style.cssText = "padding:0.75rem 1rem;font-size:1rem;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:0.75rem;color:white;cursor:pointer;text-align:left;-webkit-tap-highlight-color:transparent;"
          btn.textContent = choice
          btn.addEventListener("click", () => handleAnswer(choice, problem.answer, btn))
          choicesEl.appendChild(btn)
        })

        let timeLeft = ROUND_TIME
        timerEl.textContent = timeLeft
        timerEl.style.color = "#22d3ee"

        if (timerInterval) clearInterval(timerInterval)
        timerInterval = setInterval(() => {
          timeLeft--
          timerEl.textContent = timeLeft
          if (timeLeft <= 3) {
            timerEl.style.color = "#ef4444"
            if (window.SoundFX) window.SoundFX.tick()
          } else if (timeLeft <= 5) {
            timerEl.style.color = "#f59e0b"
          }
          if (timeLeft <= 0) { clearInterval(timerInterval); handleTimeout(problem.answer) }
        }, 1000)
      })
    }

    function handleAnswer(chosen, correct, btnEl) {
      if (!answering) return
      answering = false
      clearInterval(timerInterval)

      const timeMs = Date.now() - questionStartTime
      const isCorrect = chosen === correct

      const buttons = choicesEl.querySelectorAll("button")
      buttons.forEach(btn => {
        if (btn.textContent === correct) {
          btn.style.background = "rgba(34, 197, 94, 0.4)"
          btn.style.borderColor = "#22c55e"
        } else if (btn === btnEl && !isCorrect) {
          btn.style.background = "rgba(239, 68, 68, 0.4)"
          btn.style.borderColor = "#ef4444"
        }
        btn.style.pointerEvents = "none"
      })

      if (isCorrect) {
        streak++
        correctCount++
        if (window.SoundFX) window.SoundFX.correct()
      } else {
        streak = 0
        if (window.SoundFX) window.SoundFX.wrong()
      }

      channel.push("trivia_answer", { correct: isCorrect, time_ms: timeMs, streak }).receive("ok", ({ points }) => {
        score += points
        scoreEl.textContent = `Score: ${score} | Streak: ${streak}`
        if (isCorrect) {
          feedbackEl.style.color = "#22c55e"
          feedbackEl.textContent = `Correct! +${points} pts (${(timeMs / 1000).toFixed(1)}s)`
        } else {
          feedbackEl.style.color = "#ef4444"
          feedbackEl.textContent = `Wrong! Answer: ${correct}`
        }
        setTimeout(nextQuestion, 2000)
      })
    }

    function handleTimeout(correct) {
      answering = false
      streak = 0
      if (window.SoundFX) window.SoundFX.wrong()
      feedbackEl.style.color = "#ef4444"
      feedbackEl.textContent = `Time's up! Answer: ${correct}`
      scoreEl.textContent = `Score: ${score} | Streak: ${streak}`

      const buttons = choicesEl.querySelectorAll("button")
      buttons.forEach(btn => {
        if (btn.textContent === correct) {
          btn.style.background = "rgba(34, 197, 94, 0.4)"
          btn.style.borderColor = "#22c55e"
        }
        btn.style.pointerEvents = "none"
      })

      channel.push("trivia_answer", { correct: false, time_ms: ROUND_TIME * 1000, streak: 0 })
      setTimeout(nextQuestion, 2000)
    }

    function endGame() {
      clearInterval(timerInterval)
      questionEl.textContent = ""
      while (choicesEl.firstChild) choicesEl.removeChild(choicesEl.firstChild)
      timerEl.textContent = ""

      if (window.SoundFX) window.SoundFX.score()

      channel.push("trivia_game_over", { score, correct: correctCount, total: TOTAL_QUESTIONS }).receive("ok", () => {
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
        playAgain.addEventListener("click", () => TriviaGame.start(container, channel))

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

    channel.on("trivia_correct", ({ name, streak: s }) => {
      if (name === window.PLAYER_NAME) return
      const el = document.createElement("div")
      el.style.cssText = "color: #a78bfa; font-size: 0.75rem;"
      el.textContent = `${name} got one right! (streak: ${s})`
      feedbackEl.appendChild(el)
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el) }, 3000)
    })

    channel.on("trivia_score", ({ name, score: s }) => {
      const el = document.createElement("div")
      el.style.cssText = "color: #22d3ee; font-size: 0.8rem; margin-top: 0.25rem;"
      el.textContent = `${name} finished with ${s} points!`
      resultArea.appendChild(el)
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el) }, 5000)
    })

    nextQuestion()
  }
}
