"use client";

// 효과음 — 오디오 파일 없이 WebAudio 로 즉석 합성한다(용량 0, 로딩 0).
// 종이 부스럭 = 노이즈 + 밴드패스, 공개 = 짧은 2음, 완료 = 4음 아르페지오.

let ctx: AudioContext | null = null;
let muted = false;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(value: boolean) {
  muted = value;
}

function tone(freq: number, at: number, dur: number, gain = 0.16, type: OscillatorType = "sine") {
  const c = audio();
  if (!c) return;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + at);
  env.gain.setValueAtTime(0.0001, c.currentTime + at);
  env.gain.exponentialRampToValueAtTime(gain, c.currentTime + at + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
  osc.connect(env).connect(c.destination);
  osc.start(c.currentTime + at);
  osc.stop(c.currentTime + at + dur + 0.02);
}

/** 통을 뒤적이는 소리 — 짧은 노이즈 버스트 여러 번. */
export function playRustle(duration = 0.7) {
  if (muted) return;
  const c = audio();
  if (!c) return;
  const frames = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    // 부스럭거림: 백색잡음에 불규칙한 진폭 요철을 준다
    const wobble = 0.35 + 0.65 * Math.abs(Math.sin(i / (420 + (i % 130))));
    data[i] = (Math.random() * 2 - 1) * wobble;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2600;
  band.Q.value = 0.9;
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, c.currentTime);
  env.gain.exponentialRampToValueAtTime(0.09, c.currentTime + 0.08);
  env.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  src.connect(band).connect(env).connect(c.destination);
  src.start();
}

/** 제비를 펼쳐 조가 공개되는 순간. */
export function playReveal() {
  if (muted) return;
  tone(660, 0, 0.16, 0.14, "triangle");
  tone(990, 0.07, 0.28, 0.12, "triangle");
}

/** 전원 배정 완료. */
export function playFanfare() {
  if (muted) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.34, 0.11, "triangle"));
}

/** 버튼 톡. */
export function playTick() {
  if (muted) return;
  tone(420, 0, 0.06, 0.07, "square");
}
