/* sprites.js — High-quality pixel art sprite system. */

const SpriteCache = {};

function createSprite(key, drawFn) {
  if (SpriteCache[key]) return SpriteCache[key];
  const c = document.createElement('canvas');
  c.width = TILE_SIZE; c.height = TILE_SIZE;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx, TILE_SIZE);
  SpriteCache[key] = c;
  return c;
}

// ---- Helper: draw pixel grid ----
function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w || 1, h || 1);
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

// ===========================================================================
// Tile sprites
// ===========================================================================

function spriteWall() {
  return createSprite('wall', (ctx, s) => {
    // Stone wall with depth
    const grad = ctx.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, '#4a4a6e');
    grad.addColorStop(1, '#2a2a4a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);

    // Brick rows
    const bh = 8;
    for (let row = 0; row < s / bh; row++) {
      const y = row * bh;
      const offset = (row % 2) * (s / 2);
      // Horizontal mortar
      ctx.fillStyle = '#222240';
      ctx.fillRect(0, y, s, 1);
      // Vertical mortar
      for (let bx = offset; bx < s + s; bx += s / 2) {
        ctx.fillRect(bx % s, y, 1, bh);
      }
      // Highlight on top of each brick
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, y + 1, s, 1);
    }
    // Vignette edges
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, 1, s);
    ctx.fillRect(s - 1, 0, 1, s);
  });
}

function spriteFloor() {
  return createSprite('floor', (ctx, s) => {
    ctx.fillStyle = '#1c1c34';
    ctx.fillRect(0, 0, s, s);
    // Stone tiles with subtle borders
    ctx.fillStyle = '#202040';
    ctx.fillRect(1, 1, s - 2, s - 2);
    // Corner accents
    ctx.fillStyle = '#181830';
    ctx.fillRect(0, 0, s, 1);
    ctx.fillRect(0, 0, 1, s);
    // Random subtle specks for texture
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(6, 12, 2, 2);
    ctx.fillRect(18, 6, 2, 2);
    ctx.fillRect(24, 22, 2, 2);
    ctx.fillRect(10, 24, 1, 1);
  });
}

