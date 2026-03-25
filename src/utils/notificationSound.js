// Default notification sounds generated with Web Audio API
const SOUND_PRESETS = {
  default: {
    name: 'Standart',
    play: (ctx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(830, ctx.currentTime)
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
      osc.type = 'sine'
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02)
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    }
  },
  chime: {
    name: 'Zəng',
    play: (ctx) => {
      const freqs = [523, 659, 784]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        const start = ctx.currentTime + i * 0.12
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(0.25, start + 0.02)
        gain.gain.linearRampToValueAtTime(0, start + 0.25)
        osc.start(start)
        osc.stop(start + 0.25)
      })
    }
  },
  bell: {
    name: 'Zınqırov',
    play: (ctx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 1200
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.6)
    }
  },
  pop: {
    name: 'Pop',
    play: (ctx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(600, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15)
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.35, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    }
  },
  ding: {
    name: 'Ding',
    play: (ctx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 988
      osc.type = 'triangle'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.8)
    }
  },
  double: {
    name: 'İkili',
    play: (ctx) => {
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        osc.type = 'sine'
        const start = ctx.currentTime + i * 0.18
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(0.25, start + 0.02)
        gain.gain.linearRampToValueAtTime(0, start + 0.12)
        osc.start(start)
        osc.stop(start + 0.12)
      }
    }
  },
}

// Cache for current settings from backend
let cachedSoundType = 'default'
let cachedCustomSoundUrl = null

let audioContext = null

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

// Called by Settings component when it fetches settings from backend
export const syncSoundSettings = (soundType, customSoundUrl) => {
  cachedSoundType = soundType || 'default'
  cachedCustomSoundUrl = customSoundUrl || null
}

export const getSoundPresets = () => {
  return Object.entries(SOUND_PRESETS).map(([id, preset]) => ({
    id,
    name: preset.name,
  }))
}

export const playSound = (soundId, customUrl) => {
  try {
    const id = soundId || cachedSoundType || 'default'

    if (id === 'custom') {
      const url = customUrl || cachedCustomSoundUrl
      if (url) {
        const audio = new Audio(url)
        audio.volume = 0.5
        audio.play().catch(() => {})
      }
      return
    }

    const preset = SOUND_PRESETS[id]
    if (preset) {
      const ctx = getAudioContext()
      preset.play(ctx)
    }
  } catch (error) {
    console.log('Could not play notification sound:', error)
  }
}

export const playNotificationSound = () => {
  playSound(cachedSoundType, cachedCustomSoundUrl)
}
