/* entities.js — Item, Player, Enemy classes. */

class Item {
  constructor(opts = {}) {
    this.name = opts.name || '';
    this.category = opts.category ?? ITEM_CAT.CONSUMABLE;
    this.desc = opts.desc || '';
    this.plus = opts.plus || 0;
    this.maxSlots = opts.maxSlots || 0;
    this.abilities = opts.abilities ? [...opts.abilities] : [];
    this.atkBonus = opts.atkBonus || 0;
    this.defBonus = opts.defBonus || 0;
    this.healLP = opts.healLP || 0;
    this.healMP = opts.healMP || 0;
    this.delivery = opts.delivery || false;
    this.special = opts.special || null;
  }

  get displayName() {
    let s = this.name;
    if (this.plus > 0) s += `+${this.plus}`;
    if (this.abilities.length) s += ` [${this.abilities.join(',')}]`;
    return s;
  }

  get catLabel() {
    return ['消','武','防','袋'][this.category] || '?';
  }

  clone() {
    return new Item({
      name: this.name, category: this.category, desc: this.desc,
      plus: this.plus, maxSlots: this.maxSlots, abilities: [...this.abilities],
      atkBonus: this.atkBonus, defBonus: this.defBonus,
      healLP: this.healLP, healMP: this.healMP,
      delivery: this.delivery, special: this.special,
    });
  }
}

class Player {
  constructor() {
    this.name = 'チャラ男';
    this.hp = 30;  this.maxHp = 30;
    this.mp = 100; this.maxMp = 100;
    this.atk = 5;  this.def = 3;
    this.exp = 0;  this.level = 1;
    this.gold = 0;
    this.x = 0;    this.y = 0;
    this.floor = 1;
    this.turnCount = 0;
    this.weapon = null;  // Item
    this.armor = null;   // Item
    this.inventory = []; // Item[]
    this.alive = true;
  }

  get effAtk() {
    let a = this.atk;
    if (this.weapon) a += this.weapon.atkBonus + this.weapon.plus;
    return a;
  }
  get effDef() {
    let d = this.def;
    if (this.armor) d += this.armor.defBonus + this.armor.plus;
    return d;
  }

  hasAbility(ab) {
    for (const it of [this.weapon, this.armor]) {
      if (it && it.abilities.includes(ab)) return true;
    }
    return false;
  }

  addExp(amount) {
    const msgs = [];
    this.exp += amount;
    while (this.level < EXP_TABLE.length - 1) {
      if (this.exp >= EXP_TABLE[this.level + 1]) {
        this.level++;
        const hpUp = randInt(3, 6);
        this.maxHp += hpUp;
        this.hp = this.maxHp;
        this.atk += randInt(1, 2);
        this.def += randInt(0, 1);
        msgs.push(`チャラさレベルが ${this.level} に上がった！`);
      } else break;
    }
    return msgs;
  }

  consumeMP(amount) {
    const msgs = [];
    this.mp -= amount;
    if (this.mp <= 0) {
      this.mp = 0;
      this.hp -= 1;
      msgs.push('空腹でLPが減っている…！');
      if (this.hp <= 0) { this.hp = 0; this.alive = false; msgs.push('力尽きた…'); }
    } else if (this.mp <= 20) {
      msgs.push('おなかが減ってきた…');
    }
    return msgs;
  }

  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }

  canPickUp() { return this.inventory.length < MAX_INVENTORY; }

  equipWeapon(item) {
    const old = this.weapon;
    this.weapon = item;
    const idx = this.inventory.indexOf(item);
    if (idx >= 0) this.inventory.splice(idx, 1);
    return old;
  }
  equipArmor(item) {
    const old = this.armor;
    this.armor = item;
    const idx = this.inventory.indexOf(item);
    if (idx >= 0) this.inventory.splice(idx, 1);
    return old;
  }

  resetOnDeath() {
    this.inventory = [];
    this.weapon = null;
    this.armor = null;
    this.gold = 0;
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.floor = 1;
    this.alive = true;
    return ['全てのアイテムとゴールドを失った…', '拠点に戻された。'];
  }
}

