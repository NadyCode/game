/* sprites.js — Pixel art sprite drawing on canvas. */

const SpriteCache = {};

function createSprite(key, drawFn) {
  if (SpriteCache[key]) return SpriteCache[key];
  const c = document.createElement('canvas');
  c.width = TILE_SIZE; c.height = TILE_SIZE;
  const ctx = c.getContext('2d');
  drawFn(ctx, TILE_SIZE);
  SpriteCache[key] = c;
  return c;
}

// ---- Tile sprites ----

function spriteWall() {
  return createSprite('wall', (ctx, s) => {
    ctx.fillStyle = '#3a3a5c';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#2a2a4c';
    ctx.lineWidth = 1;
    // Brick pattern
    for (let y = 0; y < s; y += 8) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke();
    }
    for (let y = 0; y < s; y += 16) {
      for (let x = 0; x < s; x += 16) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 8); ctx.stroke();
      }
      for (let x = 8; x < s; x += 16) {
        ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x, y + 16); ctx.stroke();
      }
    }
  });
}

function spriteFloor() {
  return createSprite('floor', (ctx, s) => {
    ctx.fillStyle = '#1e1e3a';
    ctx.fillRect(0, 0, s, s);
    // Subtle dots
    ctx.fillStyle = '#24244a';
    for (let i = 0; i < 3; i++) {
      const x = (i * 11 + 5) % s, y = (i * 7 + 3) % s;
      ctx.fillRect(x, y, 2, 2);
    }
  });
}

function spriteStairs() {
  return createSprite('stairs', (ctx, s) => {
    ctx.fillStyle = '#1e1e3a';
    ctx.fillRect(0, 0, s, s);
    // Staircase icon
    ctx.fillStyle = '#44cc88';
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const x = 4 + i * 6;
      const y = 6 + i * 5;
      const w = s - 8 - i * 6;
      ctx.fillRect(x, y, w, 4);
    }
  });
}

function spriteFog() {
  return createSprite('fog', (ctx, s) => {
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, s, s);
  });
}

// ---- Character sprite (generic humanoid) ----

function drawCharSprite(ctx, s, headColor, bodyColor, hairStyle) {
  const cx = s / 2;
  // Body
  ctx.fillStyle = bodyColor;
  ctx.fillRect(cx - 5, 14, 10, 12);
  // Legs
  ctx.fillRect(cx - 5, 26, 4, 4);
  ctx.fillRect(cx + 1, 26, 4, 4);
  // Head
  ctx.fillStyle = headColor;
  ctx.beginPath();
  ctx.arc(cx, 10, 7, 0, Math.PI * 2);
  ctx.fill();
  // Hair
  ctx.fillStyle = hairStyle || '#333';
  ctx.fillRect(cx - 7, 3, 14, 5);
  if (hairStyle === '#ffee44') {
    // Twintails for idol
    ctx.fillRect(cx - 9, 5, 3, 8);
    ctx.fillRect(cx + 6, 5, 3, 8);
  }
}

function spritePlayer() {
  return createSprite('player', (ctx, s) => {
    drawCharSprite(ctx, s, '#ffddaa', '#44aadd', '#554422');
    // Sunglasses
    ctx.fillStyle = '#222';
    ctx.fillRect(s/2 - 6, 8, 5, 3);
    ctx.fillRect(s/2 + 1, 8, 5, 3);
    ctx.fillRect(s/2 - 1, 9, 2, 1);
    // Smirk
    ctx.fillStyle = '#cc4444';
    ctx.fillRect(s/2 - 2, 13, 4, 1);
  });
}

function spriteEnemy(tmpl) {
  const key = 'enemy_' + tmpl.char;
  return createSprite(key, (ctx, s) => {
    const headColor = '#ffe0cc';
    drawCharSprite(ctx, s, headColor, tmpl.color, getHairColor(tmpl.char));
    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(s/2 - 4, 9, 2, 2);
    ctx.fillRect(s/2 + 2, 9, 2, 2);
    // Character letter
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(tmpl.char, s/2, s - 1);
  });
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

// ---- Item sprites ----

function spriteItem(category) {
  const key = 'item_' + category;
  return createSprite(key, (ctx, s) => {
    ctx.fillStyle = '#1e1e3a';
    ctx.fillRect(0, 0, s, s);
    const cx = s / 2;
    switch (category) {
      case ITEM_CAT.CONSUMABLE:
        // Potion bottle
        ctx.fillStyle = '#44ff88';
        ctx.fillRect(cx - 3, 8, 6, 4);
        ctx.fillRect(cx - 5, 12, 10, 12);
        ctx.fillStyle = '#33cc66';
        ctx.fillRect(cx - 4, 14, 8, 8);
        break;
      case ITEM_CAT.WEAPON:
        // Ring / accessory
        ctx.fillStyle = '#ffcc44';
        ctx.beginPath();
        ctx.arc(cx, s/2, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e1e3a';
        ctx.beginPath();
        ctx.arc(cx, s/2, 5, 0, Math.PI * 2);
        ctx.fill();
        // Gem
        ctx.fillStyle = '#ff4488';
        ctx.fillRect(cx - 2, s/2 - 9, 4, 4);
        break;
      case ITEM_CAT.ARMOR:
        // Shirt
        ctx.fillStyle = '#4488ff';
        ctx.fillRect(cx - 7, 8, 14, 16);
        ctx.fillRect(cx - 12, 8, 6, 10);
        ctx.fillRect(cx + 6, 8, 6, 10);
        ctx.fillStyle = '#3366cc';
        ctx.fillRect(cx - 2, 10, 4, 6);
        break;
      case ITEM_CAT.SYNTH_BAG:
        // Shopping bag
        ctx.fillStyle = '#cc88ff';
        ctx.fillRect(cx - 6, 10, 12, 16);
        ctx.strokeStyle = '#aa66dd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, 10, 4, Math.PI, 0);
        ctx.stroke();
        break;
    }
  });
}

// Pre-generate common sprites
function initSprites() {
  spriteWall();
  spriteFloor();
  spriteStairs();
  spriteFog();
  spritePlayer();
  for (const tmpl of ENEMY_TEMPLATES) spriteEnemy(tmpl);
  for (let c = 0; c <= 3; c++) spriteItem(c);
}
