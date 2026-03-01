/* game.js — Main game engine: state management, turns, input. */

class Storage {
  constructor() { this.items = []; this.maxItems = 30; }
  deposit(item) {
    if (this.items.length >= this.maxItems) return [false, 'コインロッカーがいっぱいだ！'];
    this.items.push(item);
    return [true, `${item.displayName} をコインロッカーに預けた。`];
  }
  deliver(player, item) {
    if (this.items.length >= this.maxItems) return [false, 'コインロッカーがいっぱいで届けられない！'];
    const idx = player.inventory.indexOf(item);
    if (idx >= 0) player.inventory.splice(idx, 1);
    else return [false, 'そのアイテムは送れない。'];
    this.items.push(item);
    return [true, `${item.displayName} を拠点に送った！`];
  }
}

class Game {
  constructor() {
    this.player = new Player();
    this.dmap = null;
    this.state = STATE.TITLE;
    this.messages = [];
    this.storage = new Storage();
    this.cursor = 0;
    this.synthBaseIdx = -1;
  }

  newGame() {
    this.player = new Player();
    this.player.floor = 1;
    this.state = STATE.EXPLORE;
    this.messages = ['ダンジョンに足を踏み入れた…！'];
    this._genFloor();
  }

  _genFloor() {
    this.dmap = generateDungeon(this.player.floor);
    if (this.dmap.rooms.length) {
      const r = this.dmap.rooms[0];
      this.player.x = r.cx;
      this.player.y = r.cy;
      this.dmap.revealRoom(r);
    }
    this.messages.push(`--- ${this.player.floor}F ---`);
  }

  // ---- Input handling ----

  handleKey(key) {
    switch (this.state) {
      case STATE.TITLE: return this._titleKey(key);
      case STATE.EXPLORE: return this._exploreKey(key);
      case STATE.INVENTORY: return this._inventoryKey(key);
      case STATE.DELIVERY: return this._deliveryKey(key);
      case STATE.SYNTH_BASE: return this._synthBaseKey(key);
      case STATE.SYNTH_MATERIAL: return this._synthMatKey(key);
      case STATE.GAME_OVER: return this._endKey(key);
      case STATE.VICTORY: return this._endKey(key);
    }
  }

  _titleKey(key) {
    if (key === 'Enter' || key === ' ') this.newGame();
  }

  // ---- Exploration ----

  static MOVE_MAP = {
    // WASD
    'a': [-1,0], 'd': [1,0], 'w': [0,-1], 's_move': [0,1],
    // vi keys
    'h': [-1,0], 'l': [1,0], 'k': [0,-1], 'j': [0,1],
    'y': [-1,-1], 'u': [1,-1], 'b': [-1,1], 'n': [1,1],
    // arrows
    'ArrowLeft': [-1,0], 'ArrowRight': [1,0], 'ArrowUp': [0,-1], 'ArrowDown': [0,1],
    // numpad
    '4': [-1,0], '6': [1,0], '8': [0,-1], '2': [0,1],
    '7': [-1,-1], '9': [1,-1], '1': [-1,1], '3': [1,1],
  };

  _exploreKey(key) {
    // S for synthesis (not move down)
    if (key === 's') { this._startSynthesis(); return; }

    // Check movement
    const moveKey = key === 's' ? 's_move' : key;
    const dir = Game.MOVE_MAP[moveKey];
    if (dir) { this._tryMove(dir[0], dir[1]); return; }

    if (key === '.' || key === '5') { this._endTurn(); return; }
    if (key === 'g') { this._pickUp(); return; }
    if (key === 'i') { this.state = STATE.INVENTORY; this.cursor = 0; return; }
    if (key === '>') { this._tryDescend(); return; }
  }

  _tryMove(dx, dy) {
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    // Attack enemy?
    const enemy = this.dmap.enemyAt(nx, ny);
    if (enemy) {
      this.messages.push(...performNanpa(this.player, enemy));
      if (!enemy.alive) {
        const idx = this.dmap.enemies.indexOf(enemy);
        if (idx >= 0) this.dmap.enemies.splice(idx, 1);
      }
      this._endTurn();
      return;
    }

    // Normal move
    if (this.dmap.isWalkable(nx, ny)) {
      this.player.x = nx;
      this.player.y = ny;
      const room = this.dmap.roomAt(nx, ny);
      if (room) this.dmap.revealRoom(room);
      else this.dmap.revealAround(nx, ny);
      this._endTurn();
    }
  }

