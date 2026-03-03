from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

DIR = os.path.dirname(os.path.abspath(__file__))

W, H = 1280, 800
BG = (99, 102, 241)
WHITE = (255, 255, 255)
DARK = (30, 30, 46)
LIGHT_BG = (248, 248, 255)
ACCENT = (99, 102, 241)
GRAY = (120, 120, 140)
GREEN = (34, 197, 94)

sf = "/System/Library/Fonts/SFNS.ttf"
sf_bold = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
sf_mono = "/System/Library/Fonts/SFNSMono.ttf"
arial_uni = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"

f_title = ImageFont.truetype(sf_bold, 42)
f_sub = ImageFont.truetype(sf, 21)
f_label = ImageFont.truetype(sf_bold, 15)
f_body = ImageFont.truetype(arial_uni, 19)
f_small = ImageFont.truetype(sf, 14)
f_mono = ImageFont.truetype(sf_mono, 14)
f_feat = ImageFont.truetype(sf, 16)
f_toast = ImageFont.truetype(sf_bold, 14)
f_arrow = ImageFont.truetype(sf_bold, 17)
f_check = ImageFont.truetype(arial_uni, 18)

# Base image
img = Image.new("RGBA", (W, H), BG)

# Draw shadows first on a separate layer, then composite once
shadow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow_layer)

left_x, panel_y, panel_w, panel_h = 55, 155, 500, 530
right_x = 725
right_w = 500

# Shadow rectangles
sd.rounded_rectangle((left_x + 5, panel_y + 5, left_x + panel_w + 5, panel_y + panel_h + 5), 16, fill=(0, 0, 0, 50))
sd.rounded_rectangle((right_x + 5, panel_y + 5, right_x + right_w + 5, panel_y + panel_h + 5), 16, fill=(0, 0, 0, 50))
shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(10))

img = Image.alpha_composite(img, shadow_layer)
draw = ImageDraw.Draw(img)

