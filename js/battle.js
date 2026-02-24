/* battle.js — Nanpa battle system. */

function calcNanpaDamage(player, enemy) {
  let base = Math.max(1, player.effAtk - Math.floor(enemy.def / 2));
  let variance = Math.max(1, Math.floor(base / 4));
  let dmg = base + randInt(-variance, variance);
  if (player.hasAbility('炎')) dmg += randInt(2, 5);
  if (player.hasAbility('連')) dmg = Math.floor(dmg * 1.5);
  return Math.max(1, dmg);
}

function calcCounterDamage(enemy, player) {
  let base = Math.max(1, enemy.atk - Math.floor(player.effDef / 2));
  let variance = Math.max(1, Math.floor(base / 4));
  let dmg = base + randInt(-variance, variance);
  if (player.hasAbility('盾') && Math.random() < 0.25) return 0;
  return Math.max(1, dmg);
}

function performNanpa(player, enemy) {
  const msgs = [];
  msgs.push(pick(NANPA_LINES));
  const dmg = calcNanpaDamage(player, enemy);
  const actual = enemy.takeDamage(dmg);
  msgs.push(pick(SUCCESS_LINES));
  msgs.push(`→ ${enemy.name}の心の壁に ${actual} ダメージ！ (残り ${enemy.hp}/${enemy.maxHp})`);

  if (player.hasAbility('眠') && Math.random() < 0.15) {
    msgs.push(`${enemy.name}は眠ってしまった！`);
    enemy.sleepTimer = 3;
  }

  if (!enemy.alive) {
    msgs.push(pick(DEFEAT_LINES));
    msgs.push(`${enemy.name}を攻略した！ EXP +${enemy.expReward}`);
    let gold = randInt(5, 15) * (1 + Math.floor(player.floor / 3));
    if (player.hasAbility('金')) gold *= 2;
    player.gold += gold;
    msgs.push(`${gold} ゴールドを手に入れた！`);
    msgs.push(...player.addExp(enemy.expReward));
  } else {
    const counter = calcCounterDamage(enemy, player);
    if (counter === 0) {
      msgs.push('カウンターを華麗に回避した！');
    } else {
      player.hp -= counter;
      msgs.push(pick(COUNTER_LINES));
      msgs.push(`→ ${counter} ダメージを受けた！ (LP ${player.hp}/${player.maxHp})`);
      if (player.hp <= 0) { player.hp = 0; player.alive = false; msgs.push('力尽きた…ゲームオーバー'); }
    }
  }
  return msgs;
}

function enemyAttack(enemy, player) {
  const msgs = [];
  msgs.push(pick(ENEMY_ATTACK_LINES).replace('{name}', enemy.name));
  const dmg = calcCounterDamage(enemy, player);
  if (dmg === 0) {
    msgs.push('しかし、ダメージを受けなかった！');
  } else {
    player.hp -= dmg;
    msgs.push(`→ ${dmg} ダメージ！ (LP ${player.hp}/${player.maxHp})`);
    if (player.hp <= 0) { player.hp = 0; player.alive = false; msgs.push('力尽きた…ゲームオーバー'); }
  }
  return msgs;
}
