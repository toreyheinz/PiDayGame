// Synthesized sound effects using Web Audio API — no files needed
let audioCtx = null

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

function resumeAudio() {
  const ctx = getCtx()
  if (ctx.state === "suspended") ctx.resume()
}

// Unlock audio on first touch/click
document.addEventListener("touchstart", resumeAudio, { once: true })
document.addEventListener("click", resumeAudio, { once: true })

function playTone(freq, duration, type = "sine", volume = 0.15) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

export const SoundFX = {
  // Correct answer / digit — rising happy tone
  correct() {
    playTone(523, 0.1, "sine", 0.12)
    setTimeout(() => playTone(659, 0.1, "sine", 0.12), 60)
    setTimeout(() => playTone(784, 0.15, "sine", 0.1), 120)
  },

  // Wrong answer — descending sad tone
  wrong() {
    playTone(330, 0.15, "square", 0.08)
    setTimeout(() => playTone(262, 0.25, "square", 0.06), 100)
  },

  // Button tap — short click
  tap() {
    playTone(880, 0.04, "sine", 0.08)
  },

  // Score recorded — achievement chime
  score() {
    playTone(523, 0.1, "sine", 0.12)
    setTimeout(() => playTone(659, 0.1, "sine", 0.12), 100)
    setTimeout(() => playTone(784, 0.1, "sine", 0.12), 200)
    setTimeout(() => playTone(1047, 0.3, "sine", 0.1), 300)
  },

  // Game start — countdown beep
  countdown() {
    playTone(440, 0.1, "sine", 0.1)
  },

  // Milestone — big achievement
  milestone() {
    const notes = [523, 659, 784, 1047, 784, 1047]
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.12, "sine", 0.1), i * 80)
    })
  },

  // Chat message received
  chat() {
    playTone(1200, 0.05, "sine", 0.06)
    setTimeout(() => playTone(1500, 0.05, "sine", 0.05), 40)
  },

  // Player joined
  join() {
    playTone(440, 0.08, "triangle", 0.08)
    setTimeout(() => playTone(554, 0.08, "triangle", 0.08), 80)
    setTimeout(() => playTone(659, 0.12, "triangle", 0.07), 160)
  },

  // Dart throw
  dart() {
    const ctx = getCtx()
    const bufferSize = ctx.sampleRate * 0.05
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    }
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.06, ctx.currentTime)
    noise.connect(gain)
    gain.connect(ctx.destination)
    noise.start()
  },

  // Timer tick (last 3 seconds)
  tick() {
    playTone(1000, 0.05, "square", 0.06)
  },
}
