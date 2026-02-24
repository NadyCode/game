/* data.js — All game constants, templates, and configuration. */

const TILE_SIZE = 32;
const VIEWPORT_W = 25;  // tiles visible horizontally
const VIEWPORT_H = 15;  // tiles visible vertically
const MAP_W = 60;
const MAP_H = 30;
const MAX_FLOOR = 15;
const MAX_INVENTORY = 20;
const CANVAS_W = 800;
const CANVAS_H = 640;
const MAP_PIXEL_H = VIEWPORT_H * TILE_SIZE;  // 480
const HUD_Y = MAP_PIXEL_H;
const HUD_H = 50;
const MSG_Y = HUD_Y + HUD_H;

// Tile types
const TILE = { WALL: 0, FLOOR: 1, STAIRS: 2 };

// Item categories
const ITEM_CAT = { CONSUMABLE: 0, WEAPON: 1, ARMOR: 2, SYNTH_BAG: 3 };

// AI types
const AI = { CHASE: 0, WANDER: 1, FLEE: 2, SPECIAL: 3 };

// Game states
const STATE = {
  TITLE: 0, EXPLORE: 1, INVENTORY: 2, GAME_OVER: 3, VICTORY: 4,
  DELIVERY: 5, SYNTH_BASE: 6, SYNTH_MATERIAL: 7,
};

// Ability seals
const ABILITY_SEALS = {
  '三': '3方向同時ナンパ',
  '連': '2回連続ナンパ',
  '金': 'ゴールドドロップ2倍',
  '回': '毎ターンLP1回復',
  '飯': 'MP減少を半分にする',
  '眠': '確率で敵を眠らせる',
  '炎': 'ナンパにLP追加ダメージ',
  '盾': '被ダメージ時25%で無効化',
  '速': '移動速度2倍',
  '見': 'フロア全体が見える',
};

// Level-up EXP table
const EXP_TABLE = [
  0, 0, 10, 25, 50, 80, 120, 170, 230, 300, 380,
  470, 570, 680, 800, 930, 1070, 1220, 1380, 1550, 1730
];

// ---------- Enemy templates ----------

const ENEMY_TEMPLATES = [
  // Floor 1-3
  { name:'JK', hp:8, atk:2, def:1, speed:1.0, ai:AI.WANDER, exp:3, char:'K',
    color:'#ffaacc', fMin:1, fMax:3 },
  { name:'ギャル', hp:12, atk:3, def:1, speed:1.0, ai:AI.WANDER, exp:5, char:'G',
    color:'#ff77aa', fMin:1, fMax:5 },
  { name:'腐女子', hp:10, atk:4, def:0, speed:1.0, ai:AI.FLEE, exp:6, char:'F',
    color:'#aa88ff', fMin:1, fMax:4 },
  // Floor 2-5
  { name:'地雷系女子', hp:15, atk:5, def:2, speed:1.0, ai:AI.CHASE, exp:8, char:'J',
    color:'#ff4466', fMin:2, fMax:7 },
  { name:'コスプレイヤー', hp:14, atk:4, def:2, speed:1.0, ai:AI.WANDER, exp:7, char:'P',
    color:'#ff99ff', fMin:2, fMax:6 },
  { name:'メイド', hp:11, atk:3, def:3, speed:1.0, ai:AI.WANDER, exp:6, char:'D',
    color:'#6699ff', fMin:2, fMax:5 },
  // Floor 3-7
  { name:'OL', hp:20, atk:6, def:3, speed:1.0, ai:AI.WANDER, exp:12, char:'O',
    color:'#88aacc', fMin:3, fMax:8 },
  { name:'ナース', hp:18, atk:5, def:2, speed:1.0, ai:AI.WANDER, exp:10, char:'N',
    color:'#ffffff', fMin:3, fMax:7 },
  { name:'地下アイドル', hp:10, atk:4, def:1, speed:0.5, ai:AI.FLEE, exp:15, char:'I',
    color:'#ffee44', fMin:4, fMax:9 },
  // Floor 5-10
  { name:'女教師', hp:25, atk:7, def:4, speed:1.0, ai:AI.CHASE, exp:16, char:'T',
    color:'#44aa66', fMin:5, fMax:10 },
  { name:'ヤンキー女', hp:22, atk:9, def:2, speed:1.0, ai:AI.CHASE, exp:18, char:'Y',
    color:'#ff6600', fMin:5, fMax:10 },
  { name:'読モ', hp:16, atk:5, def:3, speed:1.0, ai:AI.FLEE, exp:14, char:'R',
    color:'#eedd88', fMin:5, fMax:9 },
  { name:'セレブ', hp:30, atk:8, def:5, speed:2.0, ai:AI.CHASE, exp:22, char:'C',
    color:'#ffcc00', fMin:6, fMax:12 },
  // Floor 7-12
  { name:'ギャルママ', hp:35, atk:10, def:4, speed:1.0, ai:AI.CHASE, exp:25, char:'M',
    color:'#ee6688', fMin:7, fMax:15 },
  { name:'キャバ嬢', hp:28, atk:11, def:3, speed:1.0, ai:AI.WANDER, exp:24, char:'H',
    color:'#cc66ff', fMin:7, fMax:13 },
  { name:'魔女っ子', hp:20, atk:12, def:2, speed:1.0, ai:AI.SPECIAL, exp:28, char:'W',
    color:'#9944cc', fMin:8, fMax:14 },
  // Floor 10+
  { name:'女王様', hp:50, atk:14, def:7, speed:1.0, ai:AI.SPECIAL, exp:40, char:'Q',
    color:'#ff0044', fMin:10, fMax:99 },
];