  _endTurn() {
    this.player.turnCount++;

    // MP drain (1 per 10 turns; LP drain when MP=0)
    this.messages.push(...this.player.consumeMP());

    // Regen ability
    if (this.player.hasAbility('回')) {
      const h = this.player.heal(1);
      if (h > 0) this.messages.push('LP が 1 回復した。(回)');
    }

    if (!this.player.alive) { this._die(); return; }

    // Enemy turns
    for (const enemy of [...this.dmap.enemies]) {
      if (!enemy.alive) continue;
      this.messages.push(...processEnemyTurn(enemy, this.player, this.dmap));
      if (!this.player.alive) { this._die(); return; }
    }
  }

  _pickUp() {
    const fi = this.dmap.itemAt(this.player.x, this.player.y);
    if (!fi) { this.messages.push('ここにはアイテムがない。'); return; }
    if (this.player.canPickUp()) {
      this.player.inventory.push(fi.item);
      this.messages.push(`${fi.item.displayName} を拾った！`);
      this.dmap.removeItem(fi);
    } else {
      this.messages.push('持ち物がいっぱいだ！');
    }
  }

  _tryDescend() {
    if (this.player.x === this.dmap.stairsX && this.player.y === this.dmap.stairsY) {
      this.player.floor++;
      if (this.player.floor > MAX_FLOOR) {
        this.state = STATE.VICTORY;
        this.messages.push('最上階に到達した！ ダンジョン攻略成功！！');
        return;
      }
      this.messages.push(`${this.player.floor}Fへ降りた…`);
      this._genFloor();
    } else {
      this.messages.push('ここに階段はない。');
    }
  }

  _die() {
    this.state = STATE.GAME_OVER;
    this.messages.push(...this.player.resetOnDeath());
  }

  // ---- Inventory ----

  _inventoryKey(key) {
    const items = this.player.inventory;
    if (key === 'i' || key === 'q' || key === 'Escape') { this.state = STATE.EXPLORE; return; }
    if (key === 'ArrowUp' || key === 'k' || key === 'w') { this.cursor = Math.max(0, this.cursor - 1); return; }
    if (key === 'ArrowDown' || key === 'j' || key === 's') { this.cursor = Math.min(items.length - 1, this.cursor + 1); return; }
    if (key === 'Enter' || key === ' ') {
      if (this.cursor >= 0 && this.cursor < items.length) this._useItem(this.cursor);
      return;
    }
    if (key === 'e') {
      if (this.cursor >= 0 && this.cursor < items.length) this._equipItem(this.cursor);
      return;
    }
    if (key === 'd') {
      if (this.cursor >= 0 && this.cursor < items.length) {
        const item = items.splice(this.cursor, 1)[0];
        this.dmap.floorItems.push(new FloorItem(item, this.player.x, this.player.y));
        this.messages.push(`${item.displayName} を置いた。`);
        this.cursor = Math.min(this.cursor, items.length - 1);
      }
      return;
    }
  }

  _useItem(idx) {
    const item = this.player.inventory[idx];
    if (item.category === ITEM_CAT.CONSUMABLE) {
      if (item.healLP > 0) {
        const h = this.player.heal(item.healLP);
        this.messages.push(`${item.name} を使った！ LP が ${h} 回復した！`);
      } else if (item.healMP > 0) {
        const before = this.player.mp;
        this.player.mp = Math.min(this.player.maxMp, this.player.mp + item.healMP);
        this.messages.push(`${item.name} を使った！ MP が ${this.player.mp - before} 回復した！`);
      } else if (item.delivery) {
        this.state = STATE.DELIVERY;
        this.cursor = 0;
        this.messages.push('どのアイテムを拠点に送る？');
        return;
      } else if (item.special === 'warp') {
        // Random warp
        if (this.dmap.rooms.length) {
          const room = pick(this.dmap.rooms);
          const [wx, wy] = room.randomPoint();
          this.player.x = wx; this.player.y = wy;
          this.dmap.revealRoom(room);
          this.messages.push('煙幕スプレーで別の場所にワープした！');
        }
      } else {
        this.messages.push(`${item.name} を使った！`);
      }
      this.player.inventory.splice(idx, 1);
      this.state = STATE.EXPLORE;
      this._endTurn();
    } else if (item.category === ITEM_CAT.SYNTH_BAG) {
      this._startSynthesis();
    } else {
      this.messages.push('このアイテムは使えない。装備(E)してみよう。');
    }
  }

