/* renderer.js — High-quality Canvas 2D renderer. */

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  }

  clear() {
    this.ctx.fillStyle = '#08081a';
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // ---- Map ----

  drawMap(game) {
    const dmap = game.dmap;
    const p = game.player;
    if (!dmap) return;
    const seeAll = p.hasAbility('見');
    let camX = p.x - Math.floor(VIEWPORT_W / 2);
    let camY = p.y - Math.floor(VIEWPORT_H / 2);
    camX = clamp(camX, 0, dmap.w - VIEWPORT_W);
    camY = clamp(camY, 0, dmap.h - VIEWPORT_H);

    for (let sy = 0; sy < VIEWPORT_H; sy++) {
      for (let sx = 0; sx < VIEWPORT_W; sx++) {
        const mx = camX + sx, my = camY + sy;
        const px = sx * TILE_SIZE, py = sy * TILE_SIZE;
        if (!dmap.inBounds(mx, my)) { this.ctx.drawImage(spriteFog(), px, py); continue; }
        if (!seeAll && !dmap.isExplored(mx, my)) { this.ctx.drawImage(spriteFog(), px, py); continue; }

        const tile = dmap.tiles[my][mx];
        if (tile === TILE.WALL) this.ctx.drawImage(spriteWall(), px, py);
        else if (tile === TILE.STAIRS) this.ctx.drawImage(spriteStairs(), px, py);
        else this.ctx.drawImage(spriteFloor(), px, py);

        const fi = dmap.itemAt(mx, my);
        if (fi) this.ctx.drawImage(spriteItem(fi.item.category), px, py);

        const enemy = dmap.enemyAt(mx, my);
        if (enemy) {
          const tmpl = ENEMY_TEMPLATES.find(t => t.char === enemy.char);
          if (tmpl) this.ctx.drawImage(spriteEnemy(tmpl), px, py);
          this._miniBar(px, py + 1, enemy.hp, enemy.maxHp, '#ee3344', '#441111');
        }

        if (mx === p.x && my === p.y) {
          this.ctx.drawImage(spritePlayer(), px, py);
          this._miniBar(px, py + 1, p.hp, p.maxHp, '#44ee88', '#113322');
        }
      }
    }
  }

  _miniBar(px, py, val, max, fg, bg) {
    const w = TILE_SIZE - 4;
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(px + 2, py, w, 3);
    this.ctx.fillStyle = fg;
    this.ctx.fillRect(px + 2, py, Math.max(1, Math.floor(w * val / max)), 3);
  }

  // ---- HUD ----

  drawHUD(game) {
    const p = game.player;
    const ctx = this.ctx;
    const y0 = HUD_Y;

    // Background panel
    const grad = ctx.createLinearGradient(0, y0, 0, y0 + HUD_H);
    grad.addColorStop(0, '#12122a');
    grad.addColorStop(1, '#0a0a1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y0, CANVAS_W, HUD_H);
    // Top border accent
    ctx.fillStyle = '#3a3a6e';
    ctx.fillRect(0, y0, CANVAS_W, 1);
    ctx.fillStyle = '#2a2a5e';
    ctx.fillRect(0, y0 + 1, CANVAS_W, 1);

    ctx.textBaseline = 'top';
    const y1 = y0 + 7, y2 = y0 + 28;
    let x;

    // ---- Row 1: floor, bars, level ----
    // Floor badge
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ffcc44';
    ctx.fillText(`${p.floor}F`, 12, y1);

    // LP bar
    x = 55;
    this._statBar(ctx, x, y1, 130, 14, p.hp, p.maxHp, '#44ee88', '#22663a', 'LP');

    // MP bar
    x = 200;
    this._statBar(ctx, x, y1, 130, 14, p.mp, p.maxMp, '#44aaff', '#223a66', 'MP');

    // Level
    x = 350;
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#ffcc44';
    ctx.fillText(`Lv.${p.level}`, x, y1 + 1);

    // Stats
    x = 420;
    ctx.font = '13px monospace';
    ctx.fillStyle = '#ff9966';
    ctx.fillText(`トーク:${p.effAtk}`, x, y1 + 1);
    x = 530;
    ctx.fillStyle = '#66aaff';
    ctx.fillText(`耐性:${p.effDef}`, x, y1 + 1);
    x = 630;
    ctx.fillStyle = '#ffee44';
    ctx.fillText(`G:${p.gold}`, x, y1 + 1);
    x = 720;
    ctx.fillStyle = '#999';
    ctx.fillText(`T:${p.turnCount}`, x, y1 + 1);

    // ---- Row 2: equipment ----
    ctx.font = '12px monospace';
    x = 12;
    const wName = p.weapon ? p.weapon.displayName : 'なし';
    const aName = p.armor ? p.armor.displayName : 'なし';
    ctx.fillStyle = '#cc8844';
    ctx.fillText(`武器: ${wName}`, x, y2);
    x = 300;
    ctx.fillStyle = '#4488cc';
    ctx.fillText(`防具: ${aName}`, x, y2);
    x = 590;
    ctx.fillStyle = '#777';
    ctx.fillText(`持物: ${p.inventory.length}/${MAX_INVENTORY}  EXP:${p.exp}`, x, y2);
  }

  _statBar(ctx, x, y, w, h, val, max, fg, bg, label) {
    const ratio = val / Math.max(1, max);
    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    // Fill
    const fillW = Math.max(0, Math.floor(w * ratio));
    const grd = ctx.createLinearGradient(x, y, x, y + h);
    grd.addColorStop(0, fg);
    grd.addColorStop(1, darken(fg, 0.7));
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, fillW, h);
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    // Text
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    ctx.fillText(`${label} ${val}/${max}`, x + 4, y + 2);
  }

  // ---- Messages ----

  drawMessages(msgs) {
    const ctx = this.ctx;
    const y0 = MSG_Y;
    const h = CANVAS_H - y0;

    // Background
    const grad = ctx.createLinearGradient(0, y0, 0, CANVAS_H);
    grad.addColorStop(0, '#0c0c22');
    grad.addColorStop(1, '#06061a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y0, CANVAS_W, h);
    ctx.fillStyle = '#2a2a5e';
    ctx.fillRect(0, y0, CANVAS_W, 1);

    ctx.font = '12px monospace';
    ctx.textBaseline = 'top';
    const lineH = 16;
    const maxLines = Math.floor((h - 10) / lineH);
    const visible = msgs.slice(-maxLines);
    for (let i = 0; i < visible.length; i++) {
      const alpha = 0.4 + 0.6 * ((i + 1) / visible.length); // fade older
      ctx.fillStyle = `rgba(210,210,230,${alpha})`;
      ctx.fillText(visible[i], 12, y0 + 5 + i * lineH, CANVAS_W - 24);
    }
  }

  // ---- Title ----

  drawTitle() {
    this.clear();
    const ctx = this.ctx;
    const cx = CANVAS_W / 2;

    // Background glow
    const grd = ctx.createRadialGradient(cx, 200, 20, cx, 200, 300);
    grd.addColorStop(0, 'rgba(180,60,140,0.15)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Title
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 32px monospace';
    // Shadow
    ctx.fillStyle = '#440033';
    ctx.fillText('ダンジョン・ナンパ・クロニクル', cx + 2, 162);
    ctx.fillStyle = '#ee44aa';
    ctx.fillText('ダンジョン・ナンパ・クロニクル', cx, 160);

    ctx.font = '15px monospace';
    ctx.fillStyle = '#aa88cc';
    ctx.fillText('~ Dungeon Nanpa Chronicle ~', cx, 200);

    // Decorative line
    ctx.strokeStyle = '#44336a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 160, 230); ctx.lineTo(cx + 160, 230); ctx.stroke();

    ctx.font = '14px monospace';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('チャラ男が「ナンパ」でダンジョンを攻略する', cx, 280);
    ctx.fillText('不思議のダンジョン系ローグライクRPG', cx, 305);
    ctx.fillStyle = '#aaa';
    ctx.fillText(`全 ${MAX_FLOOR} フロアを踏破せよ！`, cx, 340);

    // Start prompt (pulsing via simple draw)
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#ffcc44';
    ctx.fillText('[ PRESS ENTER TO START ]', cx, 430);

    // Controls
    ctx.font = '11px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('移動: WASD / 矢印キー / テンキー', cx, 510);
    ctx.fillText('ナンパ攻撃: 敵のいる方向に移動  |  [G]拾う  [I]持物  [S]合成  [>]階段', cx, 530);

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // ---- Inventory overlay ----

  drawInventory(game) {
    const ctx = this.ctx;
    const p = game.player;

    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Panel
    const panelX = 40, panelY = 20, panelW = CANVAS_W - 80, panelH = CANVAS_H - 40;
    this._panel(ctx, panelX, panelY, panelW, panelH, 'インベントリ');

    ctx.font = '13px monospace';
    if (!p.inventory.length) {
      ctx.fillStyle = '#666';
      ctx.fillText('持ち物がない。', panelX + 20, panelY + 60);
    } else {
      for (let i = 0; i < p.inventory.length; i++) {
        const item = p.inventory[i];
        const y = panelY + 50 + i * 24;
        if (y > panelY + panelH - 50) break;

        if (i === game.cursor) {
          const grd = ctx.createLinearGradient(panelX + 10, y - 2, panelX + panelW - 10, y - 2);
          grd.addColorStop(0, 'rgba(68,170,255,0.35)');
          grd.addColorStop(1, 'rgba(68,170,255,0.05)');
          ctx.fillStyle = grd;
          ctx.fillRect(panelX + 10, y - 4, panelW - 20, 22);
          ctx.fillStyle = '#fff';
        } else {
          ctx.fillStyle = '#bbb';
        }
        const arrow = i === game.cursor ? '\u25b6' : ' ';
        const cat = `[${item.catLabel}]`;
        ctx.fillText(`${arrow} ${cat} ${item.displayName}  ${item.desc}`, panelX + 20, y + 10);
      }
    }

    this._helpBar(ctx, '[↑↓] 選択   [Enter] 使う   [E] 装備   [D] 置く   [I/Q] 閉じる');
  }

  // ---- Synthesis ----

  drawSynthSelect(game, isBase) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const title = isBase ? '合成: ベース選択' : '合成: 素材選択';
    const panelX = 40, panelY = 20, panelW = CANVAS_W - 80, panelH = CANVAS_H - 40;
    this._panel(ctx, panelX, panelY, panelW, panelH, title);

    let equips = game.getInventoryEquips();
    if (!isBase) equips = equips.filter(([i]) => i !== game.synthBaseIdx);

    ctx.font = '13px monospace';
    if (!equips.length) {
      ctx.fillStyle = '#666';
      ctx.fillText('合成できる装備がない。', panelX + 20, panelY + 60);
    } else {
      for (let j = 0; j < equips.length; j++) {
        const [, item] = equips[j];
        const y = panelY + 50 + j * 24;
        if (j === game.cursor) {
          ctx.fillStyle = 'rgba(68,170,255,0.25)';
          ctx.fillRect(panelX + 10, y - 4, panelW - 20, 22);
          ctx.fillStyle = '#fff';
        } else {
          ctx.fillStyle = '#bbb';
        }
        let line = `${j === game.cursor ? '\u25b6' : ' '} [${item.catLabel}] ${item.displayName}`;
        if (item.abilities.length) {
          line += '  印:' + item.abilities.map(a => `${a}(${ABILITY_SEALS[a]||'?'})`).join(' ');
        }
        ctx.fillText(line, panelX + 20, y + 10);
      }
    }
    this._helpBar(ctx, '[↑↓] 選択   [Enter] 決定   [Q] キャンセル');
  }

  // ---- Delivery ----

  drawDelivery(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const panelX = 40, panelY = 20, panelW = CANVAS_W - 80, panelH = CANVAS_H - 40;
    this._panel(ctx, panelX, panelY, panelW, panelH, '宅配: 送るアイテムを選択');

    ctx.font = '13px monospace';
    const items = game.player.inventory;
    for (let i = 0; i < items.length; i++) {
      const y = panelY + 50 + i * 24;
      if (y > panelY + panelH - 50) break;
      if (i === game.cursor) {
        ctx.fillStyle = 'rgba(68,170,255,0.25)';
        ctx.fillRect(panelX + 10, y - 4, panelW - 20, 22);
        ctx.fillStyle = '#fff';
      } else {
        ctx.fillStyle = '#bbb';
      }
      ctx.fillText(`${i === game.cursor ? '\u25b6' : ' '} ${items[i].displayName}`, panelX + 20, y + 10);
    }
    this._helpBar(ctx, '[↑↓] 選択   [Enter] 送る   [Q] キャンセル');
  }

  // ---- Game Over ----

  drawGameOver(game) {
    this.clear();
    const ctx = this.ctx;
    const cx = CANVAS_W / 2;

    // Red vignette
    const grd = ctx.createRadialGradient(cx, 250, 30, cx, 250, 350);
    grd.addColorStop(0, 'rgba(180,20,20,0.15)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 42px monospace';
    ctx.fillStyle = '#551111';
    ctx.fillText('GAME OVER', cx + 2, 202);
    ctx.fillStyle = '#ff3333';
    ctx.fillText('GAME OVER', cx, 200);

    ctx.font = '18px monospace';
    ctx.fillStyle = '#cc8888';
    ctx.fillText('力尽きた…', cx, 260);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#999';
    ctx.fillText('全てのアイテムとゴールドを失った。', cx, 330);
    ctx.fillText(`到達階: ${game.player.floor}F`, cx, 360);

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ffcc44';
    ctx.fillText('[ PRESS ENTER ]', cx, 460);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // ---- Victory ----

  drawVictory(game) {
    this.clear();
    const ctx = this.ctx;
    const cx = CANVAS_W / 2;

    const grd = ctx.createRadialGradient(cx, 200, 20, cx, 200, 350);
    grd.addColorStop(0, 'rgba(68,255,136,0.15)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 38px monospace';
    ctx.fillStyle = '#114422';
    ctx.fillText('CONGRATULATIONS!', cx + 2, 182);
    ctx.fillStyle = '#44ff88';
    ctx.fillText('CONGRATULATIONS!', cx, 180);

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#88ffaa';
    ctx.fillText('ダンジョン攻略成功！', cx, 240);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText(`最終レベル: ${game.player.level}`, cx, 320);
    ctx.fillText(`ターン数: ${game.player.turnCount}`, cx, 350);
    ctx.fillText(`所持ゴールド: ${game.player.gold}`, cx, 380);

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ffcc44';
    ctx.fillText('[ PRESS ENTER ]', cx, 470);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // ---- UI helpers ----

  _panel(ctx, x, y, w, h, title) {
    // Outer border
    ctx.fillStyle = '#2a2a5e';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    // Background
    const grd = ctx.createLinearGradient(x, y, x, y + h);
    grd.addColorStop(0, '#14142c');
    grd.addColorStop(1, '#0a0a1e');
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, w, h);
    // Title bar
    ctx.fillStyle = '#1e1e44';
    ctx.fillRect(x, y, w, 30);
    ctx.fillStyle = '#3a3a6e';
    ctx.fillRect(x, y + 30, w, 1);

    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#ee44aa';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + w / 2, y + 20);
    ctx.textAlign = 'left';
  }

  _helpBar(ctx, text) {
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(0, CANVAS_H - 30, CANVAS_W, 30);
    ctx.fillStyle = '#3a3a6e';
    ctx.fillRect(0, CANVAS_H - 30, CANVAS_W, 1);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText(text, CANVAS_W / 2, CANVAS_H - 12);
    ctx.textAlign = 'left';
  }

  // ---- Dispatch ----

  render(game) {
    this.clear();
    switch (game.state) {
      case STATE.TITLE: this.drawTitle(); break;
      case STATE.EXPLORE:
        this.drawMap(game); this.drawHUD(game); this.drawMessages(game.messages); break;
      case STATE.INVENTORY:
        this.drawMap(game); this.drawHUD(game); this.drawInventory(game); break;
      case STATE.DELIVERY:
        this.drawMap(game); this.drawHUD(game); this.drawDelivery(game); break;
      case STATE.SYNTH_BASE:
        this.drawMap(game); this.drawHUD(game); this.drawSynthSelect(game, true); break;
      case STATE.SYNTH_MATERIAL:
        this.drawMap(game); this.drawHUD(game); this.drawSynthSelect(game, false); break;
      case STATE.GAME_OVER: this.drawGameOver(game); break;
      case STATE.VICTORY: this.drawVictory(game); break;
    }
  }
}
