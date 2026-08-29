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

const MODE_NAMES = { flash: 'フラッシュ暗算', yomiage: 'よみあげ暗算', yomiageSoroban: 'よみあげそろばん', soroban: 'そろばん', drive: 'ドライブモード' };
const HUD_MODE_LABEL = { flash: 'フラッシュ', yomiage: 'よみあげ', yomiageSoroban: 'よみあげそろばん' };

/* ---------- 合格ごほうび(アイテムパック) ---------- */
const RARITY_META = {
  common: { label: 'コモン', className: 'rarity-common' },
  uncommon: { label: 'アンコモン', className: 'rarity-uncommon' },
  rare: { label: 'レア', className: 'rarity-rare' },
  epic: { label: 'エピック', className: 'rarity-epic' },
  legendary: { label: 'レジェンド', className: 'rarity-legendary' },
};

const REWARD_ITEMS = [
  // ----- コモン(weight 40): 序盤の木・石ツール、身近な素材 -----
  { name: '小麦', icon: '🌾', rarity: 'common', weight: 40 },
  { name: 'まるた', icon: '🪵', rarity: 'common', weight: 40 },
  { name: '石', icon: '🪨', rarity: 'common', weight: 40 },
  { name: '土', icon: '🟫', rarity: 'common', weight: 40 },
  { name: '羊毛', icon: '🧶', rarity: 'common', weight: 40 },
  { name: '石炭', icon: '⚫', rarity: 'common', weight: 40 },
  { name: '種', icon: '🌱', rarity: 'common', weight: 40 },
  { name: 'リンゴ', icon: '🍎', rarity: 'common', weight: 40 },
  { name: 'じゃがいも', icon: '🥔', rarity: 'common', weight: 40 },
  { name: 'にんじん', icon: '🥕', rarity: 'common', weight: 40 },
  { name: 'たいまつ', icon: '🔦', rarity: 'common', weight: 40 },
  { name: 'ガラス', icon: '🪟', rarity: 'common', weight: 40 },
  { name: 'はしご', icon: '🪜', rarity: 'common', weight: 40 },
  { name: '木の剣', icon: '🗡️', rarity: 'common', weight: 40 },
  { name: '木のつるはし', icon: '⛏️', rarity: 'common', weight: 40 },
  { name: 'バケツ', icon: '🪣', rarity: 'common', weight: 40 },
  { name: 'ひも', icon: '🧵', rarity: 'common', weight: 40 },
  { name: '骨', icon: '🦴', rarity: 'common', weight: 40 },
  { name: '羽根', icon: '🪶', rarity: 'common', weight: 40 },
  { name: '卵', icon: '🥚', rarity: 'common', weight: 40 },
  { name: '花たば', icon: '💐', rarity: 'common', weight: 40 },
  { name: 'きのこ', icon: '🍄', rarity: 'common', weight: 40 },
  { name: '粘土', icon: '🧱', rarity: 'common', weight: 40 },
  { name: 'サボテン', icon: '🌵', rarity: 'common', weight: 40 },
  { name: '砂糖', icon: '🍬', rarity: 'common', weight: 40 },
  { name: '紙', icon: '📄', rarity: 'common', weight: 40 },
  { name: '本', icon: '📕', rarity: 'common', weight: 40 },
  { name: '釣り竿', icon: '🎣', rarity: 'common', weight: 40 },
  { name: '石の剣', icon: '⚔️', rarity: 'common', weight: 40 },
  { name: '石のおの', icon: '🪓', rarity: 'common', weight: 40 },
  { name: 'かまど', icon: '🔥', rarity: 'common', weight: 40 },
  { name: '作業台', icon: '🛠️', rarity: 'common', weight: 40 },
  { name: 'たき火', icon: '🏕️', rarity: 'common', weight: 40 },
  { name: 'ベル', icon: '🔔', rarity: 'common', weight: 40 },
  { name: '看板', icon: '🪧', rarity: 'common', weight: 40 },
  { name: '鉢植え', icon: '🪴', rarity: 'common', weight: 40 },
  { name: 'ろうそく', icon: '🕯️', rarity: 'common', weight: 40 },

  // ----- アンコモン(weight 25): 鉄ツール・防具まわりの中盤アイテム -----
  { name: '鉄インゴット', icon: '🔩', rarity: 'uncommon', weight: 25 },
  { name: '鉄の剣', icon: '🔪', rarity: 'uncommon', weight: 25 },
  { name: '鉄のよろい', icon: '🥋', rarity: 'uncommon', weight: 25 },
  { name: 'パン', icon: '🍞', rarity: 'uncommon', weight: 25 },
  { name: '弓', icon: '🏹', rarity: 'uncommon', weight: 25 },
  { name: '矢', icon: '➶', rarity: 'uncommon', weight: 25 },
  { name: '盾', icon: '🛡️', rarity: 'uncommon', weight: 25 },
  { name: 'はさみ', icon: '✂️', rarity: 'uncommon', weight: 25 },
  { name: 'コンパス', icon: '🧭', rarity: 'uncommon', weight: 25 },
  { name: '時計', icon: '🕰️', rarity: 'uncommon', weight: 25 },
  { name: '地図', icon: '🗺️', rarity: 'uncommon', weight: 25 },
  { name: '皮の防具', icon: '🧥', rarity: 'uncommon', weight: 25 },
  { name: 'なべ', icon: '🍲', rarity: 'uncommon', weight: 25 },
  { name: '鉄のドア', icon: '🚪', rarity: 'uncommon', weight: 25 },
  { name: 'レール', icon: '🛤️', rarity: 'uncommon', weight: 25 },
  { name: 'トロッコ', icon: '🚋', rarity: 'uncommon', weight: 25 },
  { name: '鞍', icon: '🐴', rarity: 'uncommon', weight: 25 },
  { name: '鐘', icon: '🛎️', rarity: 'uncommon', weight: 25 },
  { name: 'ベッド', icon: '🛏️', rarity: 'uncommon', weight: 25 },
  { name: '醸造台', icon: '⚗️', rarity: 'uncommon', weight: 25 },
  { name: 'ケーキ', icon: '🎂', rarity: 'uncommon', weight: 25 },
  { name: '額縁', icon: '🖼️', rarity: 'uncommon', weight: 25 },
  { name: 'ジュークボックス', icon: '📻', rarity: 'uncommon', weight: 25 },
  { name: 'レコード', icon: '💿', rarity: 'uncommon', weight: 25 },
  { name: '天秤', icon: '⚖️', rarity: 'uncommon', weight: 25 },
  { name: 'たる', icon: '🛢️', rarity: 'uncommon', weight: 25 },

  // ----- レア(weight 12): 金・レッドストーン・ラピスまわり -----
  { name: '金インゴット', icon: '🟨', rarity: 'rare', weight: 12 },
  { name: '金のリンゴ', icon: '🍏', rarity: 'rare', weight: 12 },
  { name: 'レッドストーン', icon: '🔴', rarity: 'rare', weight: 12 },
  { name: 'ラピスラズリ', icon: '🔵', rarity: 'rare', weight: 12 },
  { name: '発射装置', icon: '📤', rarity: 'rare', weight: 12 },
  { name: 'ホッパー', icon: '⏳', rarity: 'rare', weight: 12 },
  { name: 'ピストン', icon: '🔧', rarity: 'rare', weight: 12 },
  { name: 'TNT', icon: '🧨', rarity: 'rare', weight: 12 },
  { name: '高性能な羅針盤', icon: '🧭', rarity: 'rare', weight: 12 },
  { name: '名札', icon: '🏷️', rarity: 'rare', weight: 12 },
  { name: '経験値びん', icon: '🧪', rarity: 'rare', weight: 12 },
  { name: 'カメのこうら', icon: '🐢', rarity: 'rare', weight: 12 },
  { name: '火打ち石', icon: '🪨', rarity: 'rare', weight: 12 },
  { name: '望遠鏡', icon: '🔭', rarity: 'rare', weight: 12 },
  { name: '蜂蜜のつぼ', icon: '🍯', rarity: 'rare', weight: 12 },
  { name: '鐘楼の鐘', icon: '🔔', rarity: 'rare', weight: 12 },
  { name: '象牙細工', icon: '🎨', rarity: 'rare', weight: 12 },
  { name: '天文台の水晶', icon: '🔮', rarity: 'rare', weight: 12 },
  { name: '砲台のかざり', icon: '🎇', rarity: 'rare', weight: 12 },
  { name: '深海のかけら', icon: '🌊', rarity: 'rare', weight: 12 },

  // ----- エピック(weight 5): ダイヤモンドとエンチャント関連 -----
  { name: 'ダイヤモンド', icon: '💎', rarity: 'epic', weight: 5 },
  { name: 'ダイヤモンドの剣', icon: '🗡️', rarity: 'epic', weight: 5 },
  { name: 'ダイヤモンドのよろい', icon: '🛡️', rarity: 'epic', weight: 5 },
  { name: 'エンチャントの本', icon: '📖', rarity: 'epic', weight: 5 },
  { name: 'トライデント', icon: '🔱', rarity: 'epic', weight: 5 },
  { name: '金床', icon: '🔨', rarity: 'epic', weight: 5 },
  { name: 'ネザーウォート', icon: '🌰', rarity: 'epic', weight: 5 },
  { name: 'ブレイズロッド', icon: '🔥', rarity: 'epic', weight: 5 },
  { name: 'エンダーパール', icon: '🟢', rarity: 'epic', weight: 5 },
  { name: '防具立て', icon: '🗿', rarity: 'epic', weight: 5 },
  { name: 'シュルカーボックス', icon: '📦', rarity: 'epic', weight: 5 },
  { name: '星のかけら', icon: '✨', rarity: 'epic', weight: 5 },

  // ----- レジェンド(weight 2、最上位のみ1): エンドコンテンツ級のお宝 -----
  { name: 'ネザースター', icon: '🌟', rarity: 'legendary', weight: 2 },
  { name: 'ビーコン', icon: '🔆', rarity: 'legendary', weight: 2 },
  { name: 'ネザライトインゴット', icon: '🟫', rarity: 'legendary', weight: 2 },
  { name: 'トーテムオブアンダイング', icon: '🪅', rarity: 'legendary', weight: 2 },
  { name: 'エリトラ', icon: '🦋', rarity: 'legendary', weight: 1 },
  { name: 'ドラゴンの卵', icon: '🐲', rarity: 'legendary', weight: 1 },
];

