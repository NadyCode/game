"""Nanpa (flirt) battle system for Dungeon Nanpa Chronicle."""

from __future__ import annotations

import random
from entities import Player, Enemy, AIType


# ---------------------------------------------------------------------------
# Nanpa lines (flavour text)
# ---------------------------------------------------------------------------

NANPA_LINES = [
    "「ねぇねぇ、今ヒマ？」",
    "「マジ可愛いんだけど！」",
    "「俺とお茶しない？」",
    "「LINE教えてよ！」",
    "「今日めっちゃ綺麗だね！」",
    "「運命感じちゃったんだけど！」",
    "「ていうか、モデルさん？」",
    "「この後どっか行こうよ！」",
]

COUNTER_LINES = [
    "ビンタされた！",
    "「キモい」と言われた！",
    "無視された上に蹴られた！",
    "「警察呼びますよ」と脅された！",
    "ドリンクをかけられた！",
    "「彼氏いるんで」と冷たく言われた！",
    "ハンドバッグで殴られた！",
]

SUCCESS_LINES = [
    "「え、ちょっと面白いかも…」",
    "心の壁にヒビが入った！",
    "ちょっと笑ってくれた！",
    "「…ウザいけど嫌いじゃない」",
    "反応が柔らかくなった！",
]

DEFEAT_LINES = [
    "お持ち帰り成功！",
    "ついに心を開いてくれた！",
    "LINE交換に成功した！",
    "デートの約束を取り付けた！",
]


# ---------------------------------------------------------------------------
# Damage calculation
# ---------------------------------------------------------------------------

def calc_nanpa_damage(player: Player, enemy: Enemy) -> int:
    """Calculate the damage dealt by the player's nanpa attack."""
    base = max(1, player.effective_atk - enemy.defense // 2)
    variance = max(1, base // 4)
    damage = base + random.randint(-variance, variance)

    # Ability: 炎 (fire) adds extra damage
    if player.has_ability("炎"):
        damage += random.randint(2, 5)

    # Ability: 連 (double hit)
    if player.has_ability("連"):
        damage = int(damage * 1.5)

    return max(1, damage)


def calc_counter_damage(enemy: Enemy, player: Player) -> int:
    """Calculate counter-attack damage from enemy to player."""
    base = max(1, enemy.atk - player.effective_def // 2)
    variance = max(1, base // 4)
    damage = base + random.randint(-variance, variance)

    # Ability: 盾 (shield) 25% chance to nullify
    if player.has_ability("盾") and random.random() < 0.25:
        return 0

    return max(1, damage)


# ---------------------------------------------------------------------------
# Perform nanpa attack
# ---------------------------------------------------------------------------

def perform_nanpa(player: Player, enemy: Enemy) -> list[str]:
    """Execute a nanpa action. Returns log messages."""
    messages: list[str] = []

    # Flavour text
    messages.append(random.choice(NANPA_LINES))

    # Calculate and apply damage to enemy
    dmg = calc_nanpa_damage(player, enemy)
    actual = enemy.take_damage(dmg)

    messages.append(random.choice(SUCCESS_LINES))
    messages.append(f"  → {enemy.name}の心の壁に {actual} ダメージ！ (残り {enemy.hp}/{enemy.max_hp})")

    # Ability: 眠 (sleep) chance
    if player.has_ability("眠") and random.random() < 0.15:
        messages.append(f"  {enemy.name}は眠ってしまった！")
        enemy.special_cooldown = 3  # Used as sleep counter

    # Check if enemy is defeated
    if not enemy.is_alive:
        messages.append(random.choice(DEFEAT_LINES))
        messages.append(f"  {enemy.name}を攻略した！ EXP +{enemy.exp_reward}")

        # Gold drop
        gold = random.randint(5, 15) * (1 + player.floor // 3)
        if player.has_ability("金"):
            gold *= 2
        player.gold += gold
        messages.append(f"  {gold} ゴールドを手に入れた！")

        # Level up
        lvl_msgs = player.add_exp(enemy.exp_reward)
        messages.extend(lvl_msgs)
    else:
        # Counter attack
        counter_dmg = calc_counter_damage(enemy, player)
        if counter_dmg == 0:
            messages.append("  カウンターを華麗に回避した！")
        else:
            player.hp -= counter_dmg
            messages.append(random.choice(COUNTER_LINES))
            messages.append(f"  → {counter_dmg} ダメージを受けた！ (LP {player.hp}/{player.max_hp})")
            if player.hp <= 0:
                player.hp = 0
                player.is_alive = False
                messages.append("力尽きた…ゲームオーバー")

    return messages


# ---------------------------------------------------------------------------
# Enemy attack (when enemy acts on its turn)
# ---------------------------------------------------------------------------

ENEMY_ATTACK_LINES = [
    "{name}がビンタしてきた！",
    "{name}が冷たい視線を浴びせた！",
    "{name}が罵倒してきた！",
    "{name}がヒールで踏んできた！",
    "{name}がハンドバッグを投げつけてきた！",
]


def enemy_attack(enemy: Enemy, player: Player) -> list[str]:
    """Enemy attacks the player. Returns log messages."""
    messages: list[str] = []

    line = random.choice(ENEMY_ATTACK_LINES).format(name=enemy.name)
    messages.append(line)

    dmg = calc_counter_damage(enemy, player)
    if dmg == 0:
        messages.append("  しかし、ダメージを受けなかった！")
    else:
        player.hp -= dmg
        messages.append(f"  → {dmg} ダメージ！ (LP {player.hp}/{player.max_hp})")
        if player.hp <= 0:
            player.hp = 0
            player.is_alive = False
            messages.append("力尽きた…ゲームオーバー")

    return messages
