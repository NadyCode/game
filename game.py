"""Main game engine for Dungeon Nanpa Chronicle.

Manages game state, turn processing, and coordinates all subsystems.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Optional

from entities import Player, Enemy, Item, ItemCategory
from dungeon import DungeonMap, generate_dungeon, FloorItem, Tile
from battle import perform_nanpa
from ai import process_enemy_turn
from storage import Storage
from items import synthesize, ABILITY_SEALS


# ---------------------------------------------------------------------------
# Game state enum
# ---------------------------------------------------------------------------

class GameState(Enum):
    TITLE = auto()
    EXPLORE = auto()
    INVENTORY = auto()
    SYNTHESIS = auto()
    STORAGE = auto()
    GAME_OVER = auto()
    VICTORY = auto()
    DELIVERY = auto()         # Choosing item to deliver
    SYNTH_BASE = auto()       # Choosing base item for synthesis
    SYNTH_MATERIAL = auto()   # Choosing material item for synthesis


MAX_FLOOR = 15  # ゴールの階数


# ---------------------------------------------------------------------------
# Game engine
# ---------------------------------------------------------------------------

@dataclass
class Game:
    player: Player = field(default_factory=lambda: Player(
        name="チャラ男",
        hp=30,
        max_hp=30,
        atk=5,
        defense=3,
        speed=1.0,
    ))
    dmap: Optional[DungeonMap] = None
    state: GameState = GameState.TITLE
    messages: list[str] = field(default_factory=list)
    storage: Storage = field(default_factory=Storage)
    cursor: int = 0     # for menu navigation
    synth_base_idx: int = -1  # index of base item during synthesis

    def new_game(self):
        """Start a new game."""
        self.player = Player(
            name="チャラ男",
            hp=30,
            max_hp=30,
            atk=5,
            defense=3,
            speed=1.0,
        )
        self.player.floor = 1
        self.state = GameState.EXPLORE
        self._generate_floor()
        self.messages = ["ダンジョンに足を踏み入れた…！"]

    def _generate_floor(self):
        """Generate a new dungeon floor and place the player."""
        self.dmap = generate_dungeon(self.player.floor)
        # Place player in first room
        if self.dmap.rooms:
            cx, cy = self.dmap.rooms[0].center
            self.player.x = cx
            self.player.y = cy
            # Reveal starting room
            self.dmap.reveal_room(self.dmap.rooms[0])
        self.messages.append(f"--- {self.player.floor}F ---")

    # ------------------------------------------------------------------
    # Turn processing
    # ------------------------------------------------------------------

    def process_input(self, key: str) -> bool:
        """Process a single key input. Returns True if game should continue."""

        if self.state == GameState.TITLE:
            return self._handle_title(key)
        elif self.state == GameState.EXPLORE:
            return self._handle_explore(key)
        elif self.state == GameState.INVENTORY:
            return self._handle_inventory(key)
        elif self.state == GameState.DELIVERY:
            return self._handle_delivery(key)
        elif self.state == GameState.SYNTH_BASE:
            return self._handle_synth_base(key)
        elif self.state == GameState.SYNTH_MATERIAL:
            return self._handle_synth_material(key)
        elif self.state == GameState.GAME_OVER:
            return self._handle_game_over(key)
        elif self.state == GameState.VICTORY:
            return self._handle_victory(key)

        return True

    # ------------------------------------------------------------------
    # Title screen
    # ------------------------------------------------------------------

    def _handle_title(self, key: str) -> bool:
        if key == "\n" or key == " ":
            self.new_game()
        elif key == "q":
            return False
        return True

    # ------------------------------------------------------------------
    # Exploration mode
    # ------------------------------------------------------------------

    MOVE_KEYS = {
        "h": (-1, 0), "j": (0, 1), "k": (0, -1), "l": (1, 0),
        "y": (-1, -1), "u": (1, -1), "b": (-1, 1), "n": (1, 1),
        "KEY_LEFT": (-1, 0), "KEY_RIGHT": (1, 0),
        "KEY_UP": (0, -1), "KEY_DOWN": (0, 1),
    }

    def _handle_explore(self, key: str) -> bool:
        if key == "q":
            return False

        if key in self.MOVE_KEYS:
            dx, dy = self.MOVE_KEYS[key]
            self._try_move(dx, dy)
            return True

        if key == ".":
            # Wait a turn
            self._end_player_turn()
            return True

        if key == "g":
            self._pick_up_item()
            return True

        if key == "i":
            self.state = GameState.INVENTORY
            self.cursor = 0
            return True

        if key == "s":
            # Open synthesis
            self._start_synthesis()
            return True

        if key == ">":
            self._try_descend()
            return True

        return True

    def _try_move(self, dx: int, dy: int):
        """Try to move the player. If enemy is adjacent, nanpa instead."""
        assert self.dmap is not None
        nx = self.player.x + dx
        ny = self.player.y + dy

        # Check for enemy at target
        enemy = self.dmap.enemy_at(nx, ny)
        if enemy:
            msgs = perform_nanpa(self.player, enemy)
            self.messages.extend(msgs)
            if not enemy.is_alive:
                self.dmap.enemies.remove(enemy)
            self._end_player_turn()
            return

        # Normal movement
        if self.dmap.is_walkable(nx, ny):
            self.player.x = nx
            self.player.y = ny
            # Reveal map
            room = self.dmap.room_at(nx, ny)
            if room:
                self.dmap.reveal_room(room)
            else:
                self.dmap.reveal_around(nx, ny)
            self._end_player_turn()
        # else: wall, do nothing (no turn consumed)

    def _end_player_turn(self):
        """Process end-of-turn: hunger, enemy turns, abilities."""
        assert self.dmap is not None
        self.player.turn_count += 1

        # MP consumption (hunger)
        mp_drain = 1
        if self.player.has_ability("飯"):
            # Halve MP consumption
            if self.player.turn_count % 2 == 0:
                mp_drain = 0
        mp_msgs = self.player.consume_mp(mp_drain)
        self.messages.extend(mp_msgs)

        # Ability: 回 (regen) — heal 1 LP per turn
        if self.player.has_ability("回"):
            healed = self.player.heal(1)
            if healed > 0:
                self.messages.append(f"LP が 1 回復した。(回)")

        if not self.player.is_alive:
            self._handle_death()
            return

        # Process enemy turns
        for enemy in list(self.dmap.enemies):
            if not enemy.is_alive:
                continue
            msgs = process_enemy_turn(enemy, self.player, self.dmap)
            self.messages.extend(msgs)
            if not self.player.is_alive:
                self._handle_death()
                return

    def _pick_up_item(self):
        """Pick up item at player's position."""
        assert self.dmap is not None
        fi = self.dmap.item_at(self.player.x, self.player.y)
        if fi is None:
            self.messages.append("ここにはアイテムがない。")
            return

        if self.player.pick_up(fi.item):
            self.messages.append(f"{fi.item.display_name} を拾った！")
            self.dmap.remove_item(fi)
        else:
            self.messages.append("持ち物がいっぱいだ！")

    def _try_descend(self):
        """Try to go to the next floor."""
        assert self.dmap is not None
        if (self.player.x == self.dmap.stairs_x and
                self.player.y == self.dmap.stairs_y):
            self.player.floor += 1
            if self.player.floor > MAX_FLOOR:
                self.state = GameState.VICTORY
                self.messages.append("最上階に到達した！ ダンジョン攻略成功！！")
                return
            self.messages.append(f"{self.player.floor}Fへ降りた…")
            self._generate_floor()
        else:
            self.messages.append("ここに階段はない。")

    def _handle_death(self):
        """Handle player death — full loss."""
        self.state = GameState.GAME_OVER
        msgs = self.player.reset_on_death()
        self.messages.extend(msgs)

    # ------------------------------------------------------------------
    # Inventory
    # ------------------------------------------------------------------

    def _handle_inventory(self, key: str) -> bool:
        items = self.player.inventory
        if key == "q" or key == "i":
            self.state = GameState.EXPLORE
            return True

        if key == "k" or key == "KEY_UP":
            self.cursor = max(0, self.cursor - 1)
        elif key == "j" or key == "KEY_DOWN":
            self.cursor = min(len(items) - 1, self.cursor + 1)
        elif key == "\n" or key == " ":
            if 0 <= self.cursor < len(items):
                self._use_item(self.cursor)
        elif key == "e":
            # Equip
            if 0 <= self.cursor < len(items):
                self._equip_item(self.cursor)
        elif key == "d":
            # Drop
            if 0 <= self.cursor < len(items):
                item = items.pop(self.cursor)
                assert self.dmap is not None
                self.dmap.floor_items.append(
                    FloorItem(item=item, x=self.player.x, y=self.player.y)
                )
                self.messages.append(f"{item.display_name} を置いた。")
                self.cursor = min(self.cursor, len(items) - 1)

        return True

    def _use_item(self, idx: int):
        """Use a consumable item."""
        item = self.player.inventory[idx]

        if item.category == ItemCategory.CONSUMABLE:
            if item.heal_lp > 0:
                healed = self.player.heal(item.heal_lp)
                self.messages.append(f"{item.name} を使った！ LP が {healed} 回復した！")
            elif item.heal_mp > 0:
                before = self.player.mp
                self.player.mp = min(self.player.max_mp, self.player.mp + item.heal_mp)
                healed = self.player.mp - before
                self.messages.append(f"{item.name} を使った！ MP が {healed} 回復した！")
            elif item.is_delivery:
                # Enter delivery mode
                self.state = GameState.DELIVERY
                self.cursor = 0
                self.messages.append("どのアイテムを拠点に送る？")
                return  # Don't consume the slip yet
            else:
                self.messages.append(f"{item.name} を使った！")

            self.player.inventory.pop(idx)
            self._end_player_turn()
        elif item.category == ItemCategory.SYNTH_BAG:
            self._start_synthesis()
        else:
            self.messages.append("このアイテムは使えない。装備(e)してみよう。")

    def _equip_item(self, idx: int):
        """Equip a weapon or armor."""
        item = self.player.inventory[idx]

        if item.category == ItemCategory.WEAPON:
            old = self.player.equip_weapon(item)
            self.messages.append(f"{item.display_name} を装備した！")
            if old:
                self.player.inventory.append(old)
                self.messages.append(f"{old.display_name} を外した。")
        elif item.category == ItemCategory.ARMOR:
            old = self.player.equip_armor(item)
            self.messages.append(f"{item.display_name} を着た！")
            if old:
                self.player.inventory.append(old)
                self.messages.append(f"{old.display_name} を脱いだ。")
        else:
            self.messages.append("これは装備できない。")

    # ------------------------------------------------------------------
    # Delivery
    # ------------------------------------------------------------------

    def _handle_delivery(self, key: str) -> bool:
        items = self.player.inventory
        if key == "q":
            self.state = GameState.INVENTORY
            return True
        if key == "k" or key == "KEY_UP":
            self.cursor = max(0, self.cursor - 1)
        elif key == "j" or key == "KEY_DOWN":
            self.cursor = min(len(items) - 1, self.cursor + 1)
        elif key == "\n" or key == " ":
            if 0 <= self.cursor < len(items):
                target = items[self.cursor]
                # Find and consume delivery slip
                slip_idx = None
                for i, it in enumerate(self.player.inventory):
                    if it.is_delivery and it is not target:
                        slip_idx = i
                        break
                if slip_idx is not None:
                    self.player.inventory.pop(slip_idx)
                    # Adjust cursor if needed
                    if self.cursor > slip_idx:
                        self.cursor -= 1
                ok, msg = self.storage.deliver(self.player, target)
                self.messages.append(msg)
                self.state = GameState.EXPLORE
                if ok:
                    self._end_player_turn()
        return True

    # ------------------------------------------------------------------
    # Synthesis
    # ------------------------------------------------------------------

    def _start_synthesis(self):
        """Begin synthesis flow — check for synth bag."""
        has_bag = any(
            it.category == ItemCategory.SYNTH_BAG
            for it in self.player.inventory
        )
        if not has_bag:
            self.messages.append("セレクトショップの袋を持っていない！")
            return
        self.state = GameState.SYNTH_BASE
        self.cursor = 0
        self.messages.append("合成のベースにする装備を選んでください。")

    def _handle_synth_base(self, key: str) -> bool:
        equips = [
            (i, it) for i, it in enumerate(self.player.inventory)
            if it.category in (ItemCategory.WEAPON, ItemCategory.ARMOR)
        ]
        if key == "q":
            self.state = GameState.EXPLORE
            return True
        if key == "k" or key == "KEY_UP":
            self.cursor = max(0, self.cursor - 1)
        elif key == "j" or key == "KEY_DOWN":
            self.cursor = min(len(equips) - 1, self.cursor + 1)
        elif key == "\n" or key == " ":
            if 0 <= self.cursor < len(equips):
                self.synth_base_idx = equips[self.cursor][0]
                self.state = GameState.SYNTH_MATERIAL
                self.cursor = 0
                self.messages.append("合成する素材の装備を選んでください。")
        return True

    def _handle_synth_material(self, key: str) -> bool:
        equips = [
            (i, it) for i, it in enumerate(self.player.inventory)
            if it.category in (ItemCategory.WEAPON, ItemCategory.ARMOR)
            and i != self.synth_base_idx
        ]
        if key == "q":
            self.state = GameState.EXPLORE
            return True
        if key == "k" or key == "KEY_UP":
            self.cursor = max(0, self.cursor - 1)
        elif key == "j" or key == "KEY_DOWN":
            self.cursor = min(len(equips) - 1, self.cursor + 1)
        elif key == "\n" or key == " ":
            if 0 <= self.cursor < len(equips):
                mat_idx = equips[self.cursor][0]
                base_item = self.player.inventory[self.synth_base_idx]
                mat_item = self.player.inventory[mat_idx]

                result, msgs = synthesize(base_item, mat_item)
                self.messages.extend(msgs)

                # Remove material and synth bag
                # Remove material first (higher index first to avoid shifting)
                indices_to_remove = sorted([mat_idx], reverse=True)
                for idx in indices_to_remove:
                    self.player.inventory.pop(idx)

                # Remove one synth bag
                for i, it in enumerate(self.player.inventory):
                    if it.category == ItemCategory.SYNTH_BAG:
                        self.player.inventory.pop(i)
                        break

                self.state = GameState.EXPLORE
                self._end_player_turn()
        return True

    # ------------------------------------------------------------------
    # Game over / Victory
    # ------------------------------------------------------------------

    def _handle_game_over(self, key: str) -> bool:
        if key == "\n" or key == " ":
            self.state = GameState.TITLE
        elif key == "q":
            return False
        return True

    def _handle_victory(self, key: str) -> bool:
        if key == "\n" or key == " ":
            self.state = GameState.TITLE
        elif key == "q":
            return False
        return True

    # ------------------------------------------------------------------
    # Helpers for UI
    # ------------------------------------------------------------------

    def get_visible_messages(self, count: int = 6) -> list[str]:
        """Return the last N messages for display."""
        return self.messages[-count:]

    def get_inventory_equips(self) -> list[tuple[int, Item]]:
        """Return indexed equipment items from inventory."""
        return [
            (i, it) for i, it in enumerate(self.player.inventory)
            if it.category in (ItemCategory.WEAPON, ItemCategory.ARMOR)
        ]
