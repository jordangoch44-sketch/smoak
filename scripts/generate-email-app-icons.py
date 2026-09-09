#!/usr/bin/env python3
"""Generate compact email app icons (stdlib only)."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

SIZE = 72
OUT = Path("public/email")


def png_rgba(pixels: list[list[tuple[int, int, int, int]]]) -> bytes:
    height = len(pixels)
    width = len(pixels[0])
    raw = bytearray()
    for row in pixels:
        raw.append(0)
        for r, g, b, a in row:
            raw.extend((r, g, b, a))

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )


def blank() -> list[list[tuple[int, int, int, int]]]:
    return [[(0, 0, 0, 0) for _ in range(SIZE)] for _ in range(SIZE)]


def setp(px, x, y, color):
    if 0 <= x < SIZE and 0 <= y < SIZE:
        px[y][x] = color


def fill_circle(px, cx, cy, radius, color):
    r2 = radius * radius
    for y in range(int(cy - radius), int(cy + radius) + 1):
        for x in range(int(cx - radius), int(cx + radius) + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r2:
                setp(px, x, y, color)


def fill_ring(px, cx, cy, outer, inner, color):
    o2, i2 = outer * outer, inner * inner
    for y in range(int(cy - outer), int(cy + outer) + 1):
        for x in range(int(cx - outer), int(cx + outer) + 1):
            d = (x - cx) ** 2 + (y - cy) ** 2
            if i2 <= d <= o2:
                setp(px, x, y, color)


def fill_round_rect(px, x0, y0, x1, y1, radius, color_at):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            dx = 0
            dy = 0
            if x < x0 + radius:
                dx = x0 + radius - x
            elif x > x1 - radius:
                dx = x - (x1 - radius)
            if y < y0 + radius:
                dy = y0 + radius - y
            elif y > y1 - radius:
                dy = y - (y1 - radius)
            if dx * dx + dy * dy <= radius * radius or (dx == 0 or dy == 0):
                t = (x - x0) / max(1, x1 - x0)
                setp(px, x, y, color_at(t, (y - y0) / max(1, y1 - y0)))


def lerp(a, b, t):
    return int(a + (b - a) * t)


def instagram():
    px = blank()

    def color(tx, ty):
        # Instagram-ish warm → magenta → blue
        if ty > 0.55:
            r = lerp(253, 40, (ty - 0.55) / 0.45)
            g = lerp(89, 90, (ty - 0.55) / 0.45)
            b = lerp(73, 235, (ty - 0.55) / 0.45)
        else:
            r = lerp(253, 214, ty / 0.55)
            g = lerp(196, 36, ty / 0.55)
            b = lerp(73, 159, ty / 0.55)
        r = lerp(r, 214, tx * 0.2)
        return (r, g, b, 255)

    fill_round_rect(px, 4, 4, 67, 67, 16, color)
    white = (255, 255, 255, 255)
    fill_ring(px, 36, 38, 16, 11, white)
    fill_circle(px, 52, 20, 4, white)
    return px


def tiktok():
    px = blank()
    fill_circle(px, 36, 36, 34, (17, 17, 21, 255))
    # offset cyan / pink note stems
    cyan = (37, 244, 238, 255)
    pink = (254, 44, 85, 255)
    white = (255, 255, 255, 255)

    def note(ox, oy, color):
        fill_circle(px, 28 + ox, 46 + oy, 8, color)
        for y in range(18 + oy, 47 + oy):
            for x in range(34 + ox, 38 + ox):
                setp(px, x, y, color)
        for y in range(18 + oy, 24 + oy):
            for x in range(34 + ox, 50 + ox):
                setp(px, x, y, color)

    note(3, 1, cyan)
    note(-2, -1, pink)
    note(0, 0, white)
    return px


def website():
    px = blank()
    fill_circle(px, 36, 36, 34, (22, 18, 32, 255))
    violet = (196, 181, 253, 255)
    fill_ring(px, 36, 36, 22, 19, violet)
    # meridians
    for x in (28, 36, 44):
        fill_ring(px, x, 36, 18, 16, violet)
    for y in range(18, 55):
        for x in range(16, 57):
            if abs(y - 36) <= 1 and 16 <= x <= 55:
                setp(px, x, y, violet)
            if abs(y - 26) <= 1 and 20 <= x <= 51:
                setp(px, x, y, violet)
            if abs(y - 46) <= 1 and 20 <= x <= 51:
                setp(px, x, y, violet)
    return px


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "icon-instagram.png").write_bytes(png_rgba(instagram()))
    (OUT / "icon-tiktok.png").write_bytes(png_rgba(tiktok()))
    (OUT / "icon-website.png").write_bytes(png_rgba(website()))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
