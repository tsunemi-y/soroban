// 級ごとの難易度設定(モードごとに桁数・口数・速さが異なる)
// flash:   { digits, terms, flashInterval } … フラッシュ暗算用
//          digits: 1問あたりの各項の桁数(配列の場合はその中からランダムに選ばれる)
//          terms:  1問あたりの項数(口数)
//          flashInterval: 1項を表示する時間(ms) — 表示:非表示 = 7:3
//          そろばん教室の実際の級位表(2桁固定・級ごとの口数と制限時間)を再現している
// yomiage: { digits, terms, speechRate, speechPause } … よみあげ暗算用
// allowSubtract: ひき算を混ぜるか(モード共通)
// passScore: この問題数以上正解で合格
// sessionPlan: 通常の10問固定を上書きし、{blocks, shuffle}で出題構成をカスタムする
const LEVELS = {
  6: {
    name: '6級', allowSubtract: true, passScore: 7,
    flash: { digits: 2, terms: 3, flashInterval: 2000 },      // 2ケタ/3口/6秒
    // よみあげ暗算では6級は用意していない(フラッシュ暗算のみ)
  },
  5: {
    name: '5級', allowSubtract: true, passScore: 7,
    flash: { digits: 2, terms: 4, flashInterval: 1750 },     // 2ケタ/4口/7秒
    yomiage: { digits: [1, 2], terms: 7, speechRate: 0.8, speechPause: 600 },
  },
  4: {
    name: '4級', allowSubtract: true, passScore: 7,
    flash: { digits: 2, terms: 5, flashInterval: 1500 },     // 2ケタ/5口/7.5秒
    yomiage: { digits: 2, terms: 7, speechRate: 0.9, speechPause: 500 },
  },
  3: {
    name: '3級', allowSubtract: true, passScore: 7,
    flash: { digits: 2, terms: 10, flashInterval: 1500 },    // 2ケタ/10口/15秒
    yomiage: { digits: 2, terms: 10, speechRate: 1.0, speechPause: 450 },
    sessionPlan: {
      blocks: [
        { count: 5, allowSubtract: false }, // 加算のみ5問
        { count: 5, allowSubtract: true },  // 加減算5問
      ],
      shuffle: true, // 加算・加減算をランダムに混ぜて出題する
    },
  },
  2: {
    name: '2級', allowSubtract: true, passScore: 8,
    flash: { digits: 2, terms: 10, flashInterval: 1000 },    // 2ケタ/10口/10秒
    yomiage: { digits: [2, 3], terms: 10, speechRate: 1.1, speechPause: 350 },
  },
  1: {
    name: '1級', allowSubtract: true, passScore: 8,
    flash: { digits: 2, terms: 10, flashInterval: 800 },     // 2ケタ/10口/8秒
    yomiage: { digits: [3, 4], terms: 10, speechRate: 1.25, speechPause: 250 },
  },
};

// モードによって選べる級が異なる(6級はフラッシュ暗算のみ)
const LEVEL_ORDER_BY_MODE = {
  flash: [6, 5, 4, 3, 2, 1],
  yomiage: [5, 4, 3, 2, 1],
};
