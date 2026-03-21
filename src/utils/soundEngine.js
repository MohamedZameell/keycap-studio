let audioCtx = null

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioCtx
}

export function playKeycapSound(material = 'abs') {
  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    filter.type = 'lowpass'

    if (material === 'pbt') {
      // Deep thock: low freq, longer decay
      filter.frequency.value = 800
      osc.frequency.setValueAtTime(160, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.18, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14)
    } else {
      // ABS clack: higher freq, faster decay
      filter.frequency.value = 3000
      osc.frequency.setValueAtTime(300, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.06)
      gain.gain.setValueAtTime(0.14, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09)
    }

    osc.type = 'sine'
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.18)
  } catch (e) {
    // Audio context unavailable, fail silently
  }
}
