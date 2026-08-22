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

  // Chrome系ブラウザは音声合成が続くとおよそ15秒で自動的に無音停止してしまう
  // 既知のバグがあるため、しゃべっている間は定期的にpause/resumeして止まらないようにする
  function startKeepAlive() {
    if (!window.speechSynthesis) return null;
    return setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 5000);
  }

  // 読み上げ算の伝統的な言い回しで読み上げる
  // 「ねがいましては」→ 1口目「◯円なり」→ 直前と同じ演算が続く間は「◯円なり」
  // → 足し算から引き算に変わった瞬間だけ「◯円引いては」、引き算から足し算に戻った瞬間だけ「◯円加えて」
  // → 最後は「◯円では」で締める
  async function speakProblem(terms, rate, pauseMs, isCancelled) {
    window.speechSynthesis && window.speechSynthesis.cancel();
    const keepAliveId = startKeepAlive();

    try {
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
          // 演算が切り替わる時は、「◯円なり」で数字を確定してから、少し間を空けて「引いては/加えて」
          // (最後の項でも、切り替わったことは必ずアナウンスする。そうしないと
          //  聞いた数字と実際の答えが合わなくなってしまう)
          await speakOne(`${t.value}円なり`, rate);
          if (isCancelled()) return;
          await sleep(opGapMs);
          if (isCancelled()) return;
          await speakOne(t.op === '-' ? '引いては' : '加えて', rate);
        } else {
          const text = isLast ? `${t.value}円では` : `${t.value}円なり`;
          await speakOne(text, rate);
        }
        if (isCancelled()) return;
        if (!isLast) await sleep(pauseMs);
      }
    } finally {
      if (keepAliveId) clearInterval(keepAliveId);
    }
  }

  function cancel() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  return { isSupported, speakProblem, cancel };
})();
