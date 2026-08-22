// 級ごとの難易度設定
// digits: 1問あたりの各項の桁数(配列の場合はその中からランダムに選ばれる)
// terms:  1問あたりの項数(口数)
// flashInterval: フラッシュ暗算で1項を表示する時間(ms) — 表示:非表示 = 7:3
// speechRate: よみあげ暗算での読み上げ速度(SpeechSynthesisUtterance.rate)
// speechPause: よみあげ暗算での項と項の間の無音時間(ms)
// allowSubtract: ひき算を混ぜるか
// passScore: この問題数以上正解で合格
// sessionPlan: 通常の10問固定を上書きし、{blocks, shuffle}で出題構成をカスタムする
const LEVELS = {
  4: { name: '4級', digits: 2, terms: 7, flashInterval: 1050, speechRate: 0.9, speechPause: 500, allowSubtract: true, passScore: 7 },
  3: {
    name: '3級', digits: 2, terms: 10, flashInterval: 950, speechRate: 1.0, speechPause: 450, allowSubtract: true,
    passScore: 7,
    sessionPlan: {
      blocks: [
        { count: 5, allowSubtract: false }, // 加算のみ5問
        { count: 5, allowSubtract: true },  // 加減算5問
      ],
      shuffle: true, // 加算・加減算をランダムに混ぜて出題する
    },
  },
  2: { name: '2級', digits: [2, 3], terms: 10, flashInterval: 800, speechRate: 1.1, speechPause: 350, allowSubtract: true, passScore: 8 },
  1: { name: '1級', digits: [3, 4], terms: 10, flashInterval: 650, speechRate: 1.25, speechPause: 250, allowSubtract: true, passScore: 8 },
};

const LEVEL_ORDER = [4, 3, 2, 1];
