// 効果音(WebAudioで生成、外部ファイル不要) & よみあげ暗算の音声合成

const SoundFX = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    return ctx;
  }

  function beep(freq, duration, type = 'square', gain = 0.15, delay = 0) {
    try {
      const audioCtx = getCtx();
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g);
      g.connect(audioCtx.destination);
      const startAt = audioCtx.currentTime + delay;
      osc.start(startAt);
      g.gain.setValueAtTime(gain, startAt);
      g.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
      osc.stop(startAt + duration);
    } catch (e) {
      // 音声が使えない環境は無視
    }
  }

  return {
    click() { beep(520, 0.06, 'square', 0.1); },
    correct() {
      beep(660, 0.09, 'square', 0.15, 0);
      beep(880, 0.09, 'square', 0.15, 0.09);
      beep(1320, 0.16, 'square', 0.15, 0.18);
    },
    wrong() {
      beep(220, 0.18, 'sawtooth', 0.15, 0);
      beep(160, 0.22, 'sawtooth', 0.15, 0.12);
    },
    tick() { beep(400, 0.05, 'square', 0.08); },
    start() {
      beep(440, 0.08, 'square', 0.12, 0);
      beep(660, 0.12, 'square', 0.12, 0.1);
    },
  };
})();

const SpeechEngine = (() => {
  let voice = null;
  let voicesReady = false;

  function pickVoice() {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    voice = voices.find(v => v.lang === 'ja-JP') || voices.find(v => v.lang && v.lang.startsWith('ja')) || null;
    voicesReady = true;
  }

  if (window.speechSynthesis) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  function isSupported() {
    return !!window.speechSynthesis;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function speakOne(text, rate) {
    return new Promise(resolve => {
      if (!window.speechSynthesis) { resolve(); return; }
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ja-JP';
      if (voice) utter.voice = voice;
      utter.rate = rate;
      utter.onend = resolve;
      utter.onerror = resolve;
      window.speechSynthesis.speak(utter);
    });
  }

  // 読み上げ算の伝統的な言い回しで読み上げる
  // 「ねがいましては」→ 1口目「◯円なり」→ 加算は基本「◯円なり」(引き算の直後だけ「◯円加えて」)
  // → 引き算は毎回「◯円引いては」→ 最後「◯円では」→「おいくらでしょう」
  async function speakProblem(terms, rate, pauseMs, isCancelled) {
    window.speechSynthesis && window.speechSynthesis.cancel();

    await speakOne('ねがいましては', rate);
    if (isCancelled()) return;
    await sleep(pauseMs);

    for (let i = 0; i < terms.length; i++) {
      if (isCancelled()) return;
      const t = terms[i];
      const isLast = i === terms.length - 1;
      const prevWasSubtract = i > 0 && terms[i - 1].op === '-';
      let text;
      if (isLast) text = `${t.value}円では`;
      else if (t.op === '-') text = `${t.value}円引いては`;
      else if (prevWasSubtract) text = `${t.value}円加えて`;
      else text = `${t.value}円なり`;

      await speakOne(text, rate);
      if (isCancelled()) return;
      await sleep(pauseMs);
    }
    if (isCancelled()) return;
    await speakOne('おいくらでしょう', rate);
  }

  function cancel() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  return { isSupported, speakProblem, cancel };
})();