  _equipItem(idx) {
    const item = this.player.inventory[idx];
    if (item.category === ITEM_CAT.WEAPON) {
      const old = this.player.equipWeapon(item);
      this.messages.push(`${item.displayName} を装備した！`);
      if (old) { this.player.inventory.push(old); this.messages.push(`${old.displayName} を外した。`); }
    } else if (item.category === ITEM_CAT.ARMOR) {
      const old = this.player.equipArmor(item);
      this.messages.push(`${item.displayName} を着た！`);
      if (old) { this.player.inventory.push(old); this.messages.push(`${old.displayName} を脱いだ。`); }
    } else {
      this.messages.push('これは装備できない。');
    }
  }

  // ---- Delivery ----

  _deliveryKey(key) {
    const items = this.player.inventory;
    if (key === 'q' || key === 'Escape') { this.state = STATE.INVENTORY; return; }
    if (key === 'ArrowUp' || key === 'k') { this.cursor = Math.max(0, this.cursor - 1); return; }
    if (key === 'ArrowDown' || key === 'j') { this.cursor = Math.min(items.length - 1, this.cursor + 1); return; }
    if (key === 'Enter' || key === ' ') {
      if (this.cursor >= 0 && this.cursor < items.length) {
        const target = items[this.cursor];
        // Find and remove delivery slip
        const slipIdx = items.findIndex((it, i) => it.delivery && it !== target);
        if (slipIdx >= 0) {
          items.splice(slipIdx, 1);
          if (this.cursor > slipIdx) this.cursor--;
        }
        const [ok, msg] = this.storage.deliver(this.player, target);
        this.messages.push(msg);
        this.state = STATE.EXPLORE;
        if (ok) this._endTurn();
      }
    }
  }

  // ---- Synthesis ----

  _startSynthesis() {
    const hasBag = this.player.inventory.some(it => it.category === ITEM_CAT.SYNTH_BAG);
    if (!hasBag) { this.messages.push('セレクトショップの袋を持っていない！'); return; }
    this.state = STATE.SYNTH_BASE;
    this.cursor = 0;
    this.messages.push('合成のベースにする装備を選んでください。');
  }

  getInventoryEquips() {
    return this.player.inventory
      .map((it, i) => [i, it])
      .filter(([, it]) => it.category === ITEM_CAT.WEAPON || it.category === ITEM_CAT.ARMOR);
  }

  _synthBaseKey(key) {
    const equips = this.getInventoryEquips();
    if (key === 'q' || key === 'Escape') { this.state = STATE.EXPLORE; return; }
    if (key === 'ArrowUp' || key === 'k') { this.cursor = Math.max(0, this.cursor - 1); return; }
    if (key === 'ArrowDown' || key === 'j') { this.cursor = Math.min(equips.length - 1, this.cursor + 1); return; }
    if (key === 'Enter' || key === ' ') {
      if (this.cursor >= 0 && this.cursor < equips.length) {
        this.synthBaseIdx = equips[this.cursor][0];
        this.state = STATE.SYNTH_MATERIAL;
        this.cursor = 0;
        this.messages.push('合成する素材の装備を選んでください。');
      }
    }
  }

  _synthMatKey(key) {
    const equips = this.getInventoryEquips().filter(([i]) => i !== this.synthBaseIdx);
    if (key === 'q' || key === 'Escape') { this.state = STATE.EXPLORE; return; }
    if (key === 'ArrowUp' || key === 'k') { this.cursor = Math.max(0, this.cursor - 1); return; }
    if (key === 'ArrowDown' || key === 'j') { this.cursor = Math.min(equips.length - 1, this.cursor + 1); return; }
    if (key === 'Enter' || key === ' ') {
      if (this.cursor >= 0 && this.cursor < equips.length) {
        const matIdx = equips[this.cursor][0];
        const base = this.player.inventory[this.synthBaseIdx];
        const mat = this.player.inventory[matIdx];
        const [, msgs] = synthesize(base, mat);
        this.messages.push(...msgs);
        // Remove material (higher index first)
        this.player.inventory.splice(matIdx, 1);
        // Remove synth bag
        const bagIdx = this.player.inventory.findIndex(it => it.category === ITEM_CAT.SYNTH_BAG);
        if (bagIdx >= 0) this.player.inventory.splice(bagIdx, 1);
        this.state = STATE.EXPLORE;
        this._endTurn();
      }
    }
  }

  // ---- End screens ----

  _endKey(key) {
    if (key === 'Enter' || key === ' ') this.state = STATE.TITLE;
  }
}