# ==================== TITLE ====================
draw.text((W // 2, 45), "Greeklish to Greek", font=f_title, fill=WHITE, anchor="mt")
draw.text((W // 2, 98), "Type in Greeklish, get proper Greek instantly. Powered by Claude AI.", font=f_sub, fill=(215, 215, 255), anchor="mt")


# ==================== HELPER ====================
def browser_chrome(draw, x, y, w, url_text):
    header_h = 42
    draw.rounded_rectangle((x, y, x + w, y + header_h), 16, fill=(242, 242, 245))
    draw.rectangle((x, y + 28, x + w, y + header_h), fill=(242, 242, 245))
    for i, c in enumerate([(255, 95, 87), (255, 189, 46), (39, 201, 63)]):
        draw.ellipse((x + 16 + i * 22, y + 13, x + 28 + i * 22, y + 25), fill=c)
    ub = x + 86
    draw.rounded_rectangle((ub, y + 9, x + w - 14, y + 32), 6, fill=WHITE)
    draw.text((ub + 10, y + 12), url_text, font=f_small, fill=GRAY)


def text_box(draw, x, y, w, h, lines, outline_color=(210, 210, 220)):
    draw.rounded_rectangle((x, y, x + w, y + h), 10, fill=LIGHT_BG, outline=outline_color)
    # Blinking cursor line at top
    draw.line((x + 16, y + 16, x + 16, y + 32), fill=ACCENT, width=2)
    ty = y + 18
    for line in lines:
        draw.text((x + 24, ty), line, font=f_body, fill=DARK)
        ty += 26


# ==================== LEFT PANEL (BEFORE) ====================
draw.rounded_rectangle((left_x, panel_y, left_x + panel_w, panel_y + panel_h), 16, fill=WHITE)
browser_chrome(draw, left_x, panel_y, panel_w, "any-website.com")

draw.text((left_x + 20, panel_y + 56), "GREEKLISH INPUT", font=f_label, fill=ACCENT)

greeklish = [
    "Geia sou Maria,",
    "",
    "Ti kaneis? Ithela na se rotiso",
    "an eisai eleutheri avrio to",
    "mesimeri gia ena kafe.",
]
text_box(draw, left_x + 18, panel_y + 82, panel_w - 36, 200, greeklish)

# Keyboard shortcut badge
sy = panel_y + 300
draw.rounded_rectangle((left_x + 110, sy, left_x + panel_w - 110, sy + 34), 8, fill=(237, 237, 255), outline=ACCENT, width=1)
draw.text((left_x + panel_w // 2, sy + 8), "Press  Ctrl + Shift + G", font=f_mono, fill=ACCENT, anchor="mt")

# Mini popup preview
py = panel_y + 355
pw = 210
draw.rounded_rectangle((left_x + 18, py, left_x + 18 + pw, py + 130), 10, fill=WHITE, outline=(215, 215, 225))

icon_path = os.path.join(DIR, "icon48.png")
if os.path.exists(icon_path):
    icon = Image.open(icon_path).convert("RGBA").resize((24, 24))
    img.paste(icon, (left_x + 30, py + 10), icon)
    draw = ImageDraw.Draw(img)

draw.text((left_x + 60, py + 12), "Greeklish to Greek", font=f_label, fill=DARK)
draw.text((left_x + 30, py + 42), "API Key", font=f_small, fill=GRAY)
draw.rounded_rectangle((left_x + 30, py + 58, left_x + pw, py + 78), 5, fill=LIGHT_BG, outline=(215, 215, 225))
draw.text((left_x + 38, py + 61), "sk-ant-**********", font=f_small, fill=GRAY)
draw.rounded_rectangle((left_x + 30, py + 90, left_x + pw, py + 112), 6, fill=ACCENT)
draw.text((left_x + 18 + pw // 2, py + 93), "Save", font=f_small, fill=WHITE, anchor="mt")


# ==================== ARROW ====================
ax = left_x + panel_w + 35
ay = panel_y + panel_h // 2 - 30

draw.ellipse((ax - 28, ay - 28, ax + 28, ay + 28), fill=WHITE)
draw.polygon([(ax - 8, ay - 12), (ax + 12, ay), (ax - 8, ay + 12)], fill=ACCENT)
draw.text((ax, ay + 42), "Claude AI", font=f_arrow, fill=WHITE, anchor="mt")


# ==================== RIGHT PANEL (AFTER) ====================
draw.rounded_rectangle((right_x, panel_y, right_x + right_w, panel_y + panel_h), 16, fill=WHITE)
browser_chrome(draw, right_x, panel_y, right_w, "any-website.com")

draw.text((right_x + 20, panel_y + 56), "GREEK OUTPUT", font=f_label, fill=GREEN)

greek = [
    "\u0393\u03b5\u03b9\u03b1 \u03c3\u03bf\u03c5 \u039c\u03b1\u03c1\u03af\u03b1,",
    "",
    "\u03a4\u03b9 \u03ba\u03ac\u03bd\u03b5\u03b9\u03c2; \u0389\u03b8\u03b5\u03bb\u03b1 \u03bd\u03b1 \u03c3\u03b5 \u03c1\u03c9\u03c4\u03ae\u03c3\u03c9",
    "\u03b1\u03bd \u03b5\u03af\u03c3\u03b1\u03b9 \u03b5\u03bb\u03b5\u03cd\u03b8\u03b5\u03c1\u03b7 \u03b1\u03cd\u03c1\u03b9\u03bf \u03c4\u03bf",
    "\u03bc\u03b5\u03c3\u03b7\u03bc\u03ad\u03c1\u03b9 \u03b3\u03b9\u03b1 \u03ad\u03bd\u03b1 \u03ba\u03b1\u03c6\u03ad.",
]
text_box(draw, right_x + 18, panel_y + 82, right_w - 36, 200, greek)

# Toast
ty = panel_y + 300
tw = 170
tx = right_x + (right_w - tw) // 2
draw.rounded_rectangle((tx, ty, tx + tw, ty + 32), 8, fill=GREEN)
draw.text((tx + tw // 2, ty + 7), "Translated!", font=f_toast, fill=WHITE, anchor="mt")

# Features list
fy = panel_y + 355
features = [
    "Works on any website",
    "Preserves English words",
    "Keeps tone & formatting",
    "Custom keyboard shortcuts",
]
for feat in features:
    draw.text((right_x + 30, fy), "\u2713", font=f_check, fill=GREEN)
    draw.text((right_x + 54, fy + 1), feat, font=f_feat, fill=DARK)
    fy += 30

# ==================== SAVE ====================
out = os.path.join(DIR, "screenshot_promo.png")
img.convert("RGB").save(out, quality=95)
print(f"Saved: {out} ({W}x{H})")
