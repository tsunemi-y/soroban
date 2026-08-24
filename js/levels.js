// 級ごとの難易度設定(モードごとに桁数・口数・速さが異なる)
// flash:   { digits, terms, flashInterval } … フラッシュ暗算用
//          digits: 1問あたりの各項の桁数(配列の場合はその中からランダムに選ばれる)
//          terms:  1問あたりの項数(口数)
//          flashInterval: 1項を表示する時間(ms) — 表示:非表示 = 7:3
//          そろばん教室の実際の級位表(2桁固定・級ごとの口数と制限時間)を再現している
// yomiage: { digits, terms, speechRate, speechPause } … よみあげ暗算用
// soroban: { timerMode, sections, passRate, timeLimitSec } … そろばんモード
//          (実際にそろばんで計算し、答えだけ入力する)用。日本商工会議所 珠算能力検定試験の
//          実際の問題形式(見取り算10問+かけ算20問+わり算20問、300点満点)を踏襲している
//          timerMode: 'perSection' … 種目ごとに別々に時間を測り、全種目が個別にpassRate以上で合格
//                     'combined'   … 全種目まとめて1つの制限時間(timeLimitSec)で測り、
//                                    全種目の合計得点がpassRate以上で合格(全級で採用)
//          sections: 出題する種目の配列。kind別に必要なフィールドが異なる
//            見取り算(mitori): { kind:'mitori', label, digits, terms, count, timeLimitSec(perSectionのみ) }
//            かけ算(kake):     { kind:'kake', label, totalDigits, decimalEnabled, count, timeLimitSec(perSectionのみ) }
//                              totalDigits: 2つの項の桁数の合計(実際の検定と同じ配分ルール)
//            わり算(wari):     { kind:'wari', label, totalDigits, decimalEnabled, count, timeLimitSec(perSectionのみ) }
//                              totalDigits: わる数の桁数+商の桁数の合計
//          passRate: 合格に必要な得点率
//          timeLimitSec: combinedモードでの全種目共通の制限時間
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
      timerMode: 'combined',
      timeLimitSec: 1800,
      passRate: 0.8,
      sections: [
        { kind: 'mitori', label: '見取り算', digits: 4, terms: 10, count: 10 },
        { kind: 'kake', label: 'かけ算', totalDigits: 6, decimalEnabled: false, count: 20 },
        { kind: 'wari', label: 'わり算', totalDigits: 5, decimalEnabled: false, count: 20 },
      ],
    },
  },
  4: {
    name: '4級', allowSubtract: true, passScore: 7,
    flash: { digits: 2, terms: 5, flashInterval: 1500 },     // 2ケタ/5口/7.5秒
    yomiage: { digits: 2, terms: 7, speechRate: 0.9, speechPause: 500 },
    soroban: {
      timerMode: 'combined',
      timeLimitSec: 1800,
      passRate: 0.8,
      sections: [
        { kind: 'mitori', label: '見取り算', digits: 5, terms: 10, count: 10 },
        { kind: 'kake', label: 'かけ算', totalDigits: 7, decimalEnabled: false, count: 20 },
        { kind: 'wari', label: 'わり算', totalDigits: 6, decimalEnabled: false, count: 20 },
      ],
    },
  },
  // 準級(準3級・準2級・準1級)はそろばんモード専用の中間級(4級と3級の間、3級と2級の間、
  // 2級と1級の間に位置する)。フラッシュ暗算・よみあげ暗算では使わない
  jun3: {
    name: '準3級',
    soroban: {
      timerMode: 'combined',
      timeLimitSec: 1800,
      passRate: 0.8,
      sections: [
        { kind: 'mitori', label: '見取り算', digits: 5, terms: 10, count: 10 },
        { kind: 'kake', label: 'かけ算', totalDigits: 7, decimalEnabled: true, count: 20 },
        { kind: 'wari', label: 'わり算', totalDigits: 6, decimalEnabled: true, count: 20 },
      ],
    },
  },
  3: {
    name: '3級', allowSubtract: true, passScore: 7,
    flash: { digits: 2, terms: 10, flashInterval: 1500 },    // 2ケタ/10口/15秒
    yomiage: { digits: 2, terms: 10, speechRate: 1.0, speechPause: 450 },
    soroban: {
      timerMode: 'combined',
      timeLimitSec: 1800,
      passRate: 0.8,
      sections: [
        { kind: 'mitori', label: '見取り算', digits: 6, terms: 10, count: 10 },
        { kind: 'kake', label: 'かけ算', totalDigits: 7, decimalEnabled: true, count: 20 },
        { kind: 'wari', label: 'わり算', totalDigits: 6, decimalEnabled: true, count: 20 },
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
  jun2: {
    name: '準2級',
    soroban: {
      timerMode: 'combined',
      timeLimitSec: 1800,
      passRate: 0.8,
      sections: [
        { kind: 'mitori', label: '見取り算', digits: 7, terms: 10, count: 10 },
        { kind: 'kake', label: 'かけ算', totalDigits: 8, decimalEnabled: true, count: 20 },
        { kind: 'wari', label: 'わり算', totalDigits: 7, decimalEnabled: true, count: 20 },
      ],
    },
  },
  2: {
    name: '2級', allowSubtract: true, passScore: 8,
    flash: { digits: 2, terms: 10, flashInterval: 1000 },    // 2ケタ/10口/10秒
    yomiage: { digits: [2, 3], terms: 10, speechRate: 1.1, speechPause: 350 },
    soroban: {
      timerMode: 'combined',
      timeLimitSec: 1800,
      passRate: 0.8,
      sections: [
        { kind: 'mitori', label: '見取り算', digits: 8, terms: 10, count: 10 },
        { kind: 'kake', label: 'かけ算', totalDigits: 9, decimalEnabled: true, count: 20 },
        { kind: 'wari', label: 'わり算', totalDigits: 8, decimalEnabled: true, count: 20 },
      ],
    },
  },
  jun1: {
    name: '準1級',
    soroban: {
      timerMode: 'combined',
      timeLimitSec: 1800,
      passRate: 0.8,
      sections: [
        { kind: 'mitori', label: '見取り算', digits: 9, terms: 10, count: 10 },
        { kind: 'kake', label: 'かけ算', totalDigits: 10, decimalEnabled: true, count: 20 },
        { kind: 'wari', label: 'わり算', totalDigits: 9, decimalEnabled: true, count: 20 },
      ],
    },
  },
  1: {
    name: '1級', allowSubtract: true, passScore: 8,
    flash: { digits: 2, terms: 10, flashInterval: 800 },     // 2ケタ/10口/8秒
    yomiage: { digits: [3, 4], terms: 10, speechRate: 1.25, speechPause: 250 },
    soroban: {
      timerMode: 'combined',
      timeLimitSec: 1800,
      passRate: 0.8,
      sections: [
        { kind: 'mitori', label: '見取り算', digits: 10, terms: 10, count: 10 },
        { kind: 'kake', label: 'かけ算', totalDigits: 11, decimalEnabled: true, count: 20 },
        { kind: 'wari', label: 'わり算', totalDigits: 10, decimalEnabled: true, count: 20 },
      ],
    },
  },
};

// モードによって選べる級が異なる(6級はフラッシュ暗算のみ、そろばんモードは5級から。
// 準級は4級と3級・3級と2級・2級と1級の間にはさまる中間級で、そろばんモードのみに存在する)
const LEVEL_ORDER_BY_MODE = {
  flash: [6, 5, 4, 3, 2, 1],
  yomiage: [5, 4, 3, 2, 1],
  soroban: [5, 4, 'jun3', 3, 'jun2', 2, 'jun1', 1],
};