function spriteStairs() {
  return createSprite('stairs', (ctx, s) => {
    // Floor base
    ctx.fillStyle = '#1c1c34';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#202040';
    ctx.fillRect(1, 1, s - 2, s - 2);
    // Glowing stairway
    const grd = ctx.createRadialGradient(s/2, s/2, 2, s/2, s/2, 14);
    grd.addColorStop(0, 'rgba(68,204,136,0.3)');
    grd.addColorStop(1, 'rgba(68,204,136,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, s, s);
    // Steps
    ctx.fillStyle = '#33aa77';
    ctx.fillRect(6, 6, 20, 3);
    ctx.fillStyle = '#2d9968';
    ctx.fillRect(9, 11, 17, 3);
    ctx.fillStyle = '#278858';
    ctx.fillRect(12, 16, 14, 3);
    ctx.fillStyle = '#217748';
    ctx.fillRect(15, 21, 11, 3);
    // Side rails
    ctx.fillStyle = '#55ddaa';
    ctx.fillRect(5, 5, 1, 20);
    ctx.fillRect(26, 5, 1, 20);
    // Down arrow
    ctx.fillStyle = '#88ffcc';
    ctx.fillRect(15, 26, 2, 3);
    ctx.fillRect(14, 28, 4, 1);
    ctx.fillRect(15, 29, 2, 1);
  });
}

function spriteFog() {
  return createSprite('fog', (ctx, s) => {
    ctx.fillStyle = '#08081a';
    ctx.fillRect(0, 0, s, s);
  });
}

// ===========================================================================
// Character sprites — much more detailed
// ===========================================================================

function spritePlayer() {
  return createSprite('player', (ctx, s) => {
    const cx = s / 2;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(cx, 29, 7, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Legs
    ctx.fillStyle = '#2255aa';
    ctx.fillRect(cx - 5, 23, 4, 6);
    ctx.fillRect(cx + 1, 23, 4, 6);
    // Shoes
    ctx.fillStyle = '#cc3333';
    ctx.fillRect(cx - 6, 28, 5, 2);
    ctx.fillRect(cx + 1, 28, 5, 2);

    // Body — jacket
    ctx.fillStyle = '#3388dd';
    ctx.fillRect(cx - 6, 13, 12, 11);
    // Collar / open jacket
    ctx.fillStyle = '#ffddaa';
    ctx.fillRect(cx - 1, 13, 2, 5);
    // Jacket lapels
    ctx.fillStyle = '#2266bb';
    ctx.fillRect(cx - 6, 13, 3, 6);
    ctx.fillRect(cx + 3, 13, 3, 6);
    // Arms
    ctx.fillStyle = '#3388dd';
    ctx.fillRect(cx - 8, 14, 3, 8);
    ctx.fillRect(cx + 5, 14, 3, 8);
    // Hands
    ctx.fillStyle = '#ffddaa';
    ctx.fillRect(cx - 8, 21, 3, 2);
    ctx.fillRect(cx + 5, 21, 3, 2);

    // Head
    ctx.fillStyle = '#ffddaa';
    ctx.beginPath(); ctx.ellipse(cx, 9, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
    // Hair — spiky
    ctx.fillStyle = '#554422';
    ctx.fillRect(cx - 6, 2, 12, 5);
    ctx.fillRect(cx - 7, 3, 2, 5);
    ctx.fillRect(cx + 5, 3, 2, 5);
    // Hair spikes
    ctx.fillStyle = '#665533';
    ctx.fillRect(cx - 5, 1, 2, 3);
    ctx.fillRect(cx + 0, 0, 2, 3);
    ctx.fillRect(cx + 4, 1, 2, 3);

    // Sunglasses
    ctx.fillStyle = '#111';
    ctx.fillRect(cx - 5, 7, 4, 3);
    ctx.fillRect(cx + 1, 7, 4, 3);
    ctx.fillStyle = '#4488ff';
    ctx.fillRect(cx - 4, 8, 2, 1);
    ctx.fillRect(cx + 2, 8, 2, 1);
    // Bridge
    ctx.fillStyle = '#111';
    ctx.fillRect(cx - 1, 8, 2, 1);

    // Mouth — smirk
    ctx.fillStyle = '#cc6655';
    ctx.fillRect(cx - 2, 12, 4, 1);
    ctx.fillRect(cx + 1, 11, 2, 1);

    // Gold chain
    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(cx - 3, 13, 6, 1);
    ctx.fillRect(cx - 1, 14, 2, 1);
  });
}

function spriteEnemy(tmpl) {
  const key = 'enemy_' + tmpl.char;
  return createSprite(key, (ctx, s) => {
    const cx = s / 2;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(cx, 29, 6, 2, 0, 0, Math.PI * 2); ctx.fill();

    // Legs
    ctx.fillStyle = darken(tmpl.color, 0.5);
    ctx.fillRect(cx - 4, 23, 3, 5);
    ctx.fillRect(cx + 1, 23, 3, 5);
    // Shoes
    ctx.fillStyle = darken(tmpl.color, 0.4);
    ctx.fillRect(cx - 5, 27, 4, 2);
    ctx.fillRect(cx + 1, 27, 4, 2);

    // Body — outfit
    ctx.fillStyle = tmpl.color;
    ctx.fillRect(cx - 5, 13, 10, 11);
    // Outfit detail
    ctx.fillStyle = lighten(tmpl.color, 0.2);
    ctx.fillRect(cx - 1, 15, 2, 4);
    // Arms
    ctx.fillStyle = tmpl.color;
    ctx.fillRect(cx - 7, 14, 3, 7);
    ctx.fillRect(cx + 4, 14, 3, 7);
    // Hands
    ctx.fillStyle = '#ffe0cc';
    ctx.fillRect(cx - 7, 20, 3, 2);
    ctx.fillRect(cx + 4, 20, 3, 2);

    // Head
    ctx.fillStyle = '#ffe0cc';
    ctx.beginPath(); ctx.ellipse(cx, 9, 5, 6, 0, 0, Math.PI * 2); ctx.fill();

    // Hair — varies by type
    const hc = getHairColor(tmpl.char);
    drawEnemyHair(ctx, s, tmpl.char, hc);

    // Eyes
    ctx.fillStyle = '#222';
    ctx.fillRect(cx - 4, 8, 2, 2);
    ctx.fillRect(cx + 2, 8, 2, 2);
    // Eye shine
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - 3, 8, 1, 1);
    ctx.fillRect(cx + 3, 8, 1, 1);
    // Mouth
    ctx.fillStyle = '#dd6666';
    ctx.fillRect(cx - 1, 12, 2, 1);

    // Type letter badge
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, cx - 5, s - 10, 10, 9, 2, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tmpl.char, cx, s - 5);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  });
}

function drawEnemyHair(ctx, s, ch, color) {
  const cx = s / 2;
  ctx.fillStyle = color;
  switch(ch) {
    case 'I': // Idol — twintails
      ctx.fillRect(cx - 5, 2, 10, 5);
      ctx.fillRect(cx - 7, 4, 3, 10);
      ctx.fillRect(cx + 4, 4, 3, 10);
      // Ribbons
      ctx.fillStyle = '#ff4488';
      ctx.fillRect(cx - 8, 5, 2, 2);
      ctx.fillRect(cx + 6, 5, 2, 2);
      break;
    case 'Q': // Queen — crown
      ctx.fillRect(cx - 5, 2, 10, 5);
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(cx - 5, 0, 10, 3);
      ctx.fillRect(cx - 5, 0, 2, 4);
      ctx.fillRect(cx - 1, 0, 2, 4);
      ctx.fillRect(cx + 3, 0, 2, 4);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(cx - 4, 1, 1, 1);
      ctx.fillRect(cx, 1, 1, 1);
      ctx.fillRect(cx + 4, 1, 1, 1);
      break;
    case 'W': // Witch — hat
      ctx.fillRect(cx - 5, 3, 10, 5);
      ctx.fillStyle = '#5522aa';
      ctx.fillRect(cx - 7, 2, 14, 3);
      ctx.fillRect(cx - 4, 0, 8, 3);
      ctx.fillRect(cx - 2, -2, 4, 3);
      ctx.fillRect(cx - 1, -3, 2, 2);
      break;
    case 'M': // Gyaru mama — big hair
      ctx.fillRect(cx - 6, 2, 12, 6);
      ctx.fillRect(cx - 7, 3, 2, 10);
      ctx.fillRect(cx + 5, 3, 2, 10);
      ctx.fillStyle = lighten(color, 0.2);
      ctx.fillRect(cx - 4, 2, 3, 3);
      break;
    case 'H': // Hostess — updo
      ctx.fillRect(cx - 5, 2, 10, 5);
      ctx.fillRect(cx - 3, 0, 6, 4);
      ctx.fillStyle = '#ffcc44';
      ctx.fillRect(cx - 1, 1, 2, 1); // hair pin
      break;
    default: // Standard bob/long
      ctx.fillRect(cx - 5, 2, 10, 5);
      ctx.fillRect(cx - 6, 4, 2, 7);
      ctx.fillRect(cx + 4, 4, 2, 7);
      break;
  }
}

function getHairColor(ch) {
  const map = {
    'K':'#332211', 'G':'#ddaa44', 'F':'#222244', 'J':'#111111',
    'P':'#ff66aa', 'D':'#443322', 'O':'#332222', 'N':'#221111',
    'I':'#ffee44', 'T':'#222222', 'Y':'#cc8800', 'R':'#aa7744',
    'C':'#eedd88', 'M':'#dd8844', 'H':'#aa44cc', 'W':'#6622aa',
    'Q':'#cc0022',
  };
  return map[ch] || '#333';
}

// Color utility
function darken(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(Math.floor(r * amt), Math.floor(g * amt), Math.floor(b * amt));
}
function lighten(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    Math.min(255, Math.floor(r + (255 - r) * amt)),
    Math.min(255, Math.floor(g + (255 - g) * amt)),
    Math.min(255, Math.floor(b + (255 - b) * amt))
  );
}
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  return [parseInt(hex.substring(0,2),16), parseInt(hex.substring(2,4),16), parseInt(hex.substring(4,6),16)];
}
function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join('');
}

