// 問題生成ロジック

function randDigitsValue(digits) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// level.digitsは固定の桁数、または [2, 3] のような複数桁数からのランダム選択
function pickDigits(digitsConfig) {
  if (Array.isArray(digitsConfig)) {
    return digitsConfig[Math.floor(Math.random() * digitsConfig.length)];
  }
  return digitsConfig;
}

// terms: [{ value:number, op:'+'|'-' }], answer: number
// allowSubtractOverride を渡すと、その問題だけ level.allowSubtract の設定を上書きできる
// (例: 3級の「加算のみ3問+加減算3問」のような構成に使う)
function generateProblem(levelKey, allowSubtractOverride) {
  const level = LEVELS[levelKey];
  const allowSubtract = allowSubtractOverride !== undefined ? allowSubtractOverride : level.allowSubtract;
  const terms = [];
  let total = 0;

  for (let i = 0; i < level.terms; i++) {
    const value = randDigitsValue(pickDigits(level.digits));
    let op = '+';
    const isLast = i === level.terms - 1;

    // よみあげの最後の項は「◯円では」とだけ言い、演算を読み上げないため、
    // 最後の項は必ず足し算にする(そうしないと読み上げた数字と答えが合わなくなる)
    if (i > 0 && !isLast && allowSubtract && Math.random() < 0.4 && value <= total) {
      op = '-';
    }

    total += op === '+' ? value : -value;
    terms.push({ value, op });
  }

  return { terms, answer: total, level: levelKey };
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
