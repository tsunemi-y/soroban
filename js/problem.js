// 問題生成ロジック

function randDigitsValue(digits) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// digitsConfigは固定の桁数、または [2, 3] のような複数桁数からのランダム選択
function pickDigits(digitsConfig) {
  if (Array.isArray(digitsConfig)) {
    return digitsConfig[Math.floor(Math.random() * digitsConfig.length)];
  }
  return digitsConfig;
}

// terms: [{ value:number, op:'+'|'-' }], answer: number を組み立てる共通ロジック
//
// 引き算は「引いても その時点の合計がマイナスにならない」ときだけ混ぜる。
// 実際の読み上げ算・見取り算では計算の途中でマイナスになることはないので、
// value <= total を満たさない引き算は絶対に作らない(そろばんの珠が引けなくなるため)。
function buildTermsSequence(digits, termCount, allowSubtract) {
  const terms = [];
  let total = 0;

  for (let i = 0; i < termCount; i++) {
    const value = randDigitsValue(pickDigits(digits));
    let op = '+';
    const isLast = i === termCount - 1;

    // 最後の項は「◯円では」で締めるので、足し算にして問題を終わらせる
    if (i > 0 && !isLast && allowSubtract && Math.random() < 0.4 && value <= total) {
      op = '-';
    }

    total += op === '+' ? value : -value;
    terms.push({ value, op });
  }

  return { terms, answer: total };
}

// mode('flash'|'yomiage') によって、同じ級でも桁数・口数(LEVELS[levelKey][mode])が異なる
// allowSubtractOverride を渡すと、その問題だけ level.allowSubtract の設定を上書きできる
// (例: 3級の「加算のみ3問+加減算3問」のような構成に使う)
function generateProblem(levelKey, mode, allowSubtractOverride) {
  const level = LEVELS[levelKey];
  const shape = level[mode];
  const allowSubtract = allowSubtractOverride !== undefined ? allowSubtractOverride : level.allowSubtract;
  const result = buildTermsSequence(shape.digits, shape.terms, allowSubtract);
  return { terms: result.terms, answer: result.answer, level: levelKey };
}

// そろばんモードの見取り算(加減算はつねに混ぜる)
function generateMitoriProblem(digits, termCount) {
  const result = buildTermsSequence(digits, termCount, true);
  return { kind: 'mitori', terms: result.terms, answer: result.answer };
}

// digits桁ぶんの「生の整数値」(0〜10^digits-1、先頭ゼロを許容)を返す
function randRawDigits(digits) {
  return Math.floor(Math.random() * Math.pow(10, digits));
}

// digits桁・小数点以下decimalPlaces桁の値をつくる(実際の検定と同じ「桁数の合計は級で固定、
// 小数点の位置だけが動く」というルールを再現する)
// decimalPlaces=0: ふつうのdigits桁の整数(先頭ゼロなし)
// decimalPlaces=digits: 0.xxxx形式(整数部は0、小数部はdigits桁で先頭ゼロも許容)
// 0<decimalPlaces<digits: 整数部(先頭ゼロなし)+小数部(先頭ゼロ許容)
function randColumnValue(digits, decimalPlaces) {
  const intDigits = digits - decimalPlaces;
  const intPart = intDigits > 0 ? randDigitsValue(intDigits) : 0;
  const fracScale = Math.pow(10, decimalPlaces);
  const fracPart = decimalPlaces > 0 ? Math.floor(Math.random() * fracScale) : 0;
  let raw = intPart * fracScale + fracPart;
  if (raw === 0) raw = 1; // 両方の項が0になるのを避ける
  return { raw, decimalPlaces, value: raw / fracScale };
}

// totalDigits桁ぶんを2つの項に分配する(最低minPart桁ずつ)
function splitDigits(totalDigits, minPart) {
  const range = totalDigits - 2 * minPart + 1;
  const a = minPart + Math.floor(Math.random() * Math.max(1, range));
  return [a, totalDigits - a];
}

// decimalEnabledのときだけ、指定桁数の一部をランダムに小数点以下にする
function randDecimalPlaces(digits, decimalEnabled) {
  if (!decimalEnabled || Math.random() >= 0.45) return 0;
  return Math.floor(Math.random() * (digits + 1));
}

// そろばんモードのかけ算: 2つの項の桁数の合計(totalDigits)が級ごとに一定になるよう分配する
// (実際の日商珠算検定の「B かけ算」の桁配分ルールを再現)
function generateKakeProblem(totalDigits, decimalEnabled) {
  const [digitsA, digitsB] = splitDigits(totalDigits, 2);
  const a = randColumnValue(digitsA, randDecimalPlaces(digitsA, decimalEnabled));
  const b = randColumnValue(digitsB, randDecimalPlaces(digitsB, decimalEnabled));
  const answerDecimalPlaces = a.decimalPlaces + b.decimalPlaces;
  const answer = (a.raw * b.raw) / Math.pow(10, answerDecimalPlaces);
  return {
    kind: 'kake',
    a: a.value, aDecimalPlaces: a.decimalPlaces, aDigits: digitsA,
    b: b.value, bDecimalPlaces: b.decimalPlaces, bDigits: digitsB,
    answer,
  };
}

// そろばんモードのわり算: わりきれるように商から逆算してつくる(小数もふくめて厳密に割り切れる)
// わる数の桁数+商の桁数の合計(totalDigits)が級ごとに一定になるよう分配する
function generateWariProblem(totalDigits, decimalEnabled) {
  const [divisorDigits, quotientDigits] = splitDigits(totalDigits, 2);
  const divisor = randColumnValue(divisorDigits, randDecimalPlaces(divisorDigits, decimalEnabled));
  const quotient = randColumnValue(quotientDigits, randDecimalPlaces(quotientDigits, decimalEnabled));
  const dividendDecimalPlaces = divisor.decimalPlaces + quotient.decimalPlaces;
  const dividend = (divisor.raw * quotient.raw) / Math.pow(10, dividendDecimalPlaces);
  return {
    kind: 'wari',
    dividend, dividendDecimalPlaces,
    divisor: divisor.value, divisorDecimalPlaces: divisor.decimalPlaces, divisorDigits,
    answer: quotient.value, quotientDecimalPlaces: quotient.decimalPlaces, quotientDigits,
  };
}

// 読み上げ用の日本語数詞に変換(大きくても6桁程度でOK)
function numberToJapanese(num) {
  if (num === 0) return 'ゼロ';
  const kanjiDigits = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const smallUnits = ['', '十', '百', '千'];
  const bigUnits = ['', '万', '億'];

  let n = num;
  const groups = [];
  while (n > 0) {
    groups.push(n % 10000);
    n = Math.floor(n / 10000);
  }

  let result = '';
  for (let g = groups.length - 1; g >= 0; g--) {
    const groupVal = groups[g];
    if (groupVal === 0) continue;
    let groupStr = '';
    let gv = groupVal;
    for (let d = 3; d >= 0; d--) {
      const digit = Math.floor(gv / Math.pow(10, d)) % 10;
      if (digit === 0) continue;
      if (d > 0 && digit === 1) {
        groupStr += smallUnits[d];
      } else {
        groupStr += kanjiDigits[digit] + smallUnits[d];
      }
    }
    result += groupStr + bigUnits[g];
  }

  return result;
}
