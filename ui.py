"""Terminal UI rendering with curses for Dungeon Nanpa Chronicle."""

from __future__ import annotations

import curses
from typing import Optional

from entities import Player, ItemCategory
from dungeon import DungeonMap, Tile
from game import Game, GameState, MAX_FLOOR
from items import ABILITY_SEALS


# ---------------------------------------------------------------------------
# Color pairs
# ---------------------------------------------------------------------------

COLOR_DEFAULT = 0
COLOR_PLAYER = 1
COLOR_ENEMY = 2
COLOR_ITEM = 3
COLOR_STAIRS = 4
COLOR_WALL = 5
COLOR_HP_OK = 6
COLOR_HP_LOW = 7
COLOR_TITLE = 8
COLOR_MESSAGE = 9


def init_colors():
    curses.start_color()
    curses.use_default_colors()
    curses.init_pair(COLOR_PLAYER, curses.COLOR_CYAN, -1)
    curses.init_pair(COLOR_ENEMY, curses.COLOR_RED, -1)
    curses.init_pair(COLOR_ITEM, curses.COLOR_YELLOW, -1)
    curses.init_pair(COLOR_STAIRS, curses.COLOR_GREEN, -1)
    curses.init_pair(COLOR_WALL, curses.COLOR_WHITE, -1)
    curses.init_pair(COLOR_HP_OK, curses.COLOR_GREEN, -1)
    curses.init_pair(COLOR_HP_LOW, curses.COLOR_RED, -1)
    curses.init_pair(COLOR_TITLE, curses.COLOR_MAGENTA, -1)
    curses.init_pair(COLOR_MESSAGE, curses.COLOR_WHITE, -1)


# ---------------------------------------------------------------------------
# Viewport — scrolling camera that follows the player
# ---------------------------------------------------------------------------

def get_viewport(player: Player, dmap: DungeonMap, view_w: int, view_h: int):
    """Calculate the top-left corner of the viewport."""
    cam_x = player.x - view_w // 2
    cam_y = player.y - view_h // 2
    cam_x = max(0, min(cam_x, dmap.width - view_w))
    cam_y = max(0, min(cam_y, dmap.height - view_h))
    return cam_x, cam_y


# ---------------------------------------------------------------------------
# Drawing functions
# ---------------------------------------------------------------------------

