#!/usr/bin/env python3
"""Dungeon Nanpa Chronicle — Main entry point.

2D roguelike RPG where a flirty protagonist conquers a dungeon
through the power of nanpa (pickup lines) rather than violence.

Usage:
    python main.py
"""

from __future__ import annotations

import os
import sys
import locale

from game import Game


def _can_use_curses() -> bool:
    """Check whether curses can initialize in this environment."""
    term = os.environ.get("TERM", "")
    if not term or term == "dumb":
        return False
    try:
        import curses
        curses.setupterm()
        return True
    except Exception:
        return False


# =========================================================================
# Curses mode
# =========================================================================

def run_curses():
    """Run using curses (full terminal UI)."""
    import curses
    from ui import init_colors, render

    def main(stdscr):
        curses.curs_set(0)
        stdscr.nodelay(False)
        stdscr.timeout(-1)
        init_colors()

        game = Game()
        running = True
        while running:
            render(stdscr, game)
            try:
                ch = stdscr.get_wch()
            except curses.error:
                continue

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

    curses.wrapper(main)


# =========================================================================
# Text fallback mode (no curses required)
# =========================================================================

def _setup_raw_input():
    """Set terminal to raw mode for single-char reads, if possible."""
    try:
        import tty
        import termios
        fd = sys.stdin.fileno()
        old_settings = termios.tcgetattr(fd)
        tty.setcbreak(fd)
        return old_settings, fd
    except Exception:
        return None, None


def _restore_input(old_settings, fd):
    """Restore original terminal settings."""
    if old_settings is not None:
        try:
            import termios
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
        except Exception:
            pass


def _read_key(raw_mode: bool) -> str:
    """Read a single key from stdin."""
    if raw_mode:
        ch = sys.stdin.read(1)
        if ch == "\x1b":
            # Escape sequence — try to read arrow keys
            seq = sys.stdin.read(2) if True else ""
            arrow_map = {
                "[A": "k", "[B": "j", "[C": "l", "[D": "h",
            }
            return arrow_map.get(seq, "\x1b")
        if ch == "\r" or ch == "\n":
            return "\n"
        return ch
    else:
        line = input("> ").strip()
        if not line:
            return "\n"
        return line[0]


def run_text():
    """Run using plain text output + single-key input."""
    from ui_text import text_render, clear_screen

    game = Game()
    old_settings, fd = _setup_raw_input()
    raw_mode = old_settings is not None

    try:
        running = True
        while running:
            clear_screen()
            print(text_render(game))

            if not raw_mode:
                print()
                print("コマンド (h/j/k/l/y/u/b/n/g/i/s/>/./q):")

            key = _read_key(raw_mode)
            running = game.process_input(key)
    except (KeyboardInterrupt, EOFError):
        pass
    finally:
        _restore_input(old_settings, fd)


# =========================================================================
# Entry point
# =========================================================================

if __name__ == "__main__":
    locale.setlocale(locale.LC_ALL, "")

    try:
        if _can_use_curses():
            run_curses()
        else:
            run_text()
    except KeyboardInterrupt:
        pass
    finally:
        print("ダンジョン・ナンパ・クロニクル — またね！")
