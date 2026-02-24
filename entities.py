"""Core entity classes for Dungeon Nanpa Chronicle."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Optional


# ---------------------------------------------------------------------------
# Item definitions
# ---------------------------------------------------------------------------

class ItemCategory(Enum):
    CONSUMABLE = auto()   # 消耗品
    WEAPON = auto()       # アクセサリー（武器）
    ARMOR = auto()        # ファッション（防具）
    SYNTH_BAG = auto()    # セレクトショップの袋（合成袋）


@dataclass
class Item:
    name: str
    category: ItemCategory
    description: str = ""
    plus_value: int = 0          # 強化値 (+n)
    max_slots: int = 0           # 合成可能な印の最大数
    abilities: list[str] = field(default_factory=list)  # 印リスト
    atk_bonus: int = 0           # 武器の場合の攻撃ボーナス
    def_bonus: int = 0           # 防具の場合の防御ボーナス
    heal_lp: int = 0             # 消耗品: LP回復量
    heal_mp: int = 0             # 消耗品: MP回復量
    is_delivery: bool = False    # 宅配アイテムか
    floor_char: str = "!"        # マップ上の表示文字

    @property
    def display_name(self) -> str:
        plus = f"+{self.plus_value}" if self.plus_value > 0 else ""
        abilities_str = ""
        if self.abilities:
            abilities_str = " [" + ",".join(self.abilities) + "]"
        return f"{self.name}{plus}{abilities_str}"

    def clone(self) -> Item:
        return Item(
            name=self.name,
            category=self.category,
            description=self.description,
            plus_value=self.plus_value,
            max_slots=self.max_slots,
            abilities=list(self.abilities),
            atk_bonus=self.atk_bonus,
            def_bonus=self.def_bonus,
            heal_lp=self.heal_lp,
            heal_mp=self.heal_mp,
            is_delivery=self.is_delivery,
            floor_char=self.floor_char,
        )


# ---------------------------------------------------------------------------
# Entity base
# ---------------------------------------------------------------------------

@dataclass
class Entity:
    """Base class for all grid-based entities."""
    name: str
    hp: int
    max_hp: int
    atk: int
    defense: int
    x: int = 0
    y: int = 0
    speed: float = 1.0       # 1.0=normal, 2.0=twice per turn, 0.5=once per 2 turns
    char: str = "?"          # 表示文字
    is_alive: bool = True

    @property
    def effective_atk(self) -> int:
        return self.atk

    @property
    def effective_def(self) -> int:
        return self.defense

    def take_damage(self, amount: int) -> int:
        """Apply damage and return actual damage dealt."""
        actual = max(1, amount - self.effective_def)
        self.hp -= actual
        if self.hp <= 0:
            self.hp = 0
            self.is_alive = False
        return actual

    def heal(self, amount: int) -> int:
        """Heal and return actual amount healed."""
        before = self.hp
        self.hp = min(self.max_hp, self.hp + amount)
        return self.hp - before


# ---------------------------------------------------------------------------
# Player
# ---------------------------------------------------------------------------

@dataclass
class Player(Entity):
    """The protagonist — チャラ男."""
    mp: int = 100               # モテポイント（満腹度）
    max_mp: int = 100
    exp: int = 0
    level: int = 1
    gold: int = 0
    weapon: Optional[Item] = None
    armor: Optional[Item] = None
    inventory: list[Item] = field(default_factory=list)
    max_inventory: int = 20
    floor: int = 1              # 現在の階
    turn_count: int = 0

    # Level-up thresholds: exp needed for each level
    EXP_TABLE = [0, 0, 10, 25, 50, 80, 120, 170, 230, 300, 380,
                 470, 570, 680, 800, 930, 1070, 1220, 1380, 1550, 1730]

    def __post_init__(self):
        self.char = "@"
        self.name = "チャラ男"

    @property
    def effective_atk(self) -> int:
        base = self.atk
        if self.weapon:
            base += self.weapon.atk_bonus + self.weapon.plus_value
        return base

    @property
    def effective_def(self) -> int:
        base = self.defense
        if self.armor:
            base += self.armor.def_bonus + self.armor.plus_value
        return base

    def has_ability(self, ability: str) -> bool:
        """Check if player has an ability from equipped items."""
        for item in (self.weapon, self.armor):
            if item and ability in item.abilities:
                return True
        return False

    def add_exp(self, amount: int) -> list[str]:
        """Add experience and return list of log messages for level-ups."""
        messages = []
        self.exp += amount
        while self.level < len(self.EXP_TABLE) - 1:
            needed = self.EXP_TABLE[self.level + 1]
            if self.exp >= needed:
                self.level += 1
                self.max_hp += random.randint(3, 6)
                self.hp = self.max_hp
                self.atk += random.randint(1, 2)
                self.defense += random.randint(0, 1)
                messages.append(
                    f"チャラさレベルが {self.level} に上がった！"
                )
            else:
                break
        return messages

    def consume_mp(self, amount: int = 1) -> list[str]:
        """Reduce MP (hunger). Returns warning messages."""
        messages = []
        self.mp -= amount
        if self.mp <= 0:
            self.mp = 0
            self.hp -= 1
            messages.append("空腹でLPが減っている…！")
            if self.hp <= 0:
                self.hp = 0
                self.is_alive = False
                messages.append("力尽きた…")
        elif self.mp <= 20:
            messages.append("おなかが減ってきた…")
        return messages

    def can_pick_up(self) -> bool:
        return len(self.inventory) < self.max_inventory

    def pick_up(self, item: Item) -> bool:
        if not self.can_pick_up():
            return False
        self.inventory.append(item)
        return True

    def equip_weapon(self, item: Item) -> Optional[Item]:
        """Equip weapon, return previously equipped item (or None)."""
        old = self.weapon
        self.weapon = item
        if item in self.inventory:
            self.inventory.remove(item)
        return old

    def equip_armor(self, item: Item) -> Optional[Item]:
        """Equip armor, return previously equipped item (or None)."""
        old = self.armor
        self.armor = item
        if item in self.inventory:
            self.inventory.remove(item)
        return old

    def reset_on_death(self) -> list[str]:
        """Full loss on death — reset everything except storage."""
        messages = [
            "全てのアイテムとゴールドを失った…",
            "拠点に戻された。",
        ]
        self.inventory.clear()
        self.weapon = None
        self.armor = None
        self.gold = 0
        self.hp = self.max_hp
        self.mp = self.max_mp
        self.floor = 1
        self.is_alive = True
        return messages


# ---------------------------------------------------------------------------
# Enemy types and AI
# ---------------------------------------------------------------------------

class EnemyType(Enum):
    GAL = "ギャル"
    JIRAI = "地雷系"
    OL = "OL"
    IDOL = "地下アイドル"
    CELEB = "セレブ"
    GYARU_MAMA = "ギャルママ"
    QUEEN = "女王様"


class AIType(Enum):
    CHASE = auto()      # 直進 — まっすぐ追いかける
    WANDER = auto()     # うろうろ — ランダム移動、近づいたら追跡
    FLEE = auto()        # 逃走 — 近づくと逃げる
    SPECIAL = auto()     # 特殊行動あり


@dataclass
class Enemy(Entity):
    """An enemy on the dungeon floor."""
    enemy_type: EnemyType = EnemyType.GAL
    ai_type: AIType = AIType.WANDER
    exp_reward: int = 5
    drop_item: Optional[Item] = None
    special_cooldown: int = 0
    _energy: float = 0.0   # internal accumulator for speed system

    def __post_init__(self):
        self.char = self._char_for_type()

    def _char_for_type(self) -> str:
        mapping = {
            EnemyType.GAL: "G",
            EnemyType.JIRAI: "J",
            EnemyType.OL: "O",
            EnemyType.IDOL: "I",
            EnemyType.CELEB: "C",
            EnemyType.GYARU_MAMA: "M",
            EnemyType.QUEEN: "Q",
        }
        return mapping.get(self.enemy_type, "?")


# ---------------------------------------------------------------------------
# Enemy templates — spawned per floor range
# ---------------------------------------------------------------------------

ENEMY_TEMPLATES: list[dict] = [
    # Floor 1-3
    dict(name="ギャル", hp=12, atk=3, defense=1, speed=1.0,
         enemy_type=EnemyType.GAL, ai_type=AIType.WANDER, exp_reward=5,
         floor_min=1, floor_max=5),
    dict(name="地雷系女子", hp=15, atk=5, defense=2, speed=1.0,
         enemy_type=EnemyType.JIRAI, ai_type=AIType.CHASE, exp_reward=8,
         floor_min=2, floor_max=7),
    # Floor 3-6
    dict(name="OL", hp=20, atk=6, defense=3, speed=1.0,
         enemy_type=EnemyType.OL, ai_type=AIType.WANDER, exp_reward=12,
         floor_min=3, floor_max=8),
    dict(name="地下アイドル", hp=10, atk=4, defense=1, speed=2.0,
         enemy_type=EnemyType.IDOL, ai_type=AIType.FLEE, exp_reward=15,
         floor_min=4, floor_max=9),
    # Floor 5-10
    dict(name="セレブ", hp=30, atk=8, defense=5, speed=0.5,
         enemy_type=EnemyType.CELEB, ai_type=AIType.WANDER, exp_reward=20,
         floor_min=5, floor_max=12),
    dict(name="ギャルママ", hp=35, atk=10, defense=4, speed=1.0,
         enemy_type=EnemyType.GYARU_MAMA, ai_type=AIType.CHASE, exp_reward=25,
         floor_min=7, floor_max=15),
    # Floor 10+
    dict(name="女王様", hp=50, atk=14, defense=7, speed=1.0,
         enemy_type=EnemyType.QUEEN, ai_type=AIType.SPECIAL, exp_reward=40,
         floor_min=10, floor_max=99),
]


def enemies_for_floor(floor: int) -> list[dict]:
    """Return enemy templates available on a given floor."""
    return [t for t in ENEMY_TEMPLATES
            if t["floor_min"] <= floor <= t["floor_max"]]


def spawn_enemy(template: dict) -> Enemy:
    """Create an enemy from a template dict."""
    return Enemy(
        name=template["name"],
        hp=template["hp"],
        max_hp=template["hp"],
        atk=template["atk"],
        defense=template["defense"],
        speed=template.get("speed", 1.0),
        enemy_type=template["enemy_type"],
        ai_type=template["ai_type"],
        exp_reward=template["exp_reward"],
    )
