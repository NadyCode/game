/* dungeon.js — Procedural dungeon generation. */

class Room {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
  }
  get cx() { return this.x + Math.floor(this.w / 2); }
  get cy() { return this.y + Math.floor(this.h / 2); }

  intersects(other, margin = 1) {
    return !(this.x + this.w + margin <= other.x ||
             other.x + other.w + margin <= this.x ||
             this.y + this.h + margin <= other.y ||
             other.y + other.h + margin <= this.y);
  }

  randomPoint() {
    return [
      randInt(this.x + 1, this.x + this.w - 2),
      randInt(this.y + 1, this.y + this.h - 2),
    ];
  }
}

class FloorItem {
  constructor(item, x, y) { this.item = item; this.x = x; this.y = y; }
}

class DungeonMap {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.tiles = [];
    for (let y = 0; y < h; y++) {
      this.tiles[y] = new Uint8Array(w); // 0 = WALL by default
    }
    this.rooms = [];
    this.enemies = [];
    this.floorItems = [];
    this.stairsX = 0;
    this.stairsY = 0;
    this.explored = new Set();
  }

  inBounds(x, y) { return x >= 0 && x < this.w && y >= 0 && y < this.h; }
  isWalkable(x, y) { return this.inBounds(x, y) && this.tiles[y][x] !== TILE.WALL; }
  isWall(x, y) { return !this.inBounds(x, y) || this.tiles[y][x] === TILE.WALL; }

  enemyAt(x, y) {
    for (const e of this.enemies) {
      if (e.alive && e.x === x && e.y === y) return e;
    }
    return null;
  }

  itemAt(x, y) {
    for (const fi of this.floorItems) {
      if (fi.x === x && fi.y === y) return fi;
    }
    return null;
  }

  removeItem(fi) {
    const idx = this.floorItems.indexOf(fi);
    if (idx >= 0) this.floorItems.splice(idx, 1);
  }

  roomAt(x, y) {
    for (const r of this.rooms) {
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
    }
    return null;
  }

  revealRoom(room) {
    for (let ry = room.y; ry < room.y + room.h; ry++)
      for (let rx = room.x; rx < room.x + room.w; rx++)
        this.explored.add(ry * this.w + rx);
  }

  revealAround(x, y, radius = 1) {
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx, ny = y + dy;
        if (this.inBounds(nx, ny)) this.explored.add(ny * this.w + nx);
      }
  }

  isExplored(x, y) { return this.explored.has(y * this.w + x); }
}

// ---------- Generator ----------

function generateDungeon(floor) {
  const dmap = new DungeonMap(MAP_W, MAP_H);
  const maxRooms = 8, minSize = 5, maxSize = 10;
  const rooms = [];

  // Create rooms
  for (let attempt = 0; attempt < maxRooms * 4 && rooms.length < maxRooms; attempt++) {
    const w = randInt(minSize, maxSize);
    const h = randInt(minSize, maxSize);
    const x = randInt(1, MAP_W - w - 1);
    const y = randInt(1, MAP_H - h - 1);
    const room = new Room(x, y, w, h);
    if (rooms.some(r => room.intersects(r))) continue;
    rooms.push(room);
  }

  // Fallback
  if (!rooms.length) rooms.push(new Room(5, 5, 10, 8));

  // Carve rooms
  for (const room of rooms)
    for (let ry = room.y; ry < room.y + room.h; ry++)
      for (let rx = room.x; rx < room.x + room.w; rx++)
        dmap.tiles[ry][rx] = TILE.FLOOR;

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const [cx1, cy1] = [rooms[i-1].cx, rooms[i-1].cy];
    const [cx2, cy2] = [rooms[i].cx, rooms[i].cy];
    if (Math.random() < 0.5) {
      hCorridor(dmap, cx1, cx2, cy1);
      vCorridor(dmap, cy1, cy2, cx2);
    } else {
      vCorridor(dmap, cy1, cy2, cx1);
      hCorridor(dmap, cx1, cx2, cy2);
    }
  }

  dmap.rooms = rooms;

  // Place stairs in last room
  const last = rooms[rooms.length - 1];
  dmap.tiles[last.cy][last.cx] = TILE.STAIRS;
  dmap.stairsX = last.cx;
  dmap.stairsY = last.cy;

  // Spawn enemies
  const templates = ENEMY_TEMPLATES.filter(t => t.fMin <= floor && floor <= t.fMax);
  const numEnemies = Math.min(3 + floor, rooms.length * 2);
  for (let i = 0; i < numEnemies && templates.length; i++) {
    const tmpl = pick(templates);
    const enemy = new Enemy(tmpl);
    const room = pick(rooms.length > 1 ? rooms.slice(1) : rooms);
    const [ex, ey] = room.randomPoint();
    if (ex === dmap.stairsX && ey === dmap.stairsY) continue;
    enemy.x = ex; enemy.y = ey;
    dmap.enemies.push(enemy);
  }

  // Scatter items
  const numItems = randInt(2, 3 + Math.floor(floor / 2));
  for (let i = 0; i < numItems; i++) {
    const item = randomItemForFloor(floor);
    const room = pick(rooms);
    const [ix, iy] = room.randomPoint();
    if (ix === dmap.stairsX && iy === dmap.stairsY) continue;
    dmap.floorItems.push(new FloorItem(item, ix, iy));
  }

  return dmap;
}

function hCorridor(dmap, x1, x2, y) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
    if (dmap.inBounds(x, y)) dmap.tiles[y][x] = TILE.FLOOR;
}
function vCorridor(dmap, y1, y2, x) {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    if (dmap.inBounds(x, y)) dmap.tiles[y][x] = TILE.FLOOR;
}
