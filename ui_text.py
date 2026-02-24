"""Fallback text-based UI for environments without curses support."""

from __future__ import annotations

import os
import sys

from entities import Player, ItemCategory
from dungeon import DungeonMap, Tile
from game import Game, GameState, MAX_FLOOR
from items import ABILITY_SEALS


# ANSI color codes
class C:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"
    REVERSE = "\033[7m"


def clear_screen():
    sys.stdout.write("\033[2J\033[H")
    sys.stdout.flush()


# ---------------------------------------------------------------------------
# Viewport
# ---------------------------------------------------------------------------

VIEW_W = 50
VIEW_H = 18


def get_viewport(player: Player, dmap: DungeonMap):
    cam_x = player.x - VIEW_W // 2
    cam_y = player.y - VIEW_H // 2
    cam_x = max(0, min(cam_x, dmap.width - VIEW_W))
    cam_y = max(0, min(cam_y, dmap.height - VIEW_H))
    return cam_x, cam_y


# ---------------------------------------------------------------------------
# Title
# ---------------------------------------------------------------------------

def render_title(game: Game) -> str:
    lines = []
    lines.append("")
    lines.append(f"{C.MAGENTA}{C.BOLD}")
    lines.append("  ╔══════════════════════════════════════╗")
    lines.append("  ║   ダンジョン・ナンパ・クロニクル     ║")
    lines.append("  ║   ~ Dungeon Nanpa Chronicle ~        ║")
    lines.append("  ╚══════════════════════════════════════╝")
    lines.append(f"{C.RESET}")
    lines.append("")
    lines.append("  チャラ男が「ナンパ」でダンジョンを攻略！")
    lines.append("")
    lines.append(f"  目標: {MAX_FLOOR}F を目指せ！")
    lines.append("")
    lines.append("  [Enter] ゲーム開始   [q] 終了")
    lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Map
# ---------------------------------------------------------------------------

