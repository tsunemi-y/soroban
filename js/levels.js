// 級ごとの難易度設定(モードごとに桁数・口数・速さが異なる)
// flash:   { digits, terms, flashInterval } … フラッシュ暗算用
//          digits: 1問あたりの各項の桁数(配列の場合はその中からランダムに選ばれる)
//          terms:  1問あたりの項数(口数)
//          flashInterval: 1項を表示する時間(ms) — 表示:非表示 = 7:3
//          そろばん教室の実際の級位表(2桁固定・級ごとの口数と制限時間)を再現している
// yomiage: { digits, terms, speechRate, speechPause } … よみあげ暗算用
// soroban: { sections, passRate } … そろばんモード(実際にそろばんで計算し、答えだけ入力する)用
//          sections: 出題する種目の配列。kind別に必要なフィールドが異なる
//            見取り算(mitori): { kind:'mitori', label, digits, terms, count, timeLimitSec }
//            かけ算(kake):     { kind:'kake', label, digitsA, digitsB, count, timeLimitSec }
//            わり算(wari):     { kind:'wari', label, divisorDigits, quotientDigits, count, timeLimitSec }
//          passRate: 各種目でこの正答率以上なら合格(全種目クリアでその級に合格)
// allowSubtract: ひき算を混ぜるか(モード共通)
// passScore: この問題数以上正解で合格(フラッシュ・よみあげ用)
// sessionPlan: 通常の10問固定を上書きし、{blocks, shuffle}で出題構成をカスタムする
const LEVELS = {
  6: {
    name: '6級', allowSubtract: true, passScore: 7,
    flash: { digits: 2, terms: 3, flashInterval: 2000 },      // 2ケタ/3口/6秒
    // よみあげ暗算・そろばんモードでは6級は用意していない(フラッシュ暗算のみ)
  },
  5: {
    name: '5級', allowSubtract: true, passScore: 7,
    flash: { digits: 2, terms: 4, flashInterval: 1750 },     // 2ケタ/4口/7秒
    yomiage: { digits: [1, 2], terms: 7, speechRate: 0.8, speechPause: 600 },
    soroban: {
      passRate: 0.7,
      sections: [
        { kind: 'mitori', label: '見取り算', digits: 2, terms: 5, count: 10, timeLimitSec: 600 },
        { kind: 'kake', label: 'かけ算', digitsA: 2, digitsB: 1, count: 10, timeLimitSec: 600 },
        { kind: 'wari', label: 'わり算', divisorDigits: 1, quotientDigits: 2, count: 10, timeLimitSec: 600 },
      ],
    },
  },
  4: {
    name: '4級', allowSubtract: true, passScore: 7,
    flash: { digits: 2, terms: 5, flashInterval: 1500 },     // 2ケタ/5口/7.5秒
    yomiage: { digits: 2, terms: 7, speechRate: 0.9, speechPause: 500 },
    soroban: {
      passRate: 0.7,
      sections: [
        { kind: 'mitori', label: '見取り算', digits: 2, terms: 6, count: 10, timeLimitSec: 600 },
        { kind: 'kake', label: 'かけ算', digitsA: 2, digitsB: 2, count: 10, timeLimitSec: 600 },
        { kind: 'wari', label: 'わり算', divisorDigits: 1, quotientDigits: 3, count: 10, timeLimitSec: 600 },
      ],
    },
  },
  3: {
    name: '3級', allowSubtract: true, passScore: 7,
    flash: { digits: 2, terms: 10, flashInterval: 1500 },    // 2ケタ/10口/15秒
    yomiage: { digits: 2, terms: 10, speechRate: 1.0, speechPause: 450 },
    soroban: {
      passRate: 0.8,
      sections: [
        { kind: 'mitori', label: '見取り算', digits: 2, terms: 10, count: 15, timeLimitSec: 1800 },
      ],
    },
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
    soroban: {
      passRate: 0.8,
      sections: [
        { kind: 'mitori', label: '見取り算', digits: 3, terms: 10, count: 15, timeLimitSec: 1800 },
      ],
    },
  },
  1: {
    name: '1級', allowSubtract: true, passScore: 8,
    flash: { digits: 2, terms: 10, flashInterval: 800 },     // 2ケタ/10口/8秒
    yomiage: { digits: [3, 4], terms: 10, speechRate: 1.25, speechPause: 250 },
    soroban: {
      passRate: 0.8,
      sections: [
        { kind: 'mitori', label: '見取り算', digits: 4, terms: 10, count: 15, timeLimitSec: 1800 },
      ],
    },
  },
};

// モードによって選べる級が異なる(6級はフラッシュ暗算のみ、そろばんモードは5級から)
const LEVEL_ORDER_BY_MODE = {
  flash: [6, 5, 4, 3, 2, 1],
  yomiage: [5, 4, 3, 2, 1],
  soroban: [5, 4, 3, 2, 1],
};
