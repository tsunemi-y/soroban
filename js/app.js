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

const MODE_NAMES = { flash: 'フラッシュ暗算', yomiage: 'よみあげ暗算' };

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

function pickRewardItem() {
  const totalWeight = REWARD_ITEMS.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * totalWeight;
  for (const item of REWARD_ITEMS) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return REWARD_ITEMS[REWARD_ITEMS.length - 1];
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
    const d = new Date(h.date);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `
      <div class="history-row ${h.passed ? 'pass' : 'fail'}">
        <div class="history-main">
          <span class="history-level">${levelName}</span>
          <span class="history-mode">${modeName}</span>
          <span class="history-date">${dateStr}</span>
        </div>
        <div class="history-sub">
          <span class="history-score">${h.score}/${h.total}問</span>
          <span class="history-badge">${h.passed ? '合格' : '不合格'}</span>
        </div>
      </div>`;
  }).join('');
}

/* ---------- 級選択画面の生成(選んだモードに応じて桁数・口数の表示が変わる) ---------- */
function buildLevelGrid() {
  const grid = $('#level-grid');
  grid.innerHTML = '';
  LEVEL_ORDER_BY_MODE[state.mode].forEach(key => {
    const lv = LEVELS[key];
    const shape = lv[state.mode];
    const card = document.createElement('div');
    card.className = `level-card lv-${key}`;
    const digitsLabel = Array.isArray(shape.digits) ? shape.digits.join('-') : shape.digits;
    card.innerHTML = `
      <span class="lv-name">${lv.name}</span>
      <span class="lv-desc">${digitsLabel}桁 × ${shape.terms}口</span>
    `;
    card.addEventListener('click', () => {
      SoundFX.click();
      state.level = key;
      startSession();
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

  $('#btn-retry').addEventListener('click', () => { SoundFX.click(); startSession(); });
  $('#btn-to-mode').addEventListener('click', () => { SoundFX.click(); showScreen('screen-mode'); });
  $('#btn-to-title').addEventListener('click', () => { SoundFX.click(); showScreen('screen-title'); });

  $('#btn-quit').addEventListener('click', () => {
    SoundFX.click();
    quitSession();
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
  });

  state.lastResult = { score, total, pct, best, isBest, passed, passScore: level.passScore };

  if (passed) {
    state.pendingReward = pickRewardItem();
    showRewardScreen();
  } else {
    showResultScreen();
  }
}

function showResultScreen() {
  const r = state.lastResult;
  $('#result-score').textContent = `${r.score} / ${r.total} 問 正解 (${r.pct}%)`;
  $('#result-pass').textContent = r.passed
    ? `🎉 合格！(合格ライン ${r.passScore}問)`
    : `不合格…(合格ライン ${r.passScore}問)`;
  $('#result-pass').className = 'result-pass ' + (r.passed ? 'pass' : 'fail');
  $('#result-best').textContent = `自己ベスト: ${r.best} / ${r.total} 問` + (r.isBest ? ' 🎉 New!' : '');

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
});
