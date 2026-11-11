type Sfx = "ok" | "bad" | "combo" | "bloom" | "win";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let muted = false;
let musicOn = false;
let raf = 0;
let nextNote = 0;
let step = 0;

const PENTA = [62, 64, 66, 69, 71, 74, 76, 78];
const PATTERN = [0, 2, 4, 7, 4, 2, -1, 4, 7, 9, 7, 4, -1, 2, 0, 4];

function midi(note: number) {
  return 440 * 2 ** ((note - 69) / 12);
}

function ensure() {
  if (ctx || typeof window === "undefined") return;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  ctx = new Ctx({ latencyHint: "interactive" });
  master = ctx.createGain();
  musicBus = ctx.createGain();
  sfxBus = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  musicBus.gain.value = 0.16;
  sfxBus.gain.value = 0.4;
  musicBus.connect(master);
  sfxBus.connect(master);
  master.connect(ctx.destination);
  const padA = ctx.createOscillator();
  const padB = ctx.createOscillator();
  const padGain = ctx.createGain();
  padA.type = "sine";
  padB.type = "sine";
  padA.frequency.value = midi(38);
  padB.frequency.value = midi(45);
  padGain.gain.value = 0.045;
  padA.connect(padGain);
  padB.connect(padGain);
  padGain.connect(musicBus);
  padA.start();
  padB.start();
}

function tone(freq: number, dur: number, type: OscillatorType, when: number, peak: number, dest: GainNode) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), when + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(when);
  osc.stop(when + dur + 0.03);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

function scheduleMusic() {
  if (!ctx || !musicBus || !musicOn) return;
  const now = ctx.currentTime;
  if (nextNote < now) nextNote = now + 0.05;
  while (nextNote < now + 0.28) {
    const degree = PATTERN[step % PATTERN.length] ?? -1;
    if (degree >= 0) {
      const note = PENTA[degree % PENTA.length] ?? 62;
      tone(midi(note), 0.42, "triangle", nextNote, 0.08, musicBus);
    }
    step += 1;
    nextNote += 0.34;
  }
  raf = requestAnimationFrame(scheduleMusic);
}

function startMusic() {
  if (!ctx || musicOn || muted) return;
  musicOn = true;
  nextNote = ctx.currentTime + 0.05;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(scheduleMusic);
}

export const audio = {
  setMuted(next: boolean) {
    muted = next;
    if (!ctx || !master) return;
    master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.03);
    if (!next) startMusic();
    if (next) {
      musicOn = false;
      cancelAnimationFrame(raf);
    }
  },
  unlock() {
    ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    startMusic();
  },
  resume() {
    if (ctx && ctx.state === "suspended") void ctx.resume();
    if (!muted && ctx && !musicOn) startMusic();
  },
  sfx(kind: Sfx) {
    if (!ctx || !sfxBus || muted) return;
    const now = ctx.currentTime;
    if (kind === "ok") {
      tone(659.25, 0.16, "sine", now, 0.22, sfxBus);
      tone(880, 0.2, "sine", now + 0.07, 0.16, sfxBus);
    } else if (kind === "bad") {
      tone(146.8, 0.18, "triangle", now, 0.16, sfxBus);
    } else if (kind === "combo") {
      tone(740, 0.12, "sine", now, 0.16, sfxBus);
      tone(988, 0.16, "sine", now + 0.06, 0.14, sfxBus);
      tone(1174, 0.2, "sine", now + 0.12, 0.12, sfxBus);
    } else if (kind === "bloom") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
        tone(freq, 0.22, "sine", now + index * 0.06, 0.14, sfxBus!);
      });
    } else {
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
        tone(freq, 0.34, "triangle", now + index * 0.09, 0.16, sfxBus!);
      });
    }
  },
};