// 級の難易度を0(いちばんやさしい)〜1(いちばんむずかしい)で表す並び順
// (モードをまたいで存在するすべての級を、やさしい順に並べたもの)
const LEVEL_DIFFICULTY_ORDER = [7, 6, 5, 4, 'jun3', 3, 'jun2', 2, 'jun1', 1, 'dan1', 'dan2', 'dan3', 'dan4', 'dan5'];

function levelDifficulty(levelKey) {
  const idx = LEVEL_DIFFICULTY_ORDER.indexOf(levelKey);
  if (idx === -1) return 0.5;
  return idx / (LEVEL_DIFFICULTY_ORDER.length - 1);
}

// よみあげ系(耳だけで聞き取って計算する)モードは、フラッシュよりごほうびの当たりを
// 格段によく出す。難易度・正答率の補正(boost、0〜1で頭打ち)とは別レイヤーの掛け算で
// 上位レアリティのウェイトを底上げするので、満点・最高難易度で補正が頭打ちになっても
// はっきり差がつく(legendaryはmultiplierの2乗で効くので特に大きく変わる)
const MODE_LUCK_MULTIPLIER = { flash: 1, soroban: 1, yomiage: 2.5, yomiageSoroban: 2.5 };

// 正答率(pct)・級の難易度(levelKey)・モード(mode)がそれぞれ高いほど、上位レアリティが
// 出やすくなる。すべて省略時は最高評価あつかい
function pickRewardItem(pct, levelKey, mode) {
  const p = typeof pct === 'number' ? pct : 100;
  const pctFactor = Math.max(0, Math.min(1, (p - 60) / 40)); // 60%以下は補正なし、100%で最大補正
  const difficulty = levelKey !== undefined ? levelDifficulty(levelKey) : 1;
  const boost = Math.max(0, Math.min(1, pctFactor * 0.5 + difficulty * 0.5));
  const tierBoost = { common: 1 - boost * 0.6, uncommon: 1, rare: 1 + boost * 1.5, epic: 1 + boost * 3, legendary: 1 + boost * 6 };

  const luck = MODE_LUCK_MULTIPLIER[mode] || 1;
  tierBoost.rare *= luck;
  tierBoost.epic *= luck ** 1.5;
  tierBoost.legendary *= luck ** 2;

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
      // ドライブモードは級・難易度をよみあげ暗算とまったく同じにするので、表示もlv.yomiageを見る
      const shape = state.mode === 'drive' ? lv.yomiage : lv[state.mode];
      // 桁数の配列は最小-最大だけを表示する(連続レンジでも[3,4,5,6]のように全部つながず"3-6"にする)
      const digitsLabel = Array.isArray(shape.digits) ? `${shape.digits[0]}-${shape.digits[shape.digits.length - 1]}` : shape.digits;
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
      } else if (state.mode === 'drive') {
        startDriveSession();
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

  $('#drive-btn-stop').addEventListener('click', () => {
    SoundFX.click();
    quitDriveSession();
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
  $('#hud-level').textContent = LEVELS[state.level].name + ' ' + HUD_MODE_LABEL[state.mode];
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
    // よみあげ暗算・よみあげそろばんは、どちらも耳で聞いて計算する(画面には数字を出さない)
    const shape = level[state.mode];
    yomiageDisplay.style.display = 'flex';
    $('#yomiage-status').textContent = 'よみあげちゅう…';
    await SpeechEngine.speakProblem(problem.terms, shape.speechRate, shape.speechPause, () => token !== state.sessionToken);
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

/* ---------- ドライブモード ----------
   画面を見られない状況(車の運転中など)向けに、問題→こたえの順に声だけで
   無限に読み上げつづけるモード。採点も答え入力もなく、「とめる」を押すまで続く。
   級・難易度はよみあげ暗算(LEVELS[key].yomiage)をそのまま流用する。
------------------------------------------------------------ */
function startDriveSession() {
  state.driveToken = (state.driveToken || 0) + 1;
  state.driveCount = 0;
  $('#drive-hud-level').textContent = LEVELS[state.level].name;
  showScreen('screen-drive-play');
  runDriveLoop(state.driveToken);
}

function quitDriveSession() {
  state.driveToken = (state.driveToken || 0) + 1;
  SpeechEngine.cancel();
  showScreen('screen-level');
}

async function runDriveLoop(token) {
  const shape = LEVELS[state.level].yomiage;
  while (token === state.driveToken) {
    state.driveCount++;
    $('#drive-hud-count').textContent = `${state.driveCount}問目`;
    $('#drive-status').textContent = 'よみあげちゅう…';

    const problem = generateProblem(state.level, 'yomiage');
    await SpeechEngine.speakProblem(problem.terms, shape.speechRate, shape.speechPause, () => token !== state.driveToken);
    if (token !== state.driveToken) return;

    await sleep(1200); // こたえを考える時間
    if (token !== state.driveToken) return;

    $('#drive-status').textContent = 'こたえあわせ';
    await SpeechEngine.announceAnswer(problem.answer, shape.speechRate);
    if (token !== state.driveToken) return;

    await sleep(1800); // つぎの問題までの間
  }
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
    state.pendingReward = pickRewardItem(pct, state.level, state.mode);
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
    state.pendingReward = pickRewardItem(pct, state.level, state.mode);
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

const RARITY_TIER_INDEX = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
// レアリティが高いほど、たまり時間(ms)・振れ幅・パーティクル数を増やして豪華にする
const REWARD_FX_BY_TIER = [
  { chargeMs: 300, shake: 2, particles: 0 },
  { chargeMs: 450, shake: 3, particles: 10 },
  { chargeMs: 650, shake: 5, particles: 18 },
  { chargeMs: 950, shake: 7, particles: 28 },
  { chargeMs: 1400, shake: 10, particles: 42 },
];
const PARTICLE_COLORS_BY_RARITY = {
  common: ['#e2e2e2', '#a3a3a3'],
  uncommon: ['#7dd3ff', '#4a90c4'],
  rare: ['#b79cff', '#6a4ac4'],
  epic: ['#f0a3ff', '#b545c9'],
  legendary: ['#ffe27a', '#ff8a5c', '#ffd23f'],
};

function showRewardScreen() {
  const packEl = $('#reward-pack');
  const cardEl = $('#reward-card');
  const raysEl = $('#reward-rays');
  const particlesEl = $('#reward-particles');
  const flashEl = $('#reward-flash');
  const screenEl = $('#screen-reward');

  packEl.classList.remove('opened', 'charging');
  packEl.style.removeProperty('--charge-duration');
  packEl.style.removeProperty('--shake');
  packEl.style.display = '';
  cardEl.classList.remove('show');
  cardEl.style.display = 'none';
  cardEl.innerHTML = '';
  raysEl.className = 'reward-rays';
  particlesEl.innerHTML = '';
  flashEl.classList.remove('show');
  screenEl.classList.remove('screen-reward-shake');
  showScreen('screen-reward');
}

// パックをタップしてから、レアリティに応じた「たまり」演出をはさんで開封する
function openRewardPack() {
  const item = state.pendingReward;
  const packEl = $('#reward-pack');
  if (!item || packEl.classList.contains('opened') || packEl.classList.contains('charging')) return;

  const tierIdx = RARITY_TIER_INDEX[item.rarity];
  const fx = REWARD_FX_BY_TIER[tierIdx];

  packEl.classList.add('charging');
  packEl.style.setProperty('--charge-duration', `${fx.chargeMs / 1000}s`);
  packEl.style.setProperty('--shake', String(fx.shake));
  SoundFX.packCharge(item.rarity);

  setTimeout(() => revealReward(item, tierIdx, fx), fx.chargeMs);
}

// たまり演出のあと、実際にアイテムを見せる(画面フラッシュ・光の輪・パーティクル・
// レアリティが高いほど派手な効果音と画面シェイクを重ねる)
function revealReward(item, tierIdx, fx) {
  const packEl = $('#reward-pack');
  const cardEl = $('#reward-card');
  const raysEl = $('#reward-rays');
  const flashEl = $('#reward-flash');
  const screenEl = $('#screen-reward');
  const meta = RARITY_META[item.rarity];

  addToInventory(item.name);
  SoundFX.packBurst(item.rarity);

  packEl.classList.remove('charging');
  packEl.classList.add('opened');

  flashEl.style.setProperty('--flash-opacity', String(0.25 + tierIdx * 0.15));
  flashEl.classList.remove('show');
  void flashEl.offsetWidth; // アニメーションを再生し直すための強制リフロー
  flashEl.classList.add('show');

  if (tierIdx >= 2) {
    screenEl.classList.remove('screen-reward-shake');
    void screenEl.offsetWidth;
    screenEl.classList.add('screen-reward-shake');
  }

  raysEl.className = `reward-rays show rarity-${item.rarity}`;
  spawnRewardParticles(item.rarity, fx.particles);

  cardEl.className = `reward-card ${meta.className} show`;
  cardEl.innerHTML = `
    <div class="reward-icon">${item.icon}</div>
    <div class="reward-name">${item.name}</div>
    <div class="reward-rarity">${meta.label}</div>
  `;
  cardEl.style.display = 'flex';
}

function spawnRewardParticles(rarity, count) {
  const container = $('#reward-particles');
  container.innerHTML = '';
  const colors = PARTICLE_COLORS_BY_RARITY[rarity];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    const angle = Math.random() * Math.PI * 2;
    const dist = 50 + Math.random() * 70;
    const size = 5 + Math.random() * 5;
    el.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
    el.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
    el.style.setProperty('--rot', `${Math.round(Math.random() * 720 - 360)}deg`);
    el.style.setProperty('--particle-delay', `${(Math.random() * 0.15).toFixed(2)}s`);
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    container.appendChild(el);
  }
}

/* ---------- 初期化 ---------- */
document.addEventListener('DOMContentLoaded', () => {
  buildLevelGrid();
  initNav();
  initKeypad();
  initSorobanNav();
});
