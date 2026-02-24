"""Item definitions and item tables for Dungeon Nanpa Chronicle."""

from __future__ import annotations

import random
from entities import Item, ItemCategory


# ---------------------------------------------------------------------------
# Consumable items
# ---------------------------------------------------------------------------

CONSUMABLES: list[Item] = [
    Item(name="エナジードリンク", category=ItemCategory.CONSUMABLE,
         description="LPを30回復する", heal_lp=30, floor_char="!"),
    Item(name="高級エナジードリンク", category=ItemCategory.CONSUMABLE,
         description="LPを100回復する", heal_lp=100, floor_char="!"),
    Item(name="プロテインバー", category=ItemCategory.CONSUMABLE,
         description="MPを50回復する", heal_mp=50, floor_char="!"),
    Item(name="タピオカミルクティー", category=ItemCategory.CONSUMABLE,
         description="MPを全回復する", heal_mp=999, floor_char="!"),
    Item(name="香水「モテオーラ」", category=ItemCategory.CONSUMABLE,
         description="同じフロアの敵を引き寄せる", floor_char="!"),
    Item(name="煙幕スプレー", category=ItemCategory.CONSUMABLE,
         description="ワープして逃げる", floor_char="!"),
    Item(name="宅配伝票", category=ItemCategory.CONSUMABLE,
         description="アイテム1つを拠点に送る", is_delivery=True, floor_char="$"),
]

# ---------------------------------------------------------------------------
# Weapons (accessories)
# ---------------------------------------------------------------------------

WEAPONS: list[Item] = [
    Item(name="シルバーリング", category=ItemCategory.WEAPON,
         description="基本のアクセサリー", atk_bonus=2, max_slots=3,
         floor_char="/"),
    Item(name="ゴールドネックレス", category=ItemCategory.WEAPON,
         description="トーク力を高めるネックレス", atk_bonus=4, max_slots=4,
         floor_char="/"),
    Item(name="ダイヤのピアス", category=ItemCategory.WEAPON,
         description="高級アクセサリー", atk_bonus=7, max_slots=5,
         floor_char="/"),
    Item(name="ロレックス（偽）", category=ItemCategory.WEAPON,
         description="見た目だけは一流", atk_bonus=10, max_slots=2,
         floor_char="/"),
]

# ---------------------------------------------------------------------------
# Armor (fashion)
# ---------------------------------------------------------------------------

ARMORS: list[Item] = [
    Item(name="ユニクロコーデ", category=ItemCategory.ARMOR,
         description="基本のファッション", def_bonus=2, max_slots=3,
         floor_char="["),
    Item(name="韓国系セットアップ", category=ItemCategory.ARMOR,
         description="メンタル耐性を高めるファッション", def_bonus=4, max_slots=4,
         floor_char="["),
    Item(name="ブランドスーツ", category=ItemCategory.ARMOR,
         description="高級ファッション", def_bonus=7, max_slots=5,
         floor_char="["),
    Item(name="ホスト風フルコーデ", category=ItemCategory.ARMOR,
         description="ホスト御用達の最強コーデ", def_bonus=10, max_slots=2,
         floor_char="["),
]

# ---------------------------------------------------------------------------
# Synthesis bag
# ---------------------------------------------------------------------------

SYNTH_BAG = Item(
    name="セレクトショップの袋",
    category=ItemCategory.SYNTH_BAG,
    description="装備を合成できる袋",
    floor_char="{",
)

# ---------------------------------------------------------------------------
# Ability seals (印)
# ---------------------------------------------------------------------------

ABILITY_SEALS: dict[str, str] = {
    "三": "3方向同時ナンパ",
    "連": "2回連続ナンパ",
    "金": "ゴールドドロップ2倍",
    "回": "毎ターンLP1回復",
    "飯": "MP減少を半分にする",
    "眠": "確率で敵を眠らせる",
    "炎": "ナンパにLP追加ダメージ",
    "盾": "被ダメージ時25%で無効化",
    "速": "移動速度2倍",
    "見": "フロア全体が見える",
}

# ---------------------------------------------------------------------------
# Floor-based item generation
# ---------------------------------------------------------------------------

def random_item_for_floor(floor: int) -> Item:
    """Generate a random item appropriate for the given floor."""
    roll = random.random()

    if roll < 0.40:
        # 40% consumable
        item = random.choice(CONSUMABLES).clone()
    elif roll < 0.60:
        # 20% weapon
        available = [w for w in WEAPONS if w.atk_bonus <= 2 + floor * 2]
        if not available:
            available = WEAPONS[:1]
        item = random.choice(available).clone()
        if random.random() < 0.3:
            item.plus_value = random.randint(1, min(3, floor))
    elif roll < 0.80:
        # 20% armor
        available = [a for a in ARMORS if a.def_bonus <= 2 + floor * 2]
        if not available:
            available = ARMORS[:1]
        item = random.choice(available).clone()
        if random.random() < 0.3:
            item.plus_value = random.randint(1, min(3, floor))
    elif roll < 0.90:
        # 10% synth bag
        item = SYNTH_BAG.clone()
    else:
        # 10% item with a random ability
        base_items = WEAPONS + ARMORS
        item = random.choice(base_items).clone()
        if item.max_slots > 0:
            seal = random.choice(list(ABILITY_SEALS.keys()))
            item.abilities.append(seal)
    return item


def synthesize(base: Item, material: Item) -> tuple[Item, list[str]]:
    """Merge material into base item via synthesis bag.

    Rules:
    - base gains material's plus_value
    - base inherits material's abilities (up to max_slots)
    - material is consumed

    Returns (result_item, log_messages).
    """
    messages: list[str] = []

    if base.category not in (ItemCategory.WEAPON, ItemCategory.ARMOR):
        messages.append("装備品のみ合成できます。")
        return base, messages
    if material.category not in (ItemCategory.WEAPON, ItemCategory.ARMOR):
        messages.append("素材は装備品でなければなりません。")
        return base, messages

    # Transfer plus value
    base.plus_value += material.plus_value
    messages.append(f"強化値 +{material.plus_value} を継承！")

    # Transfer abilities
    for ab in material.abilities:
        if ab not in base.abilities and len(base.abilities) < base.max_slots:
            base.abilities.append(ab)
            messages.append(f"印「{ab}」を継承！ ({ABILITY_SEALS.get(ab, '')})")
        elif ab in base.abilities:
            messages.append(f"印「{ab}」は既に付いている。")
        else:
            messages.append(f"印スロットが足りない。「{ab}」は失われた。")

    messages.append(f"合成完了！ → {base.display_name}")
    return base, messages