class Enemy {
  constructor(tmpl) {
    this.name = tmpl.name;
    this.hp = tmpl.hp;   this.maxHp = tmpl.hp;
    this.atk = tmpl.atk; this.def = tmpl.def;
    this.speed = tmpl.speed;
    this.ai = tmpl.ai;
    this.expReward = tmpl.exp;
    this.char = tmpl.char;
    this.color = tmpl.color;
    this.x = 0; this.y = 0;
    this.alive = true;
    this.energy = 0;
    this.sleepTimer = 0;
  }

  takeDamage(amount) {
    const actual = Math.max(1, amount - this.def);
    this.hp -= actual;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; }
    return actual;
  }
}

// ---------- Item factory ----------

function makeConsumable(tmpl) {
  return new Item({
    name: tmpl.name, category: ITEM_CAT.CONSUMABLE, desc: tmpl.desc,
    healLP: tmpl.healLP, healMP: tmpl.healMP,
    delivery: tmpl.delivery || false, special: tmpl.special || null,
  });
}

function makeWeapon(tmpl, plus, abilities) {
  return new Item({
    name: tmpl.name, category: ITEM_CAT.WEAPON, desc: tmpl.desc,
    atkBonus: tmpl.atkBonus, maxSlots: tmpl.slots,
    plus: plus || 0, abilities: abilities || [],
  });
}

function makeArmor(tmpl, plus, abilities) {
  return new Item({
    name: tmpl.name, category: ITEM_CAT.ARMOR, desc: tmpl.desc,
    defBonus: tmpl.defBonus, maxSlots: tmpl.slots,
    plus: plus || 0, abilities: abilities || [],
  });
}

function makeSynthBag() {
  return new Item({
    name: 'セレクトショップの袋', category: ITEM_CAT.SYNTH_BAG,
    desc: '装備を合成できる袋',
  });
}

function randomItemForFloor(floor) {
  const roll = Math.random();
  if (roll < 0.40) {
    return makeConsumable(pick(CONSUMABLE_ITEMS));
  } else if (roll < 0.60) {
    const avail = WEAPON_ITEMS.filter(w => w.atkBonus <= 2 + floor * 2);
    const tmpl = pick(avail.length ? avail : [WEAPON_ITEMS[0]]);
    const plus = Math.random() < 0.3 ? randInt(1, Math.min(3, floor)) : 0;
    return makeWeapon(tmpl, plus);
  } else if (roll < 0.80) {
    const avail = ARMOR_ITEMS.filter(a => a.defBonus <= 2 + floor * 2);
    const tmpl = pick(avail.length ? avail : [ARMOR_ITEMS[0]]);
    const plus = Math.random() < 0.3 ? randInt(1, Math.min(3, floor)) : 0;
    return makeArmor(tmpl, plus);
  } else if (roll < 0.90) {
    return makeSynthBag();
  } else {
    const allEquips = [...WEAPON_ITEMS, ...ARMOR_ITEMS];
    const tmpl = pick(allEquips);
    const seal = pick(Object.keys(ABILITY_SEALS));
    if (tmpl.atkBonus !== undefined) {
      return makeWeapon(tmpl, 0, [seal]);
    } else {
      return makeArmor(tmpl, 0, [seal]);
    }
  }
}

function synthesize(base, material) {
  const msgs = [];
  if (base.category !== ITEM_CAT.WEAPON && base.category !== ITEM_CAT.ARMOR) {
    msgs.push('装備品のみ合成できます。'); return [base, msgs];
  }
  if (material.category !== ITEM_CAT.WEAPON && material.category !== ITEM_CAT.ARMOR) {
    msgs.push('素材は装備品でなければなりません。'); return [base, msgs];
  }
  base.plus += material.plus;
  msgs.push(`強化値 +${material.plus} を継承！`);
  for (const ab of material.abilities) {
    if (base.abilities.includes(ab)) {
      msgs.push(`印「${ab}」は既に付いている。`);
    } else if (base.abilities.length < base.maxSlots) {
      base.abilities.push(ab);
      msgs.push(`印「${ab}」を継承！ (${ABILITY_SEALS[ab] || ''})`);
    } else {
      msgs.push(`印スロットが足りない。「${ab}」は失われた。`);
    }
  }
  msgs.push(`合成完了！ → ${base.displayName}`);
  return [base, msgs];
}
