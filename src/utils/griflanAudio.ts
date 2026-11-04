// Procedural Web Audio Engine for Griflan Labs UI
// 100% native Web Audio API — 0 external audio files, 0 latency

let audioCtx: AudioContext | null = null;
let soundEnabled = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isAudioEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return soundEnabled;
}

export function toggleAudio(forcedState?: boolean): boolean {
  if (typeof window === "undefined") return false;
  soundEnabled = forcedState !== undefined ? forcedState : !soundEnabled;
  if (soundEnabled) {
    const ctx = getAudioContext();
    if (ctx) {
      // Play brief audible confirmation chime
      playTone(523.25, 0.08, "sine", 0.04);
      setTimeout(() => playTone(659.25, 0.12, "sine", 0.05), 60);
    }
  }
  return soundEnabled;
}

export function playTone(
  freq: number,
  durationSec = 0.05,
  type: OscillatorType = "sine",
  volume = 0.04
) {
  if (!soundEnabled || typeof window === "undefined") return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  } catch {
    // AudioContext silenced or not allowed yet
  }
}

export function playHoverSound() {
  if (!soundEnabled) return;
  playTone(1050, 0.025, "sine", 0.02);
}

export function playClickSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  } catch {
    // AudioContext silenced
  }
}

export function playPulseSound() {
  if (!soundEnabled) return;
  playTone(220, 0.15, "sine", 0.03);
}