def draw_title(stdscr, game: Game):
    """Draw the title screen."""
    h, w = stdscr.getmaxyx()
    stdscr.clear()

    title_lines = [
        "╔══════════════════════════════════════╗",
        "║   ダンジョン・ナンパ・クロニクル     ║",
        "║   ~ Dungeon Nanpa Chronicle ~        ║",
        "╚══════════════════════════════════════╝",
    ]

    start_y = h // 2 - 5
    for i, line in enumerate(title_lines):
        x = max(0, (w - 40) // 2)
        y = start_y + i
        if 0 <= y < h:
            try:
                stdscr.addstr(y, x, line, curses.color_pair(COLOR_TITLE) | curses.A_BOLD)
            except curses.error:
                pass

    info_lines = [
        "",
        "チャラ男が「ナンパ」でダンジョンを攻略！",
        "",
        f"目標: {MAX_FLOOR}F を目指せ！",
        "",
        "[Enter] ゲーム開始   [q] 終了",
    ]
    for i, line in enumerate(info_lines):
        x = max(0, (w - 40) // 2)
        y = start_y + len(title_lines) + i
        if 0 <= y < h:
            try:
                stdscr.addstr(y, x, line)
            except curses.error:
                pass


def draw_game(stdscr, game: Game):
    """Draw the main game screen: map + HUD + messages."""
    h, w = stdscr.getmaxyx()
    stdscr.clear()

    if game.dmap is None:
        return

    dmap = game.dmap
    player = game.player

    # Layout
    hud_height = 3
    msg_height = 7
    map_height = h - hud_height - msg_height
    map_width = w

    if map_height < 5 or map_width < 20:
        stdscr.addstr(0, 0, "Terminal too small!")
        return

    # Check for 見 (see all) ability
    see_all = player.has_ability("見")

    # --- Draw map ---
    cam_x, cam_y = get_viewport(player, dmap, map_width, map_height)

    for sy in range(map_height):
        for sx in range(map_width):
            mx = cam_x + sx
            my = cam_y + sy
            if not dmap.in_bounds(mx, my):
                continue

            # Fog of war
            if not see_all and (mx, my) not in dmap.explored:
                continue

            tile = dmap.tiles[my][mx]

            # Check for entities at this position
            char = tile
            color = COLOR_WALL if tile == Tile.WALL else COLOR_DEFAULT
            attr = 0

            if tile == Tile.STAIRS:
                char = ">"
                color = COLOR_STAIRS
                attr = curses.A_BOLD

            # Items on floor
            fi = dmap.item_at(mx, my)
            if fi:
                char = fi.item.floor_char
                color = COLOR_ITEM

            # Enemies
            enemy = dmap.enemy_at(mx, my)
            if enemy:
                char = enemy.char
                color = COLOR_ENEMY
                attr = curses.A_BOLD

            # Player
            if mx == player.x and my == player.y:
                char = player.char
                color = COLOR_PLAYER
                attr = curses.A_BOLD

            try:
                stdscr.addch(sy, sx, ord(char[0]),
                             curses.color_pair(color) | attr)
            except curses.error:
                pass

    # --- Draw HUD ---
    hud_y = map_height

    # HP bar
    hp_ratio = player.hp / max(1, player.max_hp)
    hp_color = COLOR_HP_OK if hp_ratio > 0.3 else COLOR_HP_LOW
    hp_bar = f"LP:{player.hp}/{player.max_hp}"

    mp_bar = f"MP:{player.mp}/{player.max_mp}"
    level_str = f"Lv:{player.level}"
    floor_str = f"{player.floor}F"
    atk_str = f"トーク:{player.effective_atk}"
    def_str = f"耐性:{player.effective_def}"
    gold_str = f"G:{player.gold}"
    exp_str = f"EXP:{player.exp}"

    hud_line1 = f" {floor_str}  {hp_bar}  {mp_bar}  {level_str}  {atk_str}  {def_str}  {gold_str}  {exp_str} "

    try:
        stdscr.addstr(hud_y, 0, hud_line1[:w-1], curses.color_pair(hp_color))
    except curses.error:
        pass

    # Equipped items
    weapon_str = f"武器:{player.weapon.display_name if player.weapon else 'なし'}"
    armor_str = f"防具:{player.armor.display_name if player.armor else 'なし'}"
    hud_line2 = f" {weapon_str}  {armor_str}  持物:{len(player.inventory)}/{player.max_inventory}"

    try:
        stdscr.addstr(hud_y + 1, 0, hud_line2[:w-1])
    except curses.error:
        pass

    # Separator
    try:
        stdscr.addstr(hud_y + 2, 0, "─" * min(w - 1, 80))
    except curses.error:
        pass

    # --- Draw messages ---
    msg_y = hud_y + hud_height
    msgs = game.get_visible_messages(msg_height)
    for i, msg in enumerate(msgs):
        y = msg_y + i
        if y < h:
            try:
                stdscr.addstr(y, 1, msg[:w-2], curses.color_pair(COLOR_MESSAGE))
            except curses.error:
                pass


def draw_inventory(stdscr, game: Game):
    """Draw the inventory screen."""
    h, w = stdscr.getmaxyx()
    stdscr.clear()

    player = game.player
    title = "=== インベントリ ==="
    try:
        stdscr.addstr(0, max(0, (w - len(title)) // 2), title,
                      curses.color_pair(COLOR_TITLE) | curses.A_BOLD)
    except curses.error:
        pass

    if not player.inventory:
        try:
            stdscr.addstr(2, 2, "持ち物がない。")
        except curses.error:
            pass
    else:
        for i, item in enumerate(player.inventory):
            y = 2 + i
            if y >= h - 3:
                break
            prefix = ">" if i == game.cursor else " "
            cat_mark = ""
            if item.category == ItemCategory.WEAPON:
                cat_mark = "[武]"
            elif item.category == ItemCategory.ARMOR:
                cat_mark = "[防]"
            elif item.category == ItemCategory.CONSUMABLE:
                cat_mark = "[消]"
            elif item.category == ItemCategory.SYNTH_BAG:
                cat_mark = "[袋]"
            line = f"{prefix} {cat_mark} {item.display_name}"
            if item.description:
                line += f"  - {item.description}"

            attr = curses.A_REVERSE if i == game.cursor else 0
            try:
                stdscr.addstr(y, 1, line[:w-2], attr)
            except curses.error:
                pass

    # Help
    help_line = "[j/k] 移動  [Enter] 使う  [e] 装備  [d] 置く  [q] 閉じる"
    try:
        stdscr.addstr(h - 1, 1, help_line[:w-2])
    except curses.error:
        pass


def draw_synth_select(stdscr, game: Game, is_base: bool):
    """Draw synthesis item selection."""
    h, w = stdscr.getmaxyx()
    stdscr.clear()

    title = "=== 合成: ベース選択 ===" if is_base else "=== 合成: 素材選択 ==="
    try:
        stdscr.addstr(0, max(0, (w - len(title)) // 2), title,
                      curses.color_pair(COLOR_TITLE) | curses.A_BOLD)
    except curses.error:
        pass

    equips = game.get_inventory_equips()
    if not is_base:
        equips = [(i, it) for i, it in equips if i != game.synth_base_idx]

    if not equips:
        try:
            stdscr.addstr(2, 2, "合成できる装備がない。")
        except curses.error:
            pass
    else:
        for j, (idx, item) in enumerate(equips):
            y = 2 + j
            if y >= h - 3:
                break
            prefix = ">" if j == game.cursor else " "
            cat_mark = "[武]" if item.category == ItemCategory.WEAPON else "[防]"
            line = f"{prefix} {cat_mark} {item.display_name}"
            if item.abilities:
                seals = " ".join(
                    f"{a}({ABILITY_SEALS.get(a, '?')})" for a in item.abilities
                )
                line += f"  印: {seals}"
            attr = curses.A_REVERSE if j == game.cursor else 0
            try:
                stdscr.addstr(y, 1, line[:w-2], attr)
            except curses.error:
                pass

    help_line = "[j/k] 移動  [Enter] 選択  [q] キャンセル"
    try:
        stdscr.addstr(h - 1, 1, help_line[:w-2])
    except curses.error:
        pass


def draw_delivery(stdscr, game: Game):
    """Draw delivery item selection."""
    h, w = stdscr.getmaxyx()
    stdscr.clear()

    title = "=== 宅配: 送るアイテムを選択 ==="
    try:
        stdscr.addstr(0, max(0, (w - len(title)) // 2), title,
                      curses.color_pair(COLOR_TITLE) | curses.A_BOLD)
    except curses.error:
        pass

    items = game.player.inventory
    for i, item in enumerate(items):
        y = 2 + i
        if y >= h - 3:
            break
        prefix = ">" if i == game.cursor else " "
        line = f"{prefix} {item.display_name}"
        attr = curses.A_REVERSE if i == game.cursor else 0
        try:
            stdscr.addstr(y, 1, line[:w-2], attr)
        except curses.error:
            pass

    help_line = "[j/k] 移動  [Enter] 送る  [q] キャンセル"
    try:
        stdscr.addstr(h - 1, 1, help_line[:w-2])
    except curses.error:
        pass


def draw_game_over(stdscr, game: Game):
    """Draw game over screen."""
    h, w = stdscr.getmaxyx()
    stdscr.clear()

    lines = [
        "╔══════════════════════════╗",
        "║     GAME OVER           ║",
        "║   力尽きた…             ║",
        "╚══════════════════════════╝",
        "",
        "全てのアイテムとゴールドを失った。",
        f"到達階: {game.player.floor}F",
        "",
        "[Enter] タイトルへ  [q] 終了",
    ]

    start_y = h // 2 - len(lines) // 2
    for i, line in enumerate(lines):
        y = start_y + i
        x = max(0, (w - 30) // 2)
        if 0 <= y < h:
            color = COLOR_HP_LOW if i < 4 else COLOR_DEFAULT
            try:
                stdscr.addstr(y, x, line, curses.color_pair(color))
            except curses.error:
                pass


def draw_victory(stdscr, game: Game):
    """Draw victory screen."""
    h, w = stdscr.getmaxyx()
    stdscr.clear()

    lines = [
        "╔══════════════════════════════════╗",
        "║        CONGRATULATIONS!          ║",
        "║  ダンジョン攻略成功！            ║",
        "╚══════════════════════════════════╝",
        "",
        f"最終レベル: {game.player.level}",
        f"ターン数: {game.player.turn_count}",
        f"所持ゴールド: {game.player.gold}",
        "",
        "[Enter] タイトルへ  [q] 終了",
    ]

    start_y = h // 2 - len(lines) // 2
    for i, line in enumerate(lines):
        y = start_y + i
        x = max(0, (w - 36) // 2)
        if 0 <= y < h:
            color = COLOR_STAIRS if i < 4 else COLOR_DEFAULT
            try:
                stdscr.addstr(y, x, line, curses.color_pair(color))
            except curses.error:
                pass


# ---------------------------------------------------------------------------
# Main render dispatcher
# ---------------------------------------------------------------------------

def render(stdscr, game: Game):
    """Main render function — dispatches to the correct screen."""
    if game.state == GameState.TITLE:
        draw_title(stdscr, game)
    elif game.state == GameState.EXPLORE:
        draw_game(stdscr, game)
    elif game.state == GameState.INVENTORY:
        draw_inventory(stdscr, game)
    elif game.state == GameState.DELIVERY:
        draw_delivery(stdscr, game)
    elif game.state == GameState.SYNTH_BASE:
        draw_synth_select(stdscr, game, is_base=True)
    elif game.state == GameState.SYNTH_MATERIAL:
        draw_synth_select(stdscr, game, is_base=False)
    elif game.state == GameState.GAME_OVER:
        draw_game_over(stdscr, game)
    elif game.state == GameState.VICTORY:
        draw_victory(stdscr, game)

    stdscr.refresh()
