/* renderer.js — Canvas 2D renderer. */

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  }

  clear() {
    this.ctx.fillStyle = '#0a0a18';
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // ---- Map rendering ----

  drawMap(game) {
    const dmap = game.dmap;
    const player = game.player;
    if (!dmap) return;

    const seeAll = player.hasAbility('見');

    // Camera
    let camX = player.x - Math.floor(VIEWPORT_W / 2);
    let camY = player.y - Math.floor(VIEWPORT_H / 2);
    camX = clamp(camX, 0, dmap.w - VIEWPORT_W);
    camY = clamp(camY, 0, dmap.h - VIEWPORT_H);

    for (let sy = 0; sy < VIEWPORT_H; sy++) {
      for (let sx = 0; sx < VIEWPORT_W; sx++) {
        const mx = camX + sx;
        const my = camY + sy;
        const px = sx * TILE_SIZE;
        const py = sy * TILE_SIZE;

        if (!dmap.inBounds(mx, my)) {
          this.ctx.drawImage(spriteFog(), px, py);
          continue;
        }

        // Fog of war
        if (!seeAll && !dmap.isExplored(mx, my)) {
          this.ctx.drawImage(spriteFog(), px, py);
          continue;
        }

        // Base tile
        const tile = dmap.tiles[my][mx];
        if (tile === TILE.WALL) {
          this.ctx.drawImage(spriteWall(), px, py);
        } else if (tile === TILE.STAIRS) {
          this.ctx.drawImage(spriteStairs(), px, py);
        } else {
          this.ctx.drawImage(spriteFloor(), px, py);
        }

        // Floor item
        const fi = dmap.itemAt(mx, my);
        if (fi) {
          this.ctx.drawImage(spriteItem(fi.item.category), px, py);
        }

        // Enemy
        const enemy = dmap.enemyAt(mx, my);
        if (enemy) {
          const tmpl = ENEMY_TEMPLATES.find(t => t.char === enemy.char);
          if (tmpl) this.ctx.drawImage(spriteEnemy(tmpl), px, py);
          // HP bar
          this.drawMiniHP(px, py, enemy.hp, enemy.maxHp, '#ff4444');
        }

        // Player
        if (mx === player.x && my === player.y) {
          this.ctx.drawImage(spritePlayer(), px, py);
        }
      }
    }
  }

  drawMiniHP(px, py, hp, maxHp, color) {
    const ratio = hp / maxHp;
    const barW = TILE_SIZE - 4;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(px + 2, py, barW, 3);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(px + 2, py, Math.floor(barW * ratio), 3);
  }

  // ---- HUD ----

  drawHUD(game) {
    const p = game.player;
    const ctx = this.ctx;

    // Background
    ctx.fillStyle = '#16162a';
    ctx.fillRect(0, HUD_Y, CANVAS_W, HUD_H);
    ctx.strokeStyle = '#444';
    ctx.beginPath(); ctx.moveTo(0, HUD_Y); ctx.lineTo(CANVAS_W, HUD_Y); ctx.stroke();

    ctx.font = '14px monospace';
    ctx.textBaseline = 'top';

    // Line 1
    const hpRatio = p.hp / Math.max(1, p.maxHp);
    let x = 10;
    const y1 = HUD_Y + 6;

    ctx.fillStyle = '#aaa';
    ctx.fillText(`${p.floor}F`, x, y1); x += 40;

    ctx.fillStyle = hpRatio > 0.3 ? '#44ff88' : '#ff4444';
    ctx.fillText(`LP:${p.hp}/${p.maxHp}`, x, y1); x += 110;

    ctx.fillStyle = '#44aaff';
    ctx.fillText(`MP:${p.mp}/${p.maxMp}`, x, y1); x += 110;

    ctx.fillStyle = '#ffcc44';
    ctx.fillText(`Lv:${p.level}`, x, y1); x += 60;

    ctx.fillStyle = '#ff8866';
    ctx.fillText(`トーク:${p.effAtk}`, x, y1); x += 90;

    ctx.fillStyle = '#66aaff';
    ctx.fillText(`耐性:${p.effDef}`, x, y1); x += 80;

    ctx.fillStyle = '#ffee44';
    ctx.fillText(`G:${p.gold}`, x, y1); x += 70;

    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`EXP:${p.exp}`, x, y1);

    // Line 2
    const y2 = HUD_Y + 28;
    x = 10;
    const wName = p.weapon ? p.weapon.displayName : 'なし';
    const aName = p.armor ? p.armor.displayName : 'なし';
    ctx.fillStyle = '#cc8844';
    ctx.fillText(`武器:${wName}`, x, y2); x += 250;
    ctx.fillStyle = '#4488cc';
    ctx.fillText(`防具:${aName}`, x, y2); x += 250;
    ctx.fillStyle = '#888';
    ctx.fillText(`持物:${p.inventory.length}/${MAX_INVENTORY}`, x, y2);
  }

  // ---- Messages ----

  drawMessages(msgs) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0e0e20';
    ctx.fillRect(0, MSG_Y, CANVAS_W, CANVAS_H - MSG_Y);
    ctx.strokeStyle = '#333';
    ctx.beginPath(); ctx.moveTo(0, MSG_Y); ctx.lineTo(CANVAS_W, MSG_Y); ctx.stroke();

    ctx.font = '13px monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#cccccc';
    const maxLines = Math.floor((CANVAS_H - MSG_Y - 8) / 18);
    const visible = msgs.slice(-maxLines);
    for (let i = 0; i < visible.length; i++) {
      ctx.fillText(visible[i], 10, MSG_Y + 6 + i * 18, CANVAS_W - 20);
    }
  }

  // ---- Title screen ----

  drawTitle() {
    this.clear();
    const ctx = this.ctx;
    const cx = CANVAS_W / 2;

    // Title box
    ctx.fillStyle = '#cc44aa';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ダンジョン・ナンパ・クロニクル', cx, 180);

    ctx.fillStyle = '#aa88cc';
    ctx.font = '16px monospace';
    ctx.fillText('~ Dungeon Nanpa Chronicle ~', cx, 220);

    ctx.fillStyle = '#cccccc';
    ctx.font = '14px monospace';
    ctx.fillText('チャラ男が「ナンパ」でダンジョンを攻略！', cx, 300);
    ctx.fillText(`目標: ${MAX_FLOOR}F を目指せ！`, cx, 330);

    ctx.fillStyle = '#ffcc44';
    ctx.font = '16px monospace';
    ctx.fillText('[Enter / Space] ゲーム開始', cx, 420);

    // Controls help
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText('移動: WASD / 矢印 / テンキー   ナンパ: 敵に向かって移動', cx, 490);
    ctx.fillText('[G]拾う [I]持物 [S]合成 [>]階段 [.]待機', cx, 515);

    ctx.textAlign = 'left';
  }

  // ---- Inventory overlay ----

  drawInventory(game) {
    const ctx = this.ctx;
    const p = game.player;

    // Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#cc44aa';
    ctx.textAlign = 'center';
    ctx.fillText('=== インベントリ ===', CANVAS_W / 2, 30);
    ctx.textAlign = 'left';

    ctx.font = '14px monospace';
    if (!p.inventory.length) {
      ctx.fillStyle = '#888';
      ctx.fillText('持ち物がない。', 40, 70);
    } else {
      for (let i = 0; i < p.inventory.length; i++) {
        const item = p.inventory[i];
        const y = 60 + i * 24;
        if (y > CANVAS_H - 60) break;

        if (i === game.cursor) {
          ctx.fillStyle = '#44aaff';
          ctx.fillRect(30, y - 4, CANVAS_W - 60, 22);
          ctx.fillStyle = '#000';
        } else {
          ctx.fillStyle = '#ccc';
        }
        const cat = `[${item.catLabel}]`;
        ctx.fillText(`${i === game.cursor ? '▶' : ' '} ${cat} ${item.displayName}  ${item.desc}`, 40, y + 10);
      }
    }

    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[↑/↓] 選択  [Enter] 使う  [E] 装備  [D] 置く  [I/Q] 閉じる', CANVAS_W / 2, CANVAS_H - 20);
    ctx.textAlign = 'left';
  }

  // ---- Synthesis select overlay ----

  drawSynthSelect(game, isBase) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const title = isBase ? '合成: ベース選択' : '合成: 素材選択';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#cc44aa';
    ctx.textAlign = 'center';
    ctx.fillText(`=== ${title} ===`, CANVAS_W / 2, 30);
    ctx.textAlign = 'left';

    let equips = game.getInventoryEquips();
    if (!isBase) equips = equips.filter(([i]) => i !== game.synthBaseIdx);

    ctx.font = '14px monospace';
    if (!equips.length) {
      ctx.fillStyle = '#888';
      ctx.fillText('合成できる装備がない。', 40, 70);
    } else {
      for (let j = 0; j < equips.length; j++) {
        const [, item] = equips[j];
        const y = 60 + j * 24;
        if (j === game.cursor) {
          ctx.fillStyle = '#44aaff';
          ctx.fillRect(30, y - 4, CANVAS_W - 60, 22);
          ctx.fillStyle = '#000';
        } else {
          ctx.fillStyle = '#ccc';
        }
        let line = `${j === game.cursor ? '▶' : ' '} [${item.catLabel}] ${item.displayName}`;
        if (item.abilities.length) {
          line += '  印: ' + item.abilities.map(a => `${a}(${ABILITY_SEALS[a]||'?'})`).join(' ');
        }
        ctx.fillText(line, 40, y + 10);
      }
    }

    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[↑/↓] 選択  [Enter] 決定  [Q] キャンセル', CANVAS_W / 2, CANVAS_H - 20);
    ctx.textAlign = 'left';
  }

  // ---- Delivery overlay ----

  drawDelivery(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#cc44aa';
    ctx.textAlign = 'center';
    ctx.fillText('=== 宅配: 送るアイテムを選択 ===', CANVAS_W / 2, 30);
    ctx.textAlign = 'left';

    ctx.font = '14px monospace';
    const items = game.player.inventory;
    for (let i = 0; i < items.length; i++) {
      const y = 60 + i * 24;
      if (y > CANVAS_H - 60) break;
      if (i === game.cursor) {
        ctx.fillStyle = '#44aaff';
        ctx.fillRect(30, y - 4, CANVAS_W - 60, 22);
        ctx.fillStyle = '#000';
      } else {
        ctx.fillStyle = '#ccc';
      }
      ctx.fillText(`${i === game.cursor ? '▶' : ' '} ${items[i].displayName}`, 40, y + 10);
    }

    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[↑/↓] 選択  [Enter] 送る  [Q] キャンセル', CANVAS_W / 2, CANVAS_H - 20);
    ctx.textAlign = 'left';
  }

  // ---- Game over ----

  drawGameOver(game) {
    this.clear();
    const ctx = this.ctx;
    const cx = CANVAS_W / 2;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('GAME OVER', cx, 200);

    ctx.fillStyle = '#cc8888';
    ctx.font = '18px monospace';
    ctx.fillText('力尽きた…', cx, 260);

    ctx.fillStyle = '#aaa';
    ctx.font = '14px monospace';
    ctx.fillText('全てのアイテムとゴールドを失った。', cx, 330);
    ctx.fillText(`到達階: ${game.player.floor}F`, cx, 360);

    ctx.fillStyle = '#ffcc44';
    ctx.font = '16px monospace';
    ctx.fillText('[Enter] タイトルへ', cx, 450);
    ctx.textAlign = 'left';
  }

  // ---- Victory ----

  drawVictory(game) {
    this.clear();
    const ctx = this.ctx;
    const cx = CANVAS_W / 2;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#44ff88';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('CONGRATULATIONS!', cx, 180);

    ctx.fillStyle = '#88ffaa';
    ctx.font = '20px monospace';
    ctx.fillText('ダンジョン攻略成功！', cx, 230);

    ctx.fillStyle = '#ccc';
    ctx.font = '14px monospace';
    ctx.fillText(`最終レベル: ${game.player.level}`, cx, 310);
    ctx.fillText(`ターン数: ${game.player.turnCount}`, cx, 340);
    ctx.fillText(`所持ゴールド: ${game.player.gold}`, cx, 370);

    ctx.fillStyle = '#ffcc44';
    ctx.font = '16px monospace';
    ctx.fillText('[Enter] タイトルへ', cx, 460);
    ctx.textAlign = 'left';
  }

  // ---- Main render dispatch ----

  render(game) {
    this.clear();
    switch (game.state) {
      case STATE.TITLE:
        this.drawTitle(); break;
      case STATE.EXPLORE:
        this.drawMap(game);
        this.drawHUD(game);
        this.drawMessages(game.messages);
        break;
      case STATE.INVENTORY:
        this.drawMap(game);
        this.drawHUD(game);
        this.drawInventory(game);
        break;
      case STATE.DELIVERY:
        this.drawMap(game);
        this.drawHUD(game);
        this.drawDelivery(game);
        break;
      case STATE.SYNTH_BASE:
        this.drawMap(game);
        this.drawHUD(game);
        this.drawSynthSelect(game, true);
        break;
      case STATE.SYNTH_MATERIAL:
        this.drawMap(game);
        this.drawHUD(game);
        this.drawSynthSelect(game, false);
        break;
      case STATE.GAME_OVER:
        this.drawGameOver(game); break;
      case STATE.VICTORY:
        this.drawVictory(game); break;
    }
  }
}
