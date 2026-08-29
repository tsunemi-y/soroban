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
// yomiageSoroban: { digits, terms, speechRate, speechPause, allowSubtract? } … よみあげそろばん用
//          (数字を耳で聞いて、実際のそろばんで計算する。答えの入力はよみあげ暗算と同じく
//          1問ごとにキーパッドで行う)。allowSubtractを指定すると、その形状だけ
//          level.allowSubtractを上書きできる(5級の「加算のみ」に使用)
// allowSubtract: ひき算を混ぜるか(モード共通のデフォルト。各モードのshapeで上書き可能)
// passScore: この問題数以上正解で合格(フラッシュ・よみあげ用)
// sessionPlan: 通常の10問固定を上書きし、{blocks, shuffle}で出題構成をカスタムする

// digits配列を[min, min+1, ..., max]で組み立てる小さなヘルパー
function digitRange(min, max) {
  const arr = [];
  for (let d = min; d <= max; d++) arr.push(d);
  return arr;
}

const LEVELS = {
  7: {
    name: '7級', allowSubtract: true, passScore: 7,
    flash: { digits: 1, terms: 10, flashInterval: 1000 },     // 1ケタ/10口/10秒
    // よみあげ暗算・そろばんモードでは7級は用意していない(フラッシュ暗算のみ)
  },
  6: {
    name: '6級', allowSubtract: true, passScore: 7,
    flash: { digits: 2, terms: 3, flashInterval: 2000 },      // 2ケタ/3口/6秒
    yomiage: { digits: 1, terms: 7, speechRate: 0.7, speechPause: 700 },  // 1ケタ/7口の加減算
    yomiageSoroban: { digits: 3, terms: 5, speechRate: 0.75, speechPause: 750 },  // 3ケタのみ/5口の加減算
    // そろばんモードでは6級は用意していない
  },
  5: {
    name: '5級', allowSubtract: true, passScore: 7,
    flash: { digits: 2, terms: 4, flashInterval: 1750 },     // 2ケタ/4口/7秒
    yomiage: { digits: [1, 2], terms: 7, speechRate: 0.8, speechPause: 600 },
    // よみあげそろばんの5級だけ「加算のみ」(allowSubtract: false)にする
    yomiageSoroban: { digits: digitRange(3, 4), terms: 10, allowSubtract: false, speechRate: 0.85, speechPause: 650 },
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
    yomiageSoroban: { digits: digitRange(3, 5), terms: 10, speechRate: 0.95, speechPause: 550 },
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
    yomiageSoroban: { digits: digitRange(3, 6), terms: 10, speechRate: 1.05, speechPause: 480 },
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
    yomiageSoroban: { digits: digitRange(4, 8), terms: 10, speechRate: 1.15, speechPause: 400 },
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
    yomiageSoroban: { digits: digitRange(5, 10), terms: 10, speechRate: 1.25, speechPause: 320 },
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
  // 段位(初段〜5段)はフラッシュ暗算のみ、1級よりさらに上のむずかしさ
  // (そろばん教室の実際の段位表(2ndステージ)を再現している)
  dan1: {
    name: '初段', allowSubtract: true, passScore: 8,
    flash: { digits: 3, terms: 5, flashInterval: 1000 },      // 3ケタ/5口/5秒
  },
  dan2: {
    name: '2段', allowSubtract: true, passScore: 8,
    flash: { digits: 3, terms: 5, flashInterval: 800 },       // 3ケタ/5口/4秒
  },
  dan3: {
    name: '3段', allowSubtract: true, passScore: 8,
    flash: { digits: 3, terms: 10, flashInterval: 800 },      // 3ケタ/10口/8秒
  },
  dan4: {
    name: '4段', allowSubtract: true, passScore: 8,
    flash: { digits: 3, terms: 10, flashInterval: 700 },      // 3ケタ/10口/7秒
  },
  dan5: {
    name: '5段', allowSubtract: true, passScore: 8,
    flash: { digits: 3, terms: 10, flashInterval: 600 },      // 3ケタ/10口/6秒
  },
};

// モードによって選べる級が異なる(7級・6級はフラッシュ暗算のみ、そろばんモードは5級から。
// 準級は4級と3級・3級と2級・2級と1級の間にはさまる中間級で、そろばんモードのみに存在する。
// 段位(初段〜5段)は1級よりさらに上のむずかしさで、フラッシュ暗算のみに存在する)
const LEVEL_ORDER_BY_MODE = {
  flash: [7, 6, 5, 4, 3, 2, 1, 'dan1', 'dan2', 'dan3', 'dan4', 'dan5'],
  yomiage: [6, 5, 4, 3, 2, 1],
  yomiageSoroban: [6, 5, 4, 3, 2, 1],
  soroban: [5, 4, 'jun3', 3, 'jun2', 2, 'jun1', 1],
  // ドライブモードは級・難易度をよみあげ暗算とまったく同じにする(LEVELS[key].yomiageを流用する)
  drive: [6, 5, 4, 3, 2, 1],
};
