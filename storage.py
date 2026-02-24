"""Storage (coin locker) and delivery system for Dungeon Nanpa Chronicle.

Implements:
- コインロッカー (coin locker / storage) at base
- 宅配伝票 (delivery slip) to send items from dungeon to base
"""

from __future__ import annotations

from dataclasses import dataclass, field
from entities import Player, Item


@dataclass
class Storage:
    """Persistent item storage at the player's base."""
    items: list[Item] = field(default_factory=list)
    max_items: int = 30

    def deposit(self, item: Item) -> tuple[bool, str]:
        if len(self.items) >= self.max_items:
            return False, "コインロッカーがいっぱいだ！"
        self.items.append(item)
        return True, f"{item.display_name} をコインロッカーに預けた。"

    def withdraw(self, index: int) -> tuple[Item | None, str]:
        if index < 0 or index >= len(self.items):
            return None, "そのアイテムはない。"
        item = self.items.pop(index)
        return item, f"{item.display_name} を取り出した。"

    def deliver(self, player: Player, item: Item) -> tuple[bool, str]:
        """Send an item from the dungeon to storage via delivery slip."""
        if len(self.items) >= self.max_items:
            return False, "コインロッカーがいっぱいで届けられない！"
        if item in player.inventory:
            player.inventory.remove(item)
        elif item == player.weapon:
            player.weapon = None
        elif item == player.armor:
            player.armor = None
        else:
            return False, "そのアイテムは送れない。"
        self.items.append(item)
        return True, f"{item.display_name} を拠点に送った！"