// ===========================================================================
// Item sprites — detailed icons
// ===========================================================================

function spriteItem(category) {
  const key = 'item_' + category;
  return createSprite(key, (ctx, s) => {
    // Floor base
    ctx.fillStyle = '#1c1c34';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#202040';
    ctx.fillRect(1, 1, s - 2, s - 2);

    const cx = s / 2;
    // Glow
    const glow = ctx.createRadialGradient(cx, cx, 1, cx, cx, 12);

    switch (category) {
      case ITEM_CAT.CONSUMABLE:
        glow.addColorStop(0, 'rgba(68,255,136,0.25)');
        glow.addColorStop(1, 'rgba(68,255,136,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, s, s);
        // Bottle
        ctx.fillStyle = '#226644';
        ctx.fillRect(cx - 2, 7, 4, 3);
        roundRect(ctx, cx - 5, 10, 10, 14, 2, '#44ff88', '#33cc66');
        // Label
        ctx.fillStyle = '#33cc66';
        ctx.fillRect(cx - 4, 13, 8, 4);
        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(cx - 4, 11, 2, 8);
        // Cap
        ctx.fillStyle = '#888';
        ctx.fillRect(cx - 2, 6, 4, 2);
        break;

      case ITEM_CAT.WEAPON:
        glow.addColorStop(0, 'rgba(255,204,68,0.3)');
        glow.addColorStop(1, 'rgba(255,204,68,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, s, s);
        // Ring
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffcc44';
        ctx.beginPath(); ctx.arc(cx, cx + 2, 7, 0, Math.PI * 2); ctx.stroke();
        // Inner shine
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#ffee88';
        ctx.beginPath(); ctx.arc(cx, cx + 2, 5, 0.5, 2); ctx.stroke();
        // Gem
        ctx.fillStyle = '#ff2266';
        ctx.beginPath();
        ctx.moveTo(cx, cx - 8);
        ctx.lineTo(cx - 4, cx - 3);
        ctx.lineTo(cx + 4, cx - 3);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff6699';
        ctx.fillRect(cx - 1, cx - 6, 2, 2);
        break;

      case ITEM_CAT.ARMOR:
        glow.addColorStop(0, 'rgba(68,136,255,0.25)');
        glow.addColorStop(1, 'rgba(68,136,255,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, s, s);
        // T-shirt
        ctx.fillStyle = '#4488ff';
        // Torso
        ctx.fillRect(cx - 6, 10, 12, 14);
        // Sleeves
        ctx.fillRect(cx - 10, 10, 5, 8);
        ctx.fillRect(cx + 5, 10, 5, 8);
        // Collar
        ctx.fillStyle = '#1c1c34';
        ctx.beginPath();
        ctx.moveTo(cx - 2, 10);
        ctx.lineTo(cx, 14);
        ctx.lineTo(cx + 2, 10);
        ctx.closePath(); ctx.fill();
        // Highlight
        ctx.fillStyle = '#5599ff';
        ctx.fillRect(cx - 5, 11, 2, 6);
        break;

      case ITEM_CAT.SYNTH_BAG:
        glow.addColorStop(0, 'rgba(204,136,255,0.25)');
        glow.addColorStop(1, 'rgba(204,136,255,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, s, s);
        // Shopping bag
        roundRect(ctx, cx - 7, 11, 14, 16, 2, '#cc88ff', '#aa66dd');
        // Handle
        ctx.strokeStyle = '#aa66dd';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx - 3, 11, 3, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + 3, 11, 3, Math.PI, 0); ctx.stroke();
        // Logo
        ctx.fillStyle = '#eeccff';
        ctx.fillRect(cx - 2, 17, 4, 4);
        // Tissue paper
        ctx.fillStyle = '#ffe0ff';
        ctx.fillRect(cx - 4, 8, 3, 4);
        ctx.fillRect(cx + 1, 7, 3, 5);
        break;
    }
  });
}

// ===========================================================================
// Init
// ===========================================================================

function initSprites() {
  spriteWall(); spriteFloor(); spriteStairs(); spriteFog();
  spritePlayer();
  for (const tmpl of ENEMY_TEMPLATES) spriteEnemy(tmpl);
  for (let c = 0; c <= 3; c++) spriteItem(c);
}
