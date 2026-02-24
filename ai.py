"""Enemy AI movement and behaviour for Dungeon Nanpa Chronicle."""

from __future__ import annotations

import random
from entities import Enemy, AIType, Player
from dungeon import DungeonMap
from battle import enemy_attack


# ---------------------------------------------------------------------------
# Direction helpers
# ---------------------------------------------------------------------------

DIRECTIONS = [
    (-1, -1), (0, -1), (1, -1),
    (-1, 0),           (1, 0),
    (-1, 1),  (0, 1),  (1, 1),
]


def _distance(x1: int, y1: int, x2: int, y2: int) -> float:
    return ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5


def _sign(n: int) -> int:
    if n > 0:
        return 1
    elif n < 0:
        return -1
    return 0


# ---------------------------------------------------------------------------
# AI step
# ---------------------------------------------------------------------------

def process_enemy_turn(
    enemy: Enemy,
    player: Player,
    dmap: DungeonMap,
) -> list[str]:
    """Process a single enemy's turn. Returns log messages."""

    messages: list[str] = []

    if not enemy.is_alive:
        return messages

    # Sleep check (special_cooldown used as sleep counter)
    if enemy.special_cooldown > 0:
        enemy.special_cooldown -= 1
        return messages

    # Speed system: accumulate energy
    enemy._energy += enemy.speed
    while enemy._energy >= 1.0:
        enemy._energy -= 1.0
        msgs = _do_action(enemy, player, dmap)
        messages.extend(msgs)
        if not player.is_alive or not enemy.is_alive:
            break

    return messages


def _do_action(
    enemy: Enemy,
    player: Player,
    dmap: DungeonMap,
) -> list[str]:
    """Single action for the enemy."""

    messages: list[str] = []

    # Check adjacency — if next to player, attack
    dx = player.x - enemy.x
    dy = player.y - enemy.y
    if abs(dx) <= 1 and abs(dy) <= 1:
        messages.extend(enemy_attack(enemy, player))
        return messages

    # Move based on AI type
    if enemy.ai_type == AIType.CHASE:
        _move_toward(enemy, player.x, player.y, dmap)
    elif enemy.ai_type == AIType.FLEE:
        dist = _distance(enemy.x, enemy.y, player.x, player.y)
        if dist < 6:
            _move_away(enemy, player.x, player.y, dmap)
        else:
            _move_random(enemy, dmap)
    elif enemy.ai_type == AIType.WANDER:
        dist = _distance(enemy.x, enemy.y, player.x, player.y)
        if dist < 5:
            _move_toward(enemy, player.x, player.y, dmap)
        else:
            _move_random(enemy, dmap)
    elif enemy.ai_type == AIType.SPECIAL:
        # Queen special: sometimes heals or does area effect
        if random.random() < 0.3:
            enemy.hp = min(enemy.max_hp, enemy.hp + 5)
            messages.append(f"{enemy.name}が自己回復した！")
        else:
            _move_toward(enemy, player.x, player.y, dmap)

    return messages


def _can_move_to(enemy: Enemy, x: int, y: int, dmap: DungeonMap) -> bool:
    """Check if an enemy can move to (x, y)."""
    if not dmap.is_walkable(x, y):
        return False
    # Don't step on other enemies
    for e in dmap.enemies:
        if e is not enemy and e.is_alive and e.x == x and e.y == y:
            return False
    return True


def _move_toward(enemy: Enemy, tx: int, ty: int, dmap: DungeonMap):
    """Move one step toward target."""
    dx = _sign(tx - enemy.x)
    dy = _sign(ty - enemy.y)

    # Try diagonal first, then axis-aligned
    candidates = [
        (dx, dy),
        (dx, 0), (0, dy),
    ]
    for cdx, cdy in candidates:
        if cdx == 0 and cdy == 0:
            continue
        nx, ny = enemy.x + cdx, enemy.y + cdy
        if _can_move_to(enemy, nx, ny, dmap):
            enemy.x = nx
            enemy.y = ny
            return


def _move_away(enemy: Enemy, tx: int, ty: int, dmap: DungeonMap):
    """Move one step away from target."""
    dx = -_sign(tx - enemy.x)
    dy = -_sign(ty - enemy.y)

    candidates = [
        (dx, dy),
        (dx, 0), (0, dy),
    ]
    for cdx, cdy in candidates:
        if cdx == 0 and cdy == 0:
            continue
        nx, ny = enemy.x + cdx, enemy.y + cdy
        if _can_move_to(enemy, nx, ny, dmap):
            enemy.x = nx
            enemy.y = ny
            return
    # Fallback: random
    _move_random(enemy, dmap)


def _move_random(enemy: Enemy, dmap: DungeonMap):
    """Move in a random direction."""
    dirs = list(DIRECTIONS)
    random.shuffle(dirs)
    for dx, dy in dirs:
        nx, ny = enemy.x + dx, enemy.y + dy
        if _can_move_to(enemy, nx, ny, dmap):
            enemy.x = nx
            enemy.y = ny
            return
