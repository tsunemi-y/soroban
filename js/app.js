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

/* ---------- 級選択画面の生成 ---------- */
function buildLevelGrid() {
  const grid = $('#level-grid');
  grid.innerHTML = '';
  LEVEL_ORDER.forEach(key => {
    const lv = LEVELS[key];
    const card = document.createElement('div');
    card.className = `level-card lv-${key}`;
    const digitsLabel = Array.isArray(lv.digits) ? lv.digits.join('-') : lv.digits;
    card.innerHTML = `
      <span class="lv-name">${lv.name}</span>
      <span class="lv-desc">${digitsLabel}桁 × ${lv.terms}口</span>
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

  $all('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => { SoundFX.click(); showScreen(btn.dataset.back); });
  });

  $all('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      SoundFX.click();
      state.mode = btn.dataset.mode;
      $('#level-mode-badge').textContent = MODE_NAMES[state.mode];
      showScreen('screen-level');
    });
  });

  $('#btn-retry').addEventListener('click', () => { SoundFX.click(); startSession(); });
  $('#btn-to-mode').addEventListener('click', () => { SoundFX.click(); showScreen('screen-mode'); });
  $('#btn-to-title').addEventListener('click', () => { SoundFX.click(); showScreen('screen-title'); });
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

function buildSessionProblems(levelKey) {
  const level = LEVELS[levelKey];
  if (level.sessionPlan) {
    const problems = [];
    level.sessionPlan.forEach(block => {
      for (let i = 0; i < block.count; i++) {
        problems.push(generateProblem(levelKey, block.allowSubtract));
      }
    });
    return problems;
  }
  return Array.from({ length: PROBLEM_COUNT }, () => generateProblem(levelKey));
}

/* ---------- セッション進行 ---------- */
function startSession() {
  state.sessionToken++;
  state.problems = buildSessionProblems(state.level);
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
    await playFlashSequence(problem.terms, level.flashInterval, token);
    flashDisplay.style.display = 'none';
  } else {
    yomiageDisplay.style.display = 'flex';
    $('#yomiage-status').textContent = 'よみあげちゅう…';
    await SpeechEngine.speakProblem(problem.terms, level.speechRate, level.speechPause, () => token !== state.sessionToken);
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

  const key = `soroban_best_${state.mode}_${state.level}_${total}`;
  const prevBest = parseInt(localStorage.getItem(key) || '0', 10);
  const isBest = score > prevBest;
  if (isBest) localStorage.setItem(key, String(score));
  const best = isBest ? score : prevBest;

  $('#result-score').textContent = `${score} / ${total} 問 正解 (${pct}%)`;
  $('#result-best').textContent = `自己ベスト: ${best} / ${total} 問` + (isBest ? ' 🎉 New!' : '');

  showScreen('screen-result');
}

/* ---------- 初期化 ---------- */
document.addEventListener('DOMContentLoaded', () => {
  buildLevelGrid();
  initNav();
  initKeypad();
});
