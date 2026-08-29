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

  // 周波数がなめらかに上がっていくサウンド(ガチャの「たまり」演出用)
  function sweep(startFreq, endFreq, duration, type = 'sawtooth', gain = 0.1, delay = 0) {
    try {
      const audioCtx = getCtx();
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      const startAt = audioCtx.currentTime + delay;
      osc.frequency.setValueAtTime(startFreq, startAt);
      osc.frequency.exponentialRampToValueAtTime(endFreq, startAt + duration);
      g.gain.value = gain;
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start(startAt);
      g.gain.setValueAtTime(gain, startAt);
      g.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
      osc.stop(startAt + duration);
    } catch (e) {
      // 音声が使えない環境は無視
    }
  }

  // ホワイトノイズの「ドン」という開封インパクト音用のバッファ(1回だけ作って使い回す)
  let noiseBuffer = null;
  function getNoiseBuffer(audioCtx) {
    if (!noiseBuffer) {
      const size = audioCtx.sampleRate * 0.35;
      noiseBuffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  function impact(duration, gain, cutoffFreq, delay = 0) {
    try {
      const audioCtx = getCtx();
      const src = audioCtx.createBufferSource();
      src.buffer = getNoiseBuffer(audioCtx);
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoffFreq;
      const g = audioCtx.createGain();
      src.connect(filter);
      filter.connect(g);
      g.connect(audioCtx.destination);
      const startAt = audioCtx.currentTime + delay;
      g.gain.setValueAtTime(gain, startAt);
      g.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
      src.start(startAt);
      src.stop(startAt + duration);
    } catch (e) {
      // 音声が使えない環境は無視
    }
  }

  // レアリティ(common〜legendary)ぶんの演出パラメータ。数字が大きいほど派手になる
  const RARITY_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const BURST_NOTES = [
    [659],
    [523, 784],
    [523, 659, 784, 988],
    [440, 554, 659, 880, 1109],
    [392, 494, 587, 740, 988, 1245, 1568],
  ];

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
    // ごほうびパックの「たまり」演出音。レアリティが高いほど長く高く上がっていく
    packCharge(rarity) {
      const idx = Math.max(0, RARITY_TIERS.indexOf(rarity));
      const t = idx / (RARITY_TIERS.length - 1);
      const duration = 0.25 + t * 0.85;
      sweep(180, 180 + t * 620, duration, 'sawtooth', 0.05 + t * 0.05);
    },
    // ごほうびパックの開封音。レアリティが高いほど和音が増えて豪華になる
    packBurst(rarity) {
      const idx = Math.max(0, RARITY_TIERS.indexOf(rarity));
      impact(0.3 + idx * 0.08, 0.18 + idx * 0.04, 1400 - idx * 150);
      BURST_NOTES[idx].forEach((freq, i) => beep(freq, 0.22, 'square', 0.15, 0.08 + i * 0.07));
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
  // 「ねがいましては」→ 1口目「◯円なり」→ 直前と同じ演算が続く間は「◯円なり」
  // → 引き算に変わる時だけ「引いては」、足し算に戻る時だけ「加えて」と先に宣言し、
  //   そこから次に宣言があるまでの数字はすべてその演算で計算する
  // → 最後は「◯円では」で締める
  //
  // 「引いては/加えて」は、それが かかる数字の"前"に言う。
  // (数字の後に言うと、聞き手はその数字を直前の演算で計算してしまい、
  //  演算が1口ずれて答えが合わなくなる)
  async function speakProblem(terms, rate, pauseMs, isCancelled) {
    window.speechSynthesis && window.speechSynthesis.cancel();

    await speakOne('ねがいましては', rate);
    if (isCancelled()) return;
    await sleep(pauseMs);

    const opGapMs = Math.min(250, pauseMs);

    for (let i = 0; i < terms.length; i++) {
      if (isCancelled()) return;
      const t = terms[i];
      const isLast = i === terms.length - 1;
      const opChanged = i > 0 && terms[i - 1].op !== t.op;

      if (opChanged) {
        await speakOne(t.op === '-' ? '引いては' : '加えて', rate);
        if (isCancelled()) return;
        await sleep(opGapMs);
        if (isCancelled()) return;
      }
      await speakOne(isLast ? `${t.value}円では` : `${t.value}円なり`, rate);
      if (isCancelled()) return;
      if (!isLast) await sleep(pauseMs);
    }
  }

  function cancel() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  return { isSupported, speakProblem, cancel };
})();
