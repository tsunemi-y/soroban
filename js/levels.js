// 級ごとの難易度設定
// digits: 1問あたりの各項の桁数
// terms:  1問あたりの項数(口数)
// flashInterval: フラッシュ暗算で1項を表示する時間(ms) — 表示:非表示 = 7:3
// speechRate: よみあげ暗算での読み上げ速度(SpeechSynthesisUtterance.rate)
// speechPause: よみあげ暗算での項と項の間の無音時間(ms)
// allowSubtract: ひき算を混ぜるか
const LEVELS = {
  5: { name: '5級', digits: 1, terms: 5, flashInterval: 1300, speechRate: 0.8, speechPause: 600, allowSubtract: false },
  4: { name: '4級', digits: 1, terms: 6, flashInterval: 1100, speechRate: 0.9, speechPause: 500, allowSubtract: false },
  3: { name: '3級', digits: 2, terms: 7, flashInterval: 950, speechRate: 1.0, speechPause: 450, allowSubtract: true },
  2: { name: '2級', digits: 2, terms: 8, flashInterval: 800, speechRate: 1.1, speechPause: 350, allowSubtract: true },
  1: { name: '1級', digits: 3, terms: 9, flashInterval: 650, speechRate: 1.25, speechPause: 250, allowSubtract: true },
};

const LEVEL_ORDER = [5, 4, 3, 2, 1];
