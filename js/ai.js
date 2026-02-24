/* ai.js — Enemy AI and movement. */

const DIRS = [
  [-1,-1],[0,-1],[1,-1],
  [-1, 0],       [1, 0],
  [-1, 1],[0, 1],[1, 1],
];

function canMoveTo(enemy, x, y, dmap) {
  if (!dmap.isWalkable(x, y)) return false;
  for (const e of dmap.enemies) {
    if (e !== enemy && e.alive && e.x === x && e.y === y) return false;
  }
  return true;
}

function moveToward(enemy, tx, ty, dmap) {
  const dx = sign(tx - enemy.x), dy = sign(ty - enemy.y);
  for (const [cdx, cdy] of [[dx,dy],[dx,0],[0,dy]]) {
    if (cdx === 0 && cdy === 0) continue;
    const nx = enemy.x + cdx, ny = enemy.y + cdy;
    if (canMoveTo(enemy, nx, ny, dmap)) { enemy.x = nx; enemy.y = ny; return; }
  }
}

function moveAway(enemy, tx, ty, dmap) {
  const dx = -sign(tx - enemy.x), dy = -sign(ty - enemy.y);
  for (const [cdx, cdy] of [[dx,dy],[dx,0],[0,dy]]) {
    if (cdx === 0 && cdy === 0) continue;
    const nx = enemy.x + cdx, ny = enemy.y + cdy;
    if (canMoveTo(enemy, nx, ny, dmap)) { enemy.x = nx; enemy.y = ny; return; }
  }
  moveRandom(enemy, dmap);
}

function moveRandom(enemy, dmap) {
  const shuffled = [...DIRS].sort(() => Math.random() - 0.5);
  for (const [dx, dy] of shuffled) {
    const nx = enemy.x + dx, ny = enemy.y + dy;
    if (canMoveTo(enemy, nx, ny, dmap)) { enemy.x = nx; enemy.y = ny; return; }
  }
}

function doEnemyAction(enemy, player, dmap) {
  const msgs = [];
  const dx = player.x - enemy.x, dy = player.y - enemy.y;

  // Adjacent → attack
  if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
    msgs.push(...enemyAttack(enemy, player));
    return msgs;
  }

  // Move based on AI
  const d = dist(enemy.x, enemy.y, player.x, player.y);
  switch (enemy.ai) {
    case AI.CHASE:
      moveToward(enemy, player.x, player.y, dmap);
      break;
    case AI.FLEE:
      if (d < 6) moveAway(enemy, player.x, player.y, dmap);
      else moveRandom(enemy, dmap);
      break;
    case AI.WANDER:
      if (d < 5) moveToward(enemy, player.x, player.y, dmap);
      else moveRandom(enemy, dmap);
      break;
    case AI.SPECIAL:
      if (Math.random() < 0.3) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + 5);
        msgs.push(`${enemy.name}が自己回復した！`);
      } else {
        moveToward(enemy, player.x, player.y, dmap);
      }
      break;
  }
  return msgs;
}

function processEnemyTurn(enemy, player, dmap) {
  const msgs = [];
  if (!enemy.alive) return msgs;

  // Sleep check
  if (enemy.sleepTimer > 0) { enemy.sleepTimer--; return msgs; }

  // Speed system
  enemy.energy += enemy.speed;
  while (enemy.energy >= 1.0) {
    enemy.energy -= 1.0;
    msgs.push(...doEnemyAction(enemy, player, dmap));
    if (!player.alive || !enemy.alive) break;
  }
  return msgs;
}
