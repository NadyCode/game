"""Dungeon map generation — rooms and corridors algorithm."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Optional

from entities import Enemy, enemies_for_floor, spawn_enemy
from items import Item, random_item_for_floor


# ---------------------------------------------------------------------------
# Tile types
# ---------------------------------------------------------------------------

class Tile:
    WALL = "#"
    FLOOR = "."
    CORRIDOR = "."
    STAIRS = ">"
    WATER = "~"


# ---------------------------------------------------------------------------
# Room definition
# ---------------------------------------------------------------------------

@dataclass
class Room:
    x: int
    y: int
    w: int
    h: int

    @property
    def center(self) -> tuple[int, int]:
        return self.x + self.w // 2, self.y + self.h // 2

    def intersects(self, other: Room, margin: int = 1) -> bool:
        return not (
            self.x + self.w + margin <= other.x
            or other.x + other.w + margin <= self.x
            or self.y + self.h + margin <= other.y
            or other.y + other.h + margin <= self.y
        )

    def random_point(self) -> tuple[int, int]:
        return (
            random.randint(self.x + 1, self.x + self.w - 2),
            random.randint(self.y + 1, self.y + self.h - 2),
        )


# ---------------------------------------------------------------------------
# Dropped item on floor
# ---------------------------------------------------------------------------

@dataclass
class FloorItem:
    item: Item
    x: int
    y: int


# ---------------------------------------------------------------------------
# Dungeon map
# ---------------------------------------------------------------------------

@dataclass
class DungeonMap:
    width: int
    height: int
    tiles: list[list[str]] = field(default_factory=list)
    rooms: list[Room] = field(default_factory=list)
    enemies: list[Enemy] = field(default_factory=list)
    floor_items: list[FloorItem] = field(default_factory=list)
    stairs_x: int = 0
    stairs_y: int = 0
    explored: set = field(default_factory=set)  # (x,y) tiles player has seen

    def __post_init__(self):
        if not self.tiles:
            self.tiles = [
                [Tile.WALL for _ in range(self.width)]
                for _ in range(self.height)
            ]

    def in_bounds(self, x: int, y: int) -> bool:
        return 0 <= x < self.width and 0 <= y < self.height

    def is_walkable(self, x: int, y: int) -> bool:
        if not self.in_bounds(x, y):
            return False
        return self.tiles[y][x] != Tile.WALL

    def is_wall(self, x: int, y: int) -> bool:
        if not self.in_bounds(x, y):
            return True
        return self.tiles[y][x] == Tile.WALL

    def enemy_at(self, x: int, y: int) -> Optional[Enemy]:
        for e in self.enemies:
            if e.is_alive and e.x == x and e.y == y:
                return e
        return None

    def item_at(self, x: int, y: int) -> Optional[FloorItem]:
        for fi in self.floor_items:
            if fi.x == x and fi.y == y:
                return fi
        return None

    def remove_item(self, fi: FloorItem):
        if fi in self.floor_items:
            self.floor_items.remove(fi)

    def room_at(self, x: int, y: int) -> Optional[Room]:
        for room in self.rooms:
            if room.x <= x < room.x + room.w and room.y <= y < room.y + room.h:
                return room
        return None

    def reveal_room(self, room: Room):
        """Add all tiles in a room to the explored set."""
        for ry in range(room.y, room.y + room.h):
            for rx in range(room.x, room.x + room.w):
                self.explored.add((rx, ry))

    def reveal_around(self, x: int, y: int, radius: int = 1):
        """Reveal tiles in a radius around a point (for corridors)."""
        for dy in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                nx, ny = x + dx, y + dy
                if self.in_bounds(nx, ny):
                    self.explored.add((nx, ny))


# ---------------------------------------------------------------------------
# Dungeon generator
# ---------------------------------------------------------------------------

def generate_dungeon(
    floor: int,
    width: int = 60,
    height: int = 30,
    max_rooms: int = 8,
    min_room_size: int = 5,
    max_room_size: int = 10,
) -> DungeonMap:
    """Generate a new dungeon floor with rooms, corridors, enemies, items."""

    dmap = DungeonMap(width=width, height=height)

    # --- Generate rooms ---
    rooms: list[Room] = []
    for _ in range(max_rooms * 4):
        w = random.randint(min_room_size, max_room_size)
        h = random.randint(min_room_size, max_room_size)
        x = random.randint(1, width - w - 1)
        y = random.randint(1, height - h - 1)
        new_room = Room(x, y, w, h)

        if any(new_room.intersects(r) for r in rooms):
            continue

        rooms.append(new_room)
        if len(rooms) >= max_rooms:
            break

    # Carve rooms
    for room in rooms:
        for ry in range(room.y, room.y + room.h):
            for rx in range(room.x, room.x + room.w):
                dmap.tiles[ry][rx] = Tile.FLOOR

    # --- Connect rooms with corridors ---
    for i in range(1, len(rooms)):
        cx1, cy1 = rooms[i - 1].center
        cx2, cy2 = rooms[i].center

        if random.random() < 0.5:
            _h_corridor(dmap, cx1, cx2, cy1)
            _v_corridor(dmap, cy1, cy2, cx2)
        else:
            _v_corridor(dmap, cy1, cy2, cx1)
            _h_corridor(dmap, cx1, cx2, cy2)

    dmap.rooms = rooms

    if not rooms:
        # Fallback: create at least one room
        room = Room(5, 5, 10, 8)
        rooms.append(room)
        dmap.rooms = rooms
        for ry in range(room.y, room.y + room.h):
            for rx in range(room.x, room.x + room.w):
                dmap.tiles[ry][rx] = Tile.FLOOR

    # --- Place stairs in last room ---
    last_room = rooms[-1]
    sx, sy = last_room.center
    dmap.tiles[sy][sx] = Tile.STAIRS
    dmap.stairs_x = sx
    dmap.stairs_y = sy

    # --- Spawn enemies ---
    templates = enemies_for_floor(floor)
    num_enemies = min(3 + floor, len(rooms) * 2)
    for _ in range(num_enemies):
        if not templates:
            break
        t = random.choice(templates)
        enemy = spawn_enemy(t)
        room = random.choice(rooms[1:] if len(rooms) > 1 else rooms)
        ex, ey = room.random_point()
        # Avoid placing on stairs
        if ex == dmap.stairs_x and ey == dmap.stairs_y:
            continue
        enemy.x = ex
        enemy.y = ey
        dmap.enemies.append(enemy)

    # --- Scatter items ---
    num_items = random.randint(2, 3 + floor // 2)
    for _ in range(num_items):
        item = random_item_for_floor(floor)
        room = random.choice(rooms)
        ix, iy = room.random_point()
        if ix == dmap.stairs_x and iy == dmap.stairs_y:
            continue
        dmap.floor_items.append(FloorItem(item=item, x=ix, y=iy))

    return dmap


def _h_corridor(dmap: DungeonMap, x1: int, x2: int, y: int):
    for x in range(min(x1, x2), max(x1, x2) + 1):
        if dmap.in_bounds(x, y):
            dmap.tiles[y][x] = Tile.FLOOR


def _v_corridor(dmap: DungeonMap, y1: int, y2: int, x: int):
    for y in range(min(y1, y2), max(y1, y2) + 1):
        if dmap.in_bounds(x, y):
            dmap.tiles[y][x] = Tile.FLOOR
