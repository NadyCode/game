#!/usr/bin/env python3
"""Dungeon Nanpa Chronicle — Main entry point.

2D roguelike RPG where a flirty protagonist conquers a dungeon
through the power of nanpa (pickup lines) rather than violence.

Usage:
    python main.py
"""

from __future__ import annotations

import curses
import sys
import locale

from game import Game
from ui import init_colors, render


def main(stdscr):
    """Main game loop running inside curses."""
    # Curses setup
    curses.curs_set(0)      # Hide cursor
    stdscr.nodelay(False)   # Blocking input
    stdscr.timeout(-1)
    init_colors()

    game = Game()

    running = True
    while running:
        # Render current state
        render(stdscr, game)

        # Get input
        try:
            ch = stdscr.get_wch()
        except curses.error:
            continue

        # Convert special keys
        if isinstance(ch, int):
            key_map = {
                curses.KEY_LEFT: "KEY_LEFT",
                curses.KEY_RIGHT: "KEY_RIGHT",
                curses.KEY_UP: "KEY_UP",
                curses.KEY_DOWN: "KEY_DOWN",
                curses.KEY_ENTER: "\n",
                10: "\n",
                13: "\n",
            }
            key = key_map.get(ch, str(ch))
        else:
            key = ch

        running = game.process_input(key)


if __name__ == "__main__":
    locale.setlocale(locale.LC_ALL, "")
    try:
        curses.wrapper(main)
    except KeyboardInterrupt:
        pass
    finally:
        print("ダンジョン・ナンパ・クロニクル — またね！")
