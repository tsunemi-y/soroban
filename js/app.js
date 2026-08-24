// 画面遷移・ゲーム進行を管理するメインスクリプト

const PROBLEM_COUNT = 10;

const state = {
  level: 3,
  mode: 'flash',   // 'flash' | 'yomiage'
  count: PROBLEM_COUNT,
  problems: [],
  index: 0,
  score: 0,
  answerStr: '',
  sessionToken: 0,   // 非同期処理の世代管理(連打・多重起動防止)
};

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return document.querySelectorAll(sel); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function showScreen(id) {
  $all('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

const MODE_NAMES = { flash: 'フラッシュ暗算', yomiage: 'よみあげ暗算', soroban: 'そろばん' };

/* ---------- 合格ごほうび(アイテムパック) ---------- */
const RARITY_META = {
  common: { label: 'コモン', className: 'rarity-common' },
  uncommon: { label: 'アンコモン', className: 'rarity-uncommon' },
  rare: { label: 'レア', className: 'rarity-rare' },
  epic: { label: 'エピック', className: 'rarity-epic' },
  legendary: { label: 'レジェンド', className: 'rarity-legendary' },
};

const REWARD_ITEMS = [
  { name: '小麦', icon: '🌾', rarity: 'common', weight: 40 },
  { name: 'まるた', icon: '🪵', rarity: 'common', weight: 40 },
  { name: '石のつるはし', icon: '⛏️', rarity: 'uncommon', weight: 25 },
  { name: 'パン', icon: '🍞', rarity: 'uncommon', weight: 25 },
  { name: '鉄インゴット', icon: '🔩', rarity: 'rare', weight: 12 },
  { name: '弓', icon: '🏹', rarity: 'rare', weight: 12 },
  { name: '金インゴット', icon: '🟨', rarity: 'epic', weight: 5 },
  { name: 'エンチャントの本', icon: '📖', rarity: 'epic', weight: 5 },
  { name: 'ダイヤモンド', icon: '💎', rarity: 'legendary', weight: 2 },
  { name: 'ネザースター', icon: '🌟', rarity: 'legendary', weight: 1 },
];

// pctが高いほど(=高得点なほど)上位レアリティが出やすくなる。省略時は最高評価あつかい
function pickRewardItem(pct) {
  const p = typeof pct === 'number' ? pct : 100;
  const boost = Math.max(0, Math.min(1, (p - 60) / 40)); // 60%以下は補正なし、100%で最大補正
  const tierBoost = { common: 1 - boost * 0.6, uncommon: 1, rare: 1 + boost * 1.5, epic: 1 + boost * 3, legendary: 1 + boost * 6 };

  const weighted = REWARD_ITEMS.map(item => ({ item, weight: item.weight * tierBoost[item.rarity] }));
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let r = Math.random() * totalWeight;
  for (const w of weighted) {
    if (r < w.weight) return w.item;
    r -= w.weight;
  }
  return weighted[weighted.length - 1].item;
}

/* ---------- 取得したアイテム(localStorage) ---------- */
const INVENTORY_KEY = 'soroban_inventory';

function loadInventory() {
  try {
    return JSON.parse(localStorage.getItem(INVENTORY_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function addToInventory(itemName) {
  const inventory = loadInventory();
  inventory[itemName] = (inventory[itemName] || 0) + 1;
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
}

function renderRarityLegend() {
  const legend = $('#rarity-legend');
  legend.innerHTML = Object.values(RARITY_META).map(meta => `
    <span class="rarity-chip ${meta.className}">${meta.label}</span>
  `).join('');
}

function renderInventory() {
  const list = $('#inventory-list');
  const inventory = loadInventory();
  list.innerHTML = REWARD_ITEMS.map(item => {
    const count = inventory[item.name] || 0;
    const meta = RARITY_META[item.rarity];
    if (count === 0) {
      return `
        <div class="inv-card inv-unknown">
          <div class="inv-icon">？</div>
          <div class="inv-name">？？？</div>
          <div class="inv-rarity">未発見</div>
        </div>`;
    }
    return `
      <div class="inv-card ${meta.className}">
        <div class="inv-icon">${item.icon}</div>
        <div class="inv-name">${item.name}</div>
        <div class="inv-rarity">${meta.label}</div>
        <div class="inv-count">×${count}</div>
      </div>`;
  }).join('');
}

/* ---------- きろく(localStorage) ---------- */
const HISTORY_KEY = 'soroban_history';
const HISTORY_MAX = 50;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveHistoryEntry(entry) {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function renderHistory() {
  const list = $('#history-list');
  const history = loadHistory();
  if (history.length === 0) {
    list.innerHTML = '<p class="history-empty">まだ きろくが ないよ</p>';
    return;
  }
  list.innerHTML = history.map(h => {
    const level = LEVELS[h.level];
    const levelName = level ? level.name : `${h.level}級`;
    const modeName = MODE_NAMES[h.mode] || h.mode;
    const pct = h.points !== undefined ? Math.round((h.points / h.maxPoints) * 100) : Math.round((h.score / h.total) * 100);
    const scoreLabel = h.points !== undefined ? `${h.points}/${h.maxPoints}点 (${pct}%)` : `${h.score}/${h.total}問 (${pct}%)`;
    const d = new Date(h.date);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const breakdownHtml = h.sections ? `
        <div class="history-breakdown">
          ${h.sections.map(s => `<span class="history-chip">${s.label} ${s.correct}/${s.total}${s.points !== undefined ? ` (${s.points}点)` : ''}</span>`).join('')}
        </div>` : '';
    return `
      <div class="history-row ${h.passed ? 'pass' : 'fail'}">
        <div class="history-main">
          <span class="history-level">${levelName}</span>
          <span class="history-mode">${modeName}</span>
          <span class="history-date">${dateStr}</span>
        </div>
        <div class="history-sub">
          <span class="history-score">${scoreLabel}</span>
          <span class="history-badge">${h.passed ? '合格' : '不合格'}</span>
        </div>
        ${breakdownHtml}
      </div>`;
  }).join('');
}

/* ---------- きろくのCSVダウンロード(AIなどでの分析用) ---------- */
function csvEscape(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// AIでの分析用に、これまで出題した「問題」と「正しい答え」だけを1問1行で書き出す
function historyToCSV(history) {
  const header = ['問題', '答え'];
  const rows = [];
  history.forEach(h => {
    (h.problemList || []).forEach(p => rows.push([p.text, p.answer]));
  });
  return [header, ...rows].map(row => row.map(csvEscape).join(',')).join('\r\n');
}

function downloadHistoryCSV() {
  const history = loadHistory();
  const csv = historyToCSV(history);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const fname = `soroban_history_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.csv`;
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sorobanLevelDesc(lv) {
  const soroban = lv.soroban;
  if (soroban.timerMode === 'combined') {
    return `全種目 ${Math.round(soroban.timeLimitSec / 60)}分`;
  }
  const minutes = Math.round(soroban.sections[0].timeLimitSec / 60);
  return `見取り/かけ/わり 各${minutes}分`;
}

/* ---------- 級選択画面の生成(選んだモードに応じて桁数・口数の表示が変わる) ---------- */
function buildLevelGrid() {
  const grid = $('#level-grid');
  grid.innerHTML = '';
  LEVEL_ORDER_BY_MODE[state.mode].forEach(key => {
    const lv = LEVELS[key];
    const card = document.createElement('div');
    card.className = `level-card lv-${key}`;
    let descHtml;
    if (state.mode === 'soroban') {
      descHtml = sorobanLevelDesc(lv);
    } else {
      const shape = lv[state.mode];
      const digitsLabel = Array.isArray(shape.digits) ? shape.digits.join('-') : shape.digits;
      descHtml = `${digitsLabel}桁 × ${shape.terms}口`;
    }
    card.innerHTML = `
      <span class="lv-name">${lv.name}</span>
      <span class="lv-desc">${descHtml}</span>
    `;
    card.addEventListener('click', () => {
      SoundFX.click();
      state.level = key;
      if (state.mode === 'soroban') {
        startSorobanSession();
      } else {
        startSession();
      }
    });
    grid.appendChild(card);
  });
}

/* ---------- 画面遷移イベント ---------- */
function initNav() {
  $('#btn-start').addEventListener('click', () => { SoundFX.click(); showScreen('screen-mode'); });
  $('#btn-howto').addEventListener('click', () => { SoundFX.click(); showScreen('screen-howto'); });
  $('#btn-history').addEventListener('click', () => { SoundFX.click(); renderHistory(); showScreen('screen-history'); });
  $('#btn-history-clear').addEventListener('click', () => {
    SoundFX.click();
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  });
  $('#btn-history-csv').addEventListener('click', () => {
    SoundFX.click();
    downloadHistoryCSV();
  });
  $('#btn-inventory').addEventListener('click', () => {
    SoundFX.click();
    renderRarityLegend();
    renderInventory();
    showScreen('screen-inventory');
  });

  $all('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => { SoundFX.click(); showScreen(btn.dataset.back); });
  });

  $all('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      SoundFX.click();
      state.mode = btn.dataset.mode;
      $('#level-mode-badge').textContent = MODE_NAMES[state.mode];
      buildLevelGrid();
      showScreen('screen-level');
    });
  });

  $('#btn-retry').addEventListener('click', () => {
    SoundFX.click();
    if (state.mode === 'soroban') startSorobanSession(); else startSession();
  });
  $('#btn-to-mode').addEventListener('click', () => { SoundFX.click(); showScreen('screen-mode'); });
  $('#btn-to-title').addEventListener('click', () => { SoundFX.click(); showScreen('screen-title'); });

  $('#btn-quit').addEventListener('click', () => {
    SoundFX.click();
    quitSession();
  });

  $('#sb-btn-quit').addEventListener('click', () => {
    SoundFX.click();
    quitSorobanSession();
  });

  $('#reward-pack').addEventListener('click', openRewardPack);
  $('#btn-reward-next').addEventListener('click', () => { SoundFX.click(); showResultScreen(); });
}

// 出題の途中でも抜けられるように、進行中の非同期処理を止めて級選択に戻る
function quitSession() {
  state.sessionToken++;
  SpeechEngine.cancel();
  showScreen('screen-level');
}

/* ---------- キーパッド ---------- */
function initKeypad() {
  $all('.key[data-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      SoundFX.click();
      appendDigit(btn.dataset.key);
    });
  });
  $('#key-clear').addEventListener('click', () => { SoundFX.click(); state.answerStr = ''; renderAnswer(); });
  $('#key-enter').addEventListener('click', () => { submitAnswer(); });

  document.addEventListener('keydown', (e) => {
    if (!$('#answer-panel').classList.contains('show-panel')) return;
    if (e.key >= '0' && e.key <= '9') appendDigit(e.key);
    else if (e.key === 'Backspace') { state.answerStr = state.answerStr.slice(0, -1); renderAnswer(); }
    else if (e.key === 'Enter') submitAnswer();
  });
}

function initSorobanNav() {
  $('#sb-btn-back').addEventListener('click', () => {
    if ($('#sb-btn-back').disabled) return;
    SoundFX.click();
    backSorobanProblem(state.sbToken);
  });
  $('#sb-btn-next').addEventListener('click', () => {
    SoundFX.click();
    nextSorobanProblem(state.sbToken);
  });
  $('#sb-btn-grade').addEventListener('click', () => {
    gradeBulkEntry();
  });

  document.addEventListener('keydown', (e) => {
    if (!$('#screen-soroban-play').classList.contains('active')) return;
    const sb = state.soroban;
    if (!sb || sb.phase !== 'browse') return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') nextSorobanProblem(state.sbToken);
    else if (e.key === 'ArrowLeft') backSorobanProblem(state.sbToken);
  });
}

function appendDigit(d) {
  if (state.answerStr.length >= 7) return;
  state.answerStr = state.answerStr === '0' ? d : state.answerStr + d;
  renderAnswer();
}

function renderAnswer() {
  $('#answer-display').textContent = state.answerStr === '' ? '0' : state.answerStr;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSessionProblems(levelKey, mode) {
  const level = LEVELS[levelKey];
  const plan = level.sessionPlan;
  if (plan) {
    let allowSubtractFlags = [];
    plan.blocks.forEach(block => {
      for (let i = 0; i < block.count; i++) allowSubtractFlags.push(block.allowSubtract);
    });
    if (plan.shuffle) allowSubtractFlags = shuffle(allowSubtractFlags);
    return allowSubtractFlags.map(allowSubtract => generateProblem(levelKey, mode, allowSubtract));
  }
  return Array.from({ length: PROBLEM_COUNT }, () => generateProblem(levelKey, mode));
}

/* ---------- セッション進行 ---------- */
function startSession() {
  state.sessionToken++;
  state.problems = buildSessionProblems(state.level, state.mode);
  state.count = state.problems.length;
  state.index = 0;
  state.score = 0;
  $('#hud-level').textContent = LEVELS[state.level].name + (state.mode === 'flash' ? ' フラッシュ' : ' よみあげ');
  showScreen('screen-play');
  runProblem(state.sessionToken);
}

function updateHud() {
  $('#hud-progress').textContent = `${state.index + 1} / ${state.problems.length}`;
  $('#hud-score').textContent = `⭐ ${state.score}`;
}

async function runProblem(token) {
  if (token !== state.sessionToken) return;
  updateHud();

  const flashDisplay = $('#flash-display');
  const yomiageDisplay = $('#yomiage-display');
  const answerPanel = $('#answer-panel');
  const countdownEl = $('#countdown');

  flashDisplay.style.display = 'none';
  yomiageDisplay.style.display = 'none';
  answerPanel.style.display = 'none';
  answerPanel.classList.remove('show-panel');
  countdownEl.style.display = 'flex';

  // カウントダウン
  for (const label of ['3', '2', '1']) {
    if (token !== state.sessionToken) return;
    countdownEl.textContent = label;
    SoundFX.tick();
    await sleep(500);
  }
  if (token !== state.sessionToken) return;
  countdownEl.textContent = 'スタート!';
  SoundFX.start();
  await sleep(400);
  if (token !== state.sessionToken) return;
  countdownEl.style.display = 'none';

  const problem = state.problems[state.index];
  const level = LEVELS[state.level];

  if (state.mode === 'flash') {
    flashDisplay.style.display = 'flex';
    await playFlashSequence(problem.terms, level.flash.flashInterval, token);
    flashDisplay.style.display = 'none';
  } else {
    yomiageDisplay.style.display = 'flex';
    $('#yomiage-status').textContent = 'よみあげちゅう…';
    await SpeechEngine.speakProblem(problem.terms, level.yomiage.speechRate, level.yomiage.speechPause, () => token !== state.sessionToken);
    yomiageDisplay.style.display = 'none';
  }

  if (token !== state.sessionToken) return;

  state.answerStr = '';
  renderAnswer();
  answerPanel.style.display = 'block';
  answerPanel.classList.add('show-panel');
}

async function playFlashSequence(terms, interval, token) {
  const el = $('#flash-display');
  const showMs = Math.round(interval * 0.7);
  const gapMs = interval - showMs;

  for (let i = 0; i < terms.length; i++) {
    if (token !== state.sessionToken) return;
    const t = terms[i];
    const sign = i > 0 && t.op === '-' ? '－' : '';
    el.innerHTML = `<span class="flash-number">${sign}${t.value}</span>`;
    SoundFX.tick();
    await sleep(showMs);
    if (token !== state.sessionToken) return;
    el.innerHTML = '';
    await sleep(gapMs);
  }
}

function submitAnswer() {
  if (!$('#answer-panel').classList.contains('show-panel')) return;
  $('#answer-panel').classList.remove('show-panel');

  const token = state.sessionToken;
  const problem = state.problems[state.index];
  const userAnswer = parseInt(state.answerStr || '0', 10);
  const correct = userAnswer === problem.answer;

  if (correct) { state.score++; SoundFX.correct(); }
  else { SoundFX.wrong(); }

  showFeedback(correct, problem.answer);
  updateHud();

  setTimeout(() => {
    if (token !== state.sessionToken) return;
    state.index++;
    if (state.index >= state.problems.length) {
      finishSession();
    } else {
      runProblem(token);
    }
  }, 1200);
}

function showFeedback(correct, answer) {
  const box = $('#feedback');
  box.innerHTML = `
    <div class="feedback-box ${correct ? 'correct' : 'wrong'}">
      ${correct ? '正解！' : 'ざんねん…'}
      ${correct ? '' : `<span class="feedback-answer">こたえ: ${answer}</span>`}
    </div>`;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 1100);
}

/* ---------- そろばんモード ----------
   実際のそろばん・紙で計算しながら、アプリは問題の表示とタイマーだけを受け持つ。
   「つぎへ／もどる」で問題を見て回り(答え入力なし)、
   最後の問題まで進むか時間切れになったタイミングで、
   紙に書いたこたえを まとめて入力→採点する。
   1秒を争うので、種目の切り替わりでも待ち時間(バナー演出)は入れない。
------------------------------------------------------------ */
const SOROBAN_POINTS_PER_KIND = { mitori: 10, kake: 5, wari: 5 };

function resolveSorobanSections(levelKey) {
  const soroban = LEVELS[levelKey].soroban;
  return soroban.sections.map(section => {
    let problems;
    if (section.kind === 'mitori') {
      problems = Array.from({ length: section.count }, () => generateMitoriProblem(section.digits, section.terms));
    } else if (section.kind === 'kake') {
      problems = Array.from({ length: section.count }, () => generateKakeProblem(section.totalDigits, section.decimalEnabled));
    } else {
      problems = Array.from({ length: section.count }, () => generateWariProblem(section.totalDigits, section.decimalEnabled));
    }
    return { label: section.label, kind: section.kind, count: section.count, timeLimitSec: section.timeLimitSec, problems };
  });
}

// 区間の問題たちを {sectionIndex, indexInSection, problem} の一本のリストにする
function buildFlatList(sections) {
  const flat = [];
  sections.forEach((section, sIdx) => {
    section.problems.forEach((p, pIdx) => flat.push({ sectionIndex: sIdx, indexInSection: pIdx, problem: p }));
  });
  return flat;
}

function buildSectionFlat(sb, sIdx) {
  return sb.sections[sIdx].problems.map((p, pIdx) => ({ sectionIndex: sIdx, indexInSection: pIdx, problem: p }));
}

function startSorobanSession() {
  state.sbToken = (state.sbToken || 0) + 1;
  const soroban = LEVELS[state.level].soroban;
  state.soroban = {
    timerMode: soroban.timerMode,
    sections: resolveSorobanSections(state.level),
    sectionIndex: 0,
    flat: [],
    browseIndex: 0,
    phase: 'browse',
    entryList: [],
    entryAnswers: [],
    timerId: null,
    deadline: 0,
    results: [],
  };
  showScreen('screen-soroban-play');

  if (soroban.timerMode === 'combined') {
    // combinedモードは全種目ぶんの問題を1本のリストにして、通しで1つの制限時間で測る
    state.soroban.flat = buildFlatList(state.soroban.sections);
    state.soroban.deadline = Date.now() + soroban.timeLimitSec * 1000;
    updateSorobanTimerDisplay(soroban.timeLimitSec);
    state.soroban.timerId = setInterval(() => tickSorobanTimer(state.sbToken), 1000);
    beginSorobanSection(state.sbToken, true);
  } else {
    beginSorobanSection(state.sbToken, true);
  }
}

// 出題の途中でも抜けられるように、タイマーを止めて級選択に戻る
function quitSorobanSession() {
  state.sbToken = (state.sbToken || 0) + 1;
  if (state.soroban && state.soroban.timerId) clearInterval(state.soroban.timerId);
  showScreen('screen-level');
}

// 種目の先頭から閲覧をはじめる。perSectionモードでは種目ごとの新しいタイマーも張る
// (待ち時間があると1秒を争う本番のロスになるので、演出は入れず即座に問題を出す)
function beginSorobanSection(token, withOwnTimer) {
  if (token !== state.sbToken) return;
  const sb = state.soroban;
  const section = sb.sections[sb.sectionIndex];

  if (sb.timerMode === 'perSection') {
    sb.flat = buildSectionFlat(sb, sb.sectionIndex);
  }
  sb.browseIndex = 0;
  sb.phase = 'browse';

  $('#sb-hud-section').textContent = section.label;
  $('#sb-problem').style.display = 'flex';
  $('#sb-nav-panel').style.display = 'flex';
  $('#sb-entry-panel').style.display = 'none';
  SoundFX.start();

  if (sb.timerMode === 'perSection' && withOwnTimer) {
    sb.deadline = Date.now() + section.timeLimitSec * 1000;
    updateSorobanTimerDisplay(section.timeLimitSec);
    if (sb.timerId) clearInterval(sb.timerId);
    sb.timerId = setInterval(() => tickSorobanTimer(token), 1000);
  } else if (sb.timerMode === 'combined') {
    updateSorobanTimerDisplay(Math.max(0, Math.ceil((sb.deadline - Date.now()) / 1000)));
  }

  showSorobanProblem(token);
}

function tickSorobanTimer(token) {
  if (token !== state.sbToken) return;
  const sb = state.soroban;
  const remainingMs = sb.deadline - Date.now();
  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
  updateSorobanTimerDisplay(remainingSec);
  if (remainingMs <= 0) {
    clearInterval(sb.timerId);
    if (sb.phase === 'browse') enterBulkEntry(token);
  }
}

function updateSorobanTimerDisplay(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  $('#sb-hud-timer').textContent = `⏱ ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateSorobanHud() {
  const sb = state.soroban;
  const cur = sb.flat[sb.browseIndex];
  const section = sb.sections[cur.sectionIndex];
  $('#sb-hud-progress').textContent = `${cur.indexInSection + 1} / ${section.count}`;
  $('#sb-hud-section').textContent = section.label;
}

// 数値を「1,234.5」のようにカンマ区切り+指定した小数桁数で表示用に整形する
function formatSorobanNumber(n, decimalPlaces) {
  const fixed = decimalPlaces > 0 ? n.toFixed(decimalPlaces) : String(Math.round(n));
  const [intPart, fracPart] = fixed.split('.');
  const negative = intPart.startsWith('-');
  const digitsOnly = negative ? intPart.slice(1) : intPart;
  const withCommas = (negative ? '-' : '') + digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fracPart ? `${withCommas}.${fracPart}` : withCommas;
}

function showSorobanProblem(token) {
  if (token !== state.sbToken) return;
  const sb = state.soroban;
  const cur = sb.flat[sb.browseIndex];
  const problem = cur.problem;
  updateSorobanHud();

  const el = $('#sb-problem');
  const noHtml = `<div class="sb-problem-no">${cur.indexInSection + 1}問目</div>`;
  if (problem.kind === 'mitori') {
    el.innerHTML = noHtml + '<div class="sb-mitori">' +
      problem.terms.map((t, i) => {
        const sign = i === 0 ? '' : (t.op === '-' ? '－' : '＋');
        return `<div class="sb-mitori-row"><span class="sb-mitori-sign">${sign}</span><span class="sb-mitori-value">${formatSorobanNumber(t.value, 0)}</span></div>`;
      }).join('') +
      '<div class="sb-mitori-line"></div></div>';
  } else if (problem.kind === 'kake') {
    el.innerHTML = noHtml + `<div class="sb-horizontal">${formatSorobanNumber(problem.a, problem.aDecimalPlaces)} × ${formatSorobanNumber(problem.b, problem.bDecimalPlaces)}</div>`;
  } else {
    el.innerHTML = noHtml + `<div class="sb-horizontal">${formatSorobanNumber(problem.dividend, problem.dividendDecimalPlaces)} ÷ ${formatSorobanNumber(problem.divisor, problem.divisorDecimalPlaces)}</div>`;
  }

  $('#sb-btn-back').disabled = sb.browseIndex === 0;
  const isLast = sb.browseIndex === sb.flat.length - 1;
  $('#sb-btn-next').textContent = isLast ? '📝 こたえを入力する' : 'つぎへ ▶';
}

function backSorobanProblem(token) {
  if (token !== state.sbToken) return;
  const sb = state.soroban;
  if (sb.phase !== 'browse' || sb.browseIndex === 0) return;
  sb.browseIndex--;
  showSorobanProblem(token);
}

function nextSorobanProblem(token) {
  if (token !== state.sbToken) return;
  const sb = state.soroban;
  if (sb.phase !== 'browse') return;
  const cur = sb.flat[sb.browseIndex];
  const isLastOverall = sb.browseIndex === sb.flat.length - 1;

  if (isLastOverall) {
    enterBulkEntry(token);
    return;
  }

  const nextEntry = sb.flat[sb.browseIndex + 1];
  sb.browseIndex++;
  if (sb.timerMode === 'combined' && nextEntry.sectionIndex !== cur.sectionIndex) {
    // 種目の切り替わり:待ち時間なしで即座に次の種目の問題を出す(効果音だけで合図)
    sb.sectionIndex = nextEntry.sectionIndex;
    SoundFX.start();
  }
  showSorobanProblem(token);
}

// 見てきた問題ぶんのこたえを、まとめて入力する画面に切り替える
function enterBulkEntry(token) {
  if (token !== state.sbToken) return;
  const sb = state.soroban;
  if (sb.phase === 'entry') return;
  if (sb.timerId) { clearInterval(sb.timerId); sb.timerId = null; }
  sb.phase = 'entry';
  sb.entryList = sb.flat.slice(0, sb.browseIndex + 1);
  sb.entryAnswers = sb.entryList.map(() => '');

  $('#sb-problem').style.display = 'none';
  $('#sb-nav-panel').style.display = 'none';
  renderBulkEntry();
  $('#sb-entry-panel').style.display = 'block';
}

// 見取り算/フラッシュ/よみあげ(termsのみ)・かけ算・わり算のどれでも文字列化する(CSV書き出しにも使う)
function problemText(problem) {
  if (problem.kind === 'kake') {
    return `${formatSorobanNumber(problem.a, problem.aDecimalPlaces)} × ${formatSorobanNumber(problem.b, problem.bDecimalPlaces)}`;
  } else if (problem.kind === 'wari') {
    return `${formatSorobanNumber(problem.dividend, problem.dividendDecimalPlaces)} ÷ ${formatSorobanNumber(problem.divisor, problem.divisorDecimalPlaces)}`;
  }
  return problem.terms.map((t, i) => (i === 0 ? '' : (t.op === '-' ? ' － ' : ' ＋ ')) + formatSorobanNumber(t.value, 0)).join('');
}

function renderBulkEntry() {
  const sb = state.soroban;
  const listEl = $('#sb-entry-list');
  let html = '';
  let lastSection = null;
  sb.entryList.forEach((e, i) => {
    if (e.sectionIndex !== lastSection) {
      lastSection = e.sectionIndex;
      html += `<div class="sb-entry-section-label">${sb.sections[e.sectionIndex].label}</div>`;
    }
    html += `
      <div class="sb-entry-row">
        <span class="sb-entry-no">${e.indexInSection + 1}</span>
        <span class="sb-entry-problem">${problemText(e.problem)}</span>
        <span class="sb-entry-eq">=</span>
        <input type="number" inputmode="decimal" step="any" class="sb-entry-input" data-idx="${i}">
      </div>`;
  });
  listEl.innerHTML = html;
  $all('.sb-entry-input').forEach(inp => {
    inp.addEventListener('input', () => {
      sb.entryAnswers[parseInt(inp.dataset.idx, 10)] = inp.value;
    });
  });
}

function gradeBulkEntry() {
  const token = state.sbToken;
  const sb = state.soroban;
  if (sb.phase !== 'entry') return;
  SoundFX.click();

  const level = LEVELS[state.level];
  const sectionCorrect = {};
  sb.entryList.forEach((e, i) => {
    const userAnswer = parseFloat(sb.entryAnswers[i] || '');
    // 小数の答え(かけ算・わり算)もあるので、浮動小数点の誤差を許容して比較する
    const correct = Math.abs(userAnswer - e.problem.answer) < 1e-6;
    if (correct) sectionCorrect[e.sectionIndex] = (sectionCorrect[e.sectionIndex] || 0) + 1;
  });

  if (sb.timerMode === 'perSection') {
    const section = sb.sections[sb.sectionIndex];
    const correct = sectionCorrect[sb.sectionIndex] || 0;
    const weight = SOROBAN_POINTS_PER_KIND[section.kind];
    sb.results.push({
      label: section.label,
      kind: section.kind,
      correct,
      total: section.count,
      points: correct * weight,
      maxPoints: section.count * weight,
      passed: (correct / section.count) >= level.soroban.passRate,
    });
    sb.sectionIndex++;
    if (sb.sectionIndex < sb.sections.length) {
      beginSorobanSection(token, true);
    } else {
      finishSorobanOverall(token);
    }
  } else {
    // combined: 見なかった種目・問題は0点としてあつかう
    sb.results = sb.sections.map((section, sIdx) => {
      const correct = sectionCorrect[sIdx] || 0;
      const weight = SOROBAN_POINTS_PER_KIND[section.kind];
      return {
        label: section.label,
        kind: section.kind,
        correct,
        total: section.count,
        points: correct * weight,
        maxPoints: section.count * weight,
        passed: (correct / section.count) >= level.soroban.passRate,
      };
    });
    finishSorobanOverall(token);
  }
}

function finishSorobanOverall(token) {
  if (token !== state.sbToken) return;
  const sb = state.soroban;
  const level = LEVELS[state.level];
  if (sb.timerId) clearInterval(sb.timerId);

  const score = sb.results.reduce((sum, r) => sum + r.correct, 0);
  const total = sb.results.reduce((sum, r) => sum + r.total, 0);
  const points = sb.results.reduce((sum, r) => sum + r.points, 0);
  const maxPoints = sb.results.reduce((sum, r) => sum + r.maxPoints, 0);
  const pct = Math.round((points / maxPoints) * 100);
  const passed = sb.timerMode === 'perSection'
    ? sb.results.every(r => r.passed)
    : (points / maxPoints) >= level.soroban.passRate;

  const key = `soroban_best_soroban_${state.level}_${maxPoints}`;
  const prevBest = parseInt(localStorage.getItem(key) || '0', 10);
  const isBest = points > prevBest;
  if (isBest) localStorage.setItem(key, String(points));
  const best = isBest ? points : prevBest;

  const problemList = sb.sections.flatMap(section => section.problems.map(p => ({ text: problemText(p), answer: p.answer })));

  saveHistoryEntry({
    date: new Date().toISOString(),
    mode: 'soroban',
    level: state.level,
    score, total, points, maxPoints, passed,
    sections: sb.results.map(r => ({ label: r.label, correct: r.correct, total: r.total, points: r.points, maxPoints: r.maxPoints })),
    problemList,
  });

  const passScoreLabel = sb.timerMode === 'perSection'
    ? `各種目 ${Math.round(level.soroban.passRate * 100)}%以上`
    : `合計 ${Math.round(level.soroban.passRate * maxPoints)}点以上(${maxPoints}点満点)`;

  state.lastResult = {
    score, total, points, maxPoints, pct, best, isBest, passed,
    passScoreLabel,
    sections: sb.results,
  };

  if (passed) {
    state.pendingReward = pickRewardItem(pct);
    showRewardScreen();
  } else {
    showResultScreen();
  }
}

function finishSession() {
  SpeechEngine.cancel();
  const total = state.problems.length;
  const score = state.score;
  const pct = Math.round((score / total) * 100);
  const level = LEVELS[state.level];
  const passed = score >= level.passScore;

  const key = `soroban_best_${state.mode}_${state.level}_${total}`;
  const prevBest = parseInt(localStorage.getItem(key) || '0', 10);
  const isBest = score > prevBest;
  if (isBest) localStorage.setItem(key, String(score));
  const best = isBest ? score : prevBest;

  saveHistoryEntry({
    date: new Date().toISOString(),
    mode: state.mode,
    level: state.level,
    score, total, passed,
    problemList: state.problems.map(p => ({ text: problemText(p), answer: p.answer })),
  });

  state.lastResult = { score, total, pct, best, isBest, passed, passScoreLabel: `${level.passScore}問` };

  if (passed) {
    state.pendingReward = pickRewardItem(pct);
    showRewardScreen();
  } else {
    showResultScreen();
  }
}

function showResultScreen() {
  const r = state.lastResult;
  const isPoints = r.points !== undefined;
  $('#result-score').textContent = isPoints
    ? `${r.points} / ${r.maxPoints} 点 (${r.pct}%)`
    : `${r.score} / ${r.total} 問 正解 (${r.pct}%)`;
  $('#result-pass').textContent = r.passed
    ? `🎉 合格！(合格ライン ${r.passScoreLabel})`
    : `不合格…(合格ライン ${r.passScoreLabel})`;
  $('#result-pass').className = 'result-pass ' + (r.passed ? 'pass' : 'fail');

  const sectionsEl = $('#result-sections');
  sectionsEl.innerHTML = r.sections ? r.sections.map(s => `
    <div class="result-section-row ${s.passed ? 'pass' : 'fail'}">
      <span>${s.label}</span>
      <span>${s.correct} / ${s.total}問${s.points !== undefined ? ` ・ ${s.points}/${s.maxPoints}点` : ''}</span>
      <span>${s.passed ? '✅' : '❌'}</span>
    </div>
  `).join('') : '';

  $('#result-best').textContent = isPoints
    ? `自己ベスト: ${r.best} / ${r.maxPoints} 点` + (r.isBest ? ' 🎉 New!' : '')
    : `自己ベスト: ${r.best} / ${r.total} 問` + (r.isBest ? ' 🎉 New!' : '');

  showScreen('screen-result');
}

function showRewardScreen() {
  const packEl = $('#reward-pack');
  const cardEl = $('#reward-card');
  packEl.classList.remove('opened');
  packEl.style.display = '';
  cardEl.classList.remove('show');
  cardEl.style.display = 'none';
  cardEl.innerHTML = '';
  showScreen('screen-reward');
}

function openRewardPack() {
  const item = state.pendingReward;
  if (!item || $('#reward-pack').classList.contains('opened')) return;

  SoundFX.correct();
  addToInventory(item.name);
  const packEl = $('#reward-pack');
  const cardEl = $('#reward-card');
  const meta = RARITY_META[item.rarity];

  packEl.classList.add('opened');
  cardEl.className = `reward-card ${meta.className} show`;
  cardEl.innerHTML = `
    <div class="reward-icon">${item.icon}</div>
    <div class="reward-name">${item.name}</div>
    <div class="reward-rarity">${meta.label}</div>
  `;
  cardEl.style.display = 'flex';
}

/* ---------- 初期化 ---------- */
document.addEventListener('DOMContentLoaded', () => {
  buildLevelGrid();
  initNav();
  initKeypad();
  initSorobanNav();
});
