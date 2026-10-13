/** All audio is synthesized locally. No context exists until a user gesture. */
export function createAudio() {
  let context;
  let master;
  let noise;
  let muted = false;
  let paused = true;
  let footsteps = 0;
  const ambient = [];

  const output = () => {
    if (!context || !master) return;
    master.gain.setTargetAtTime(muted || paused ? 0 : 0.24, context.currentTime, 0.035);
  };

  const tone = (frequency, duration, volume = 0.1, type = 'sine', endFrequency = frequency, delay = 0) => {
    if (!context || context.state !== 'running' || muted || paused) return;
    const at = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), at + duration);
    gain.gain.setValueAtTime(0.001, at);
    gain.gain.linearRampToValueAtTime(volume, at + Math.min(0.009, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  };

  const burst = (duration, volume = 0.15, frequency = 1800) => {
    if (!context || context.state !== 'running' || muted || paused) return;
    const at = context.currentTime;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noise;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    source.connect(filter).connect(gain).connect(master);
    source.start(at, Math.random() * Math.max(0, noise.duration - duration));
    source.stop(at + duration + 0.02);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  };

  return {
    async unlock() {
      try {
        if (!context) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) return;
          context = new AudioContextClass();
          master = context.createGain();
          master.gain.value = 0;
          master.connect(context.destination);
          noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
          const data = noise.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
          for (const frequency of [55, 82.41]) {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            gain.gain.value = 0.015;
            oscillator.connect(gain).connect(master);
            oscillator.start();
            ambient.push({ oscillator, gain });
          }
        }
        if (context.state === 'suspended') await context.resume();
        output();
      } catch {
        // Browsers without an available audio output still get a playable game.
      }
    },
    setMuted(value) { muted = Boolean(value); output(); },
    setPaused(value) { paused = Boolean(value); footsteps = 0; output(); },
    play(events) {
      for (const event of events) {
        switch (event.type) {
          case 'attack': burst(0.085, 0.09, 2700); tone(220, 0.1, 0.07, 'triangle', 65); break;
          case 'hit': burst(0.08, 0.2, 4000); tone(100, 0.11, 0.26, 'triangle', 34); break;
          case 'damage': burst(0.13, 0.13, 1100); tone(82, 0.25, 0.14, 'sawtooth', 40); break;
          case 'kill': tone(165, 0.15, 0.1, 'triangle', 55); burst(0.16, 0.1, 700); break;
          case 'jump': tone(130, 0.11, 0.045, 'triangle', 260); break;
          case 'land': burst(0.07, 0.065, 550); break;
          case 'roll': burst(0.12, 0.055, 900); break;
          case 'heal': case 'upgrade':
            [220, 261.63, 329.63].forEach((frequency, index) => tone(frequency, 0.3, 0.065, 'sine', frequency, index * 0.075));
            break;
          case 'pickup': tone(660, 0.12, 0.055, 'sine', 880); break;
          case 'boss': tone(55, 0.7, 0.2, 'triangle', 41); break;
          case 'complete': [220, 329.63, 440, 659.25].forEach((frequency, index) => tone(frequency, 0.55, 0.07, 'sine', frequency, index * 0.13)); break;
          default: break;
        }
      }
    },
    update(game, dt) {
      const player = game.player;
      if (paused || !player.grounded || Math.abs(player.vx) < 40 || player.rollTime > 0) { footsteps = 0; return; }
      footsteps -= dt;
      if (footsteps <= 0) { burst(0.035, 0.035, 380); footsteps = 0.17; }
    },
    get muted() { return muted; },
    async destroy() {
      for (const { oscillator, gain } of ambient) { oscillator.stop(); oscillator.disconnect(); gain.disconnect(); }
      ambient.length = 0;
      if (context && context.state !== 'closed') await context.close();
      context = undefined;
    },
  };
}
