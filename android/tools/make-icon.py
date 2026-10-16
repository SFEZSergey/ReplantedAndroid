#!/usr/bin/env python3
# Иконка лаунчера порта PvZ Replanted (своя, не арт EA): небо и газон на фоне, росток с двумя листьями
# и солнце на переднем плане. Чистый Python (zlib), сглаживание 4x4. Пишет в res/:
#   mipmap-anydpi-v26/ic_launcher.xml — адаптивная иконка (фон + передний план, по 108 dp),
#   mipmap-<dpi>/ic_launcher.png — обычная иконка, mipmap-<dpi>/ic_launcher_{background,foreground}.png.
import math
import os
import struct
import sys
import zlib

RES = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "res")
DENSITIES = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}
SS = 4


def png(path, width, height, pixels):
    raw = b"".join(b"\0" + bytes(pixels[y * width * 4:(y + 1) * width * 4]) for y in range(height))
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)
    with open(path, "wb") as out:
        out.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
                  + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def mix(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(len(a)))


def over(dst, src):
    # src, dst: (r, g, b, a) с a в 0..1
    a = src[3] + dst[3] * (1 - src[3])
    if a <= 0:
        return (0.0, 0.0, 0.0, 0.0)
    return tuple((src[i] * src[3] + dst[i] * dst[3] * (1 - src[3])) / a for i in range(3)) + (a,)


def hexrgb(value, alpha=1.0):
    return ((value >> 16) & 255, (value >> 8) & 255, value & 255, alpha)


def ellipse(x, y, cx, cy, rx, ry, angle=0.0):
    c, s = math.cos(angle), math.sin(angle)
    dx, dy = x - cx, y - cy
    u, v = dx * c + dy * s, -dx * s + dy * c
    return (u / rx) ** 2 + (v / ry) ** 2 <= 1.0


def background(x, y):
    # Небо сверху, газон снизу с мягким горизонтом.
    sky = mix(hexrgb(0x5EB8E6), hexrgb(0xA9DCF2), min(1.0, y / 0.62))
    lawn = mix(hexrgb(0x7CB342), hexrgb(0x558B2F), max(0.0, (y - 0.64) / 0.36))
    t = min(1.0, max(0.0, (y - 0.60) / 0.06))
    return mix(sky, lawn, t)


def foreground(x, y):
    color = (0.0, 0.0, 0.0, 0.0)
    # Солнце с лучами.
    sx, sy, sr = 0.655, 0.355, 0.085
    d = math.hypot(x - sx, y - sy)
    angle = math.atan2(y - sy, x - sx)
    if sr * 1.25 < d < sr * 1.75 and abs(((angle / (2 * math.pi / 10)) % 1.0) - 0.5) > 0.32:
        color = over(color, hexrgb(0xFFC93C))
    if d <= sr:
        color = over(color, mix(hexrgb(0xFFE57F), hexrgb(0xFFB300), d / sr))
    # Холмик земли.
    if ellipse(x, y, 0.47, 0.80, 0.20, 0.055):
        color = over(color, hexrgb(0x6D4C2F))
    # Стебель (слегка изогнутый).
    stem_x = 0.45 + 0.025 * math.sin((y - 0.47) * 9.0)
    if 0.47 <= y <= 0.80 and abs(x - stem_x) <= 0.018:
        color = over(color, hexrgb(0x2E7D32))
    # Листья с прожилкой.
    for cx, cy, angle in ((0.355, 0.63, -0.55), (0.545, 0.59, 0.50)):
        if ellipse(x, y, cx, cy, 0.105, 0.043, angle):
            vein = ellipse(x, y, cx, cy, 0.09, 0.006, angle)
            color = over(color, hexrgb(0x388E3C) if vein else hexrgb(0x66BB6A))
    # Бутон-голова: круг и завиток.
    if math.hypot(x - 0.45, y - 0.435) <= 0.062:
        color = over(color, mix(hexrgb(0x81C784), hexrgb(0x43A047), math.hypot(x - 0.43, y - 0.415) / 0.08))
    if ellipse(x, y, 0.51, 0.405, 0.045, 0.02, -0.7):
        color = over(color, hexrgb(0x66BB6A))
    return color


def render(size, shader, inset=0.0, rounded=False):
    pixels = bytearray(size * size * 4)
    for py in range(size):
        for px in range(size):
            acc = [0.0, 0.0, 0.0, 0.0]
            for sy in range(SS):
                for sx in range(SS):
                    u = (px + (sx + 0.5) / SS) / size
                    v = (py + (sy + 0.5) / SS) / size
                    if rounded:
                        # Скруглённый квадрат для обычной иконки.
                        r = 0.18
                        qx, qy = max(abs(u - 0.5) - (0.5 - r), 0), max(abs(v - 0.5) - (0.5 - r), 0)
                        if math.hypot(qx, qy) > r:
                            continue
                    # Передний план адаптивной иконки рисуется в безопасной зоне (66 из 108 dp).
                    fu, fv = (u - inset) / (1 - 2 * inset), (v - inset) / (1 - 2 * inset)
                    c = shader(fu, fv)
                    a = c[3]
                    acc[0] += c[0] * a
                    acc[1] += c[1] * a
                    acc[2] += c[2] * a
                    acc[3] += a
            n = SS * SS
            i = (py * size + px) * 4
            if acc[3] > 0:
                pixels[i:i + 4] = bytes((round(acc[0] / acc[3]), round(acc[1] / acc[3]), round(acc[2] / acc[3]), round(255 * acc[3] / n)))
    return pixels


def legacy(u, v):
    return over(background(u, v), foreground(u, v))


def main():
    os.makedirs(os.path.join(RES, "mipmap-anydpi-v26"), exist_ok=True)
    with open(os.path.join(RES, "mipmap-anydpi-v26", "ic_launcher.xml"), "w") as out:
        out.write('<?xml version="1.0" encoding="utf-8"?>\n'
                  '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
                  '    <background android:drawable="@mipmap/ic_launcher_background" />\n'
                  '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
                  '</adaptive-icon>\n')
    for name, scale in DENSITIES.items():
        folder = os.path.join(RES, "mipmap-" + name)
        os.makedirs(folder, exist_ok=True)
        adaptive = round(108 * scale)
        png(os.path.join(folder, "ic_launcher_background.png"), adaptive, adaptive, render(adaptive, lambda u, v: background(u, v) + (1.0,) if len(background(u, v)) == 3 else background(u, v)))
        png(os.path.join(folder, "ic_launcher_foreground.png"), adaptive, adaptive, render(adaptive, foreground, inset=0.12))
        size = round(48 * scale)
        png(os.path.join(folder, "ic_launcher.png"), size, size, render(size, legacy, rounded=True))
        print("icons", name, adaptive, size)


if __name__ == "__main__":
    main()