def render_game(game: Game) -> str:
    lines = []
    dmap = game.dmap
    player = game.player
    if dmap is None:
        return "マップなし"

    see_all = player.has_ability("見")
    cam_x, cam_y = get_viewport(player, dmap)

    for sy in range(VIEW_H):
        row = []
        for sx in range(VIEW_W):
            mx = cam_x + sx
            my = cam_y + sy
            if not dmap.in_bounds(mx, my):
                row.append(" ")
                continue

            if not see_all and (mx, my) not in dmap.explored:
                row.append(" ")
                continue

            tile = dmap.tiles[my][mx]
            ch = tile
            color = ""

            if tile == Tile.WALL:
                ch = "#"
                color = C.WHITE
            elif tile == Tile.STAIRS:
                ch = ">"
                color = C.GREEN + C.BOLD

            fi = dmap.item_at(mx, my)
            if fi:
                ch = fi.item.floor_char
                color = C.YELLOW

            enemy = dmap.enemy_at(mx, my)
            if enemy:
                ch = enemy.char
                color = C.RED + C.BOLD

            if mx == player.x and my == player.y:
                ch = "@"
                color = C.CYAN + C.BOLD

            if color:
                row.append(f"{color}{ch}{C.RESET}")
            else:
                row.append(ch)
        lines.append("".join(row))

    # HUD
    hp_ratio = player.hp / max(1, player.max_hp)
    hp_color = C.GREEN if hp_ratio > 0.3 else C.RED
    lines.append(f"{'─' * VIEW_W}")
    lines.append(
        f" {player.floor}F  "
        f"{hp_color}LP:{player.hp}/{player.max_hp}{C.RESET}  "
        f"MP:{player.mp}/{player.max_mp}  "
        f"Lv:{player.level}  "
        f"トーク:{player.effective_atk}  "
        f"耐性:{player.effective_def}  "
        f"G:{player.gold}"
    )
    w_name = player.weapon.display_name if player.weapon else "なし"
    a_name = player.armor.display_name if player.armor else "なし"
    lines.append(f" 武器:{w_name}  防具:{a_name}  持物:{len(player.inventory)}/{player.max_inventory}")
    lines.append(f"{'─' * VIEW_W}")

    # Messages
    msgs = game.get_visible_messages(5)
    for msg in msgs:
        lines.append(f" {msg}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Inventory
# ---------------------------------------------------------------------------

def render_inventory(game: Game) -> str:
    lines = []
    player = game.player
    lines.append(f"{C.MAGENTA}{C.BOLD}=== インベントリ ==={C.RESET}")
    lines.append("")

    if not player.inventory:
        lines.append("  持ち物がない。")
    else:
        for i, item in enumerate(player.inventory):
            prefix = f"{C.REVERSE}>" if i == game.cursor else " "
            cat_mark = ""
            if item.category == ItemCategory.WEAPON:
                cat_mark = "[武]"
            elif item.category == ItemCategory.ARMOR:
                cat_mark = "[防]"
            elif item.category == ItemCategory.CONSUMABLE:
                cat_mark = "[消]"
            elif item.category == ItemCategory.SYNTH_BAG:
                cat_mark = "[袋]"
            line = f" {prefix} {cat_mark} {item.display_name}"
            if item.description:
                line += f"  - {item.description}"
            if i == game.cursor:
                line += C.RESET
            lines.append(line)

    lines.append("")
    lines.append(" [j/k] 移動  [Enter] 使う  [e] 装備  [d] 置く  [q] 閉じる")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Synthesis select
# ---------------------------------------------------------------------------

def render_synth_select(game: Game, is_base: bool) -> str:
    lines = []
    title = "=== 合成: ベース選択 ===" if is_base else "=== 合成: 素材選択 ==="
    lines.append(f"{C.MAGENTA}{C.BOLD}{title}{C.RESET}")
    lines.append("")

    equips = game.get_inventory_equips()
    if not is_base:
        equips = [(i, it) for i, it in equips if i != game.synth_base_idx]

    if not equips:
        lines.append("  合成できる装備がない。")
    else:
        for j, (idx, item) in enumerate(equips):
            prefix = f"{C.REVERSE}>" if j == game.cursor else " "
            cat_mark = "[武]" if item.category == ItemCategory.WEAPON else "[防]"
            line = f" {prefix} {cat_mark} {item.display_name}"
            if item.abilities:
                seals = " ".join(f"{a}({ABILITY_SEALS.get(a, '?')})" for a in item.abilities)
                line += f"  印: {seals}"
            if j == game.cursor:
                line += C.RESET
            lines.append(line)

    lines.append("")
    lines.append(" [j/k] 移動  [Enter] 選択  [q] キャンセル")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Delivery
# ---------------------------------------------------------------------------

def render_delivery(game: Game) -> str:
    lines = []
    lines.append(f"{C.MAGENTA}{C.BOLD}=== 宅配: 送るアイテムを選択 ==={C.RESET}")
    lines.append("")

    items = game.player.inventory
    for i, item in enumerate(items):
        prefix = f"{C.REVERSE}>" if i == game.cursor else " "
        line = f" {prefix} {item.display_name}"
        if i == game.cursor:
            line += C.RESET
        lines.append(line)

    lines.append("")
    lines.append(" [j/k] 移動  [Enter] 送る  [q] キャンセル")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Game over / Victory
# ---------------------------------------------------------------------------

def render_game_over(game: Game) -> str:
    lines = [
        "",
        f"{C.RED}{C.BOLD}",
        "  ╔══════════════════════════╗",
        "  ║       GAME OVER          ║",
        "  ║     力尽きた…            ║",
        "  ╚══════════════════════════╝",
        f"{C.RESET}",
        "",
        f"  全てのアイテムとゴールドを失った。",
        f"  到達階: {game.player.floor}F",
        "",
        "  [Enter] タイトルへ  [q] 終了",
        "",
    ]
    return "\n".join(lines)


def render_victory(game: Game) -> str:
    lines = [
        "",
        f"{C.GREEN}{C.BOLD}",
        "  ╔══════════════════════════════════╗",
        "  ║        CONGRATULATIONS!           ║",
        "  ║    ダンジョン攻略成功！            ║",
        "  ╚══════════════════════════════════╝",
        f"{C.RESET}",
        "",
        f"  最終レベル: {game.player.level}",
        f"  ターン数: {game.player.turn_count}",
        f"  所持ゴールド: {game.player.gold}",
        "",
        "  [Enter] タイトルへ  [q] 終了",
        "",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Render dispatcher
# ---------------------------------------------------------------------------

def text_render(game: Game) -> str:
    if game.state == GameState.TITLE:
        return render_title(game)
    elif game.state == GameState.EXPLORE:
        return render_game(game)
    elif game.state == GameState.INVENTORY:
        return render_inventory(game)
    elif game.state == GameState.DELIVERY:
        return render_delivery(game)
    elif game.state == GameState.SYNTH_BASE:
        return render_synth_select(game, is_base=True)
    elif game.state == GameState.SYNTH_MATERIAL:
        return render_synth_select(game, is_base=False)
    elif game.state == GameState.GAME_OVER:
        return render_game_over(game)
    elif game.state == GameState.VICTORY:
        return render_victory(game)
    return ""
