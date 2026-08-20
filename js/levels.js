// 級ごとの難易度設定
// digits: 1問あたりの各項の桁数(配列の場合はその中からランダムに選ばれる)
// terms:  1問あたりの項数(口数)
// flashInterval: フラッシュ暗算で1項を表示する時間(ms) — 表示:非表示 = 7:3
// speechRate: よみあげ暗算での読み上げ速度(SpeechSynthesisUtterance.rate)
// speechPause: よみあげ暗算での項と項の間の無音時間(ms)
// allowSubtract: ひき算を混ぜるか
// sessionPlan: 通常の10問固定を上書きし、{count, allowSubtract}のブロックを順に出題する
const LEVELS = {
  3: {
    name: '3級', digits: 2, terms: 7, flashInterval: 950, speechRate: 1.0, speechPause: 450, allowSubtract: true,
    sessionPlan: [
      { count: 3, allowSubtract: false }, // 加算のみ3問
      { count: 3, allowSubtract: true },  // 加減算3問
    ],
  },
  2: { name: '2級', digits: [2, 3], terms: 10, flashInterval: 800, speechRate: 1.1, speechPause: 350, allowSubtract: true },
  1: { name: '1級', digits: 3, terms: 9, flashInterval: 650, speechRate: 1.25, speechPause: 250, allowSubtract: true },
};

const LEVEL_ORDER = [3, 2, 1];