// ---------- Item templates ----------

const CONSUMABLE_ITEMS = [
  { name:'エナジードリンク', healLP:30, healMP:0, desc:'LPを30回復' },
  { name:'高級エナジードリンク', healLP:100, healMP:0, desc:'LPを100回復' },
  { name:'プロテインバー', healLP:0, healMP:50, desc:'MPを50回復' },
  { name:'タピオカミルクティー', healLP:0, healMP:999, desc:'MPを全回復' },
  { name:'煙幕スプレー', healLP:0, healMP:0, desc:'ランダムワープ', special:'warp' },
  { name:'宅配伝票', healLP:0, healMP:0, desc:'アイテム1つを拠点に送る', delivery:true },
];

const WEAPON_ITEMS = [
  { name:'シルバーリング', atkBonus:2, slots:3, desc:'基本のアクセサリー' },
  { name:'ゴールドネックレス', atkBonus:4, slots:4, desc:'トーク力UP' },
  { name:'ダイヤのピアス', atkBonus:7, slots:5, desc:'高級アクセサリー' },
  { name:'ロレックス（偽）', atkBonus:10, slots:2, desc:'見た目だけは一流' },
];

const ARMOR_ITEMS = [
  { name:'ユニクロコーデ', defBonus:2, slots:3, desc:'基本のファッション' },
  { name:'韓国系セットアップ', defBonus:4, slots:4, desc:'メンタル耐性UP' },
  { name:'ブランドスーツ', defBonus:7, slots:5, desc:'高級ファッション' },
  { name:'ホスト風フルコーデ', defBonus:10, slots:2, desc:'最強コーデ' },
];

// ---------- Flavour text ----------

const NANPA_LINES = [
  '「ねぇねぇ、今ヒマ？」',
  '「マジ可愛いんだけど！」',
  '「俺とお茶しない？」',
  '「LINE教えてよ！」',
  '「今日めっちゃ綺麗だね！」',
  '「運命感じちゃったんだけど！」',
  '「ていうか、モデルさん？」',
  '「この後どっか行こうよ！」',
];

const COUNTER_LINES = [
  'ビンタされた！',
  '「キモい」と言われた！',
  '無視された上に蹴られた！',
  'ドリンクをかけられた！',
  '「彼氏いるんで」と冷たく言われた！',
  'ハンドバッグで殴られた！',
];

const SUCCESS_LINES = [
  '心の壁にヒビが入った！',
  'ちょっと笑ってくれた！',
  '「…ウザいけど嫌いじゃない」',
  '反応が柔らかくなった！',
];

const DEFEAT_LINES = [
  'お持ち帰り成功！',
  'ついに心を開いてくれた！',
  'LINE交換に成功した！',
  'デートの約束を取り付けた！',
];

const ENEMY_ATTACK_LINES = [
  '{name}がビンタしてきた！',
  '{name}が冷たい視線を浴びせた！',
  '{name}が罵倒してきた！',
  '{name}がヒールで踏んできた！',
];

// Utility
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function sign(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }
function dist(x1, y1, x2, y2) { return Math.sqrt((x2-x1)**2 + (y2-y1)**2); }
