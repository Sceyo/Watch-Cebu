import os
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# 1. Load original image and extract contours
img_path = r'C:\Users\francis\.gemini\antigravity\brain\830a731e-0ea8-498a-b92e-e1401cdc4f8e\.user_uploaded\media_1792137212183_c936b8ef.png'
orig = Image.open(img_path)
arr = np.array(orig.convert('L'))
binary = (arr < 80).astype(np.uint8)

dirs = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]

def trace_boundary(comp_mask):
    h, w = comp_mask.shape
    start = None
    for y in range(h):
        for x in range(w):
            if comp_mask[y, x]:
                start = (y, x)
                break
        if start:
            break
    if not start:
        return []
    contour = [start]
    curr = start
    back_dir = 6
    max_steps = 15000
    for _ in range(max_steps):
        found = False
        start_d = (back_dir + 1) % 8
        for i in range(8):
            d_idx = (start_d + i) % 8
            dy, dx = dirs[d_idx]
            ny, nx = curr[0] + dy, curr[1] + dx
            if 0 <= ny < h and 0 <= nx < w and comp_mask[ny, nx]:
                back_dir = (d_idx + 4) % 8
                curr = (ny, nx)
                if curr == start:
                    found = True
                    break
                contour.append(curr)
                found = True
                break
        if not found or curr == start:
            break
    return contour

def rdp(points, epsilon):
    if len(points) < 3:
        return points
    start = np.array(points[0])
    end = np.array(points[-1])
    line_vec = end - start
    line_len = np.linalg.norm(line_vec)
    if line_len == 0:
        dists = np.linalg.norm(np.array(points) - start, axis=1)
    else:
        line_unit = line_vec / line_len
        vecs = np.array(points) - start
        proj = np.dot(vecs, line_unit)
        proj = np.clip(proj, 0, line_len)
        closest = start + np.outer(proj, line_unit)
        dists = np.linalg.norm(np.array(points) - closest, axis=1)
    max_idx = np.argmax(dists)
    max_dist = dists[max_idx]
    if max_dist > epsilon:
        left = rdp(points[:max_idx+1], epsilon)
        right = rdp(points[max_idx:], epsilon)
        return left[:-1] + right
    else:
        return [points[0], points[-1]]

h, w = binary.shape
visited = np.zeros_like(binary, dtype=bool)
components = []
for y in range(h):
    for x in range(w):
        if binary[y, x] and not visited[y, x]:
            q = [(y, x)]
            visited[y, x] = True
            comp = []
            while q:
                cy, cx = q.pop()
                comp.append((cy, cx))
                for dy, dx in [(-1,0), (1,0), (0,-1), (0,1), (-1,-1), (-1,1), (1,-1), (1,1)]:
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and binary[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        q.append((ny, nx))
            if len(comp) > 25:
                components.append(comp)

components.sort(key=lambda c: len(c), reverse=True)

all_simplified = []
for comp in components:
    mask = np.zeros_like(binary)
    for py, px in comp:
        mask[py, px] = 1
    cnt = trace_boundary(mask)
    pts = [(x, y) for (y, x) in cnt]
    pts.append(pts[0])
    simplified = rdp(pts, 1.2)
    all_simplified.append(simplified)

min_x, max_x = 288, 717
min_y, max_y = 31, 524

# Function to render anti-aliased icon image at size S (using 4x supersampling)
def render_icon(size, fg_color, bg_color, with_radar=False, with_pulse=False):
    ss = 4
    canvas_size = size * ss
    img = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded background rect
    r = int(canvas_size * 0.22)
    draw.rounded_rectangle([0, 0, canvas_size - 1, canvas_size - 1], radius=r, fill=bg_color)
    draw.rounded_rectangle([ss, ss, canvas_size - 1 - ss, canvas_size - 1 - ss], radius=r, outline=(51, 65, 85, 255), width=int(2 * ss))

    # Calculate scale and offsets
    scale = (canvas_size * 0.82) / 493.0
    x_off = (canvas_size - 429.0 * scale) / 2.0
    y_off = canvas_size * 0.09

    # Cebu City center approx coords in normalized space
    cebu_city_x = (568 - min_x) * scale + x_off
    cebu_city_y = (325 - min_y) * scale + y_off

    if with_radar:
        # Subtle civic radar circles
        r1 = int(canvas_size * 0.28)
        r2 = int(canvas_size * 0.16)
        draw.ellipse([cebu_city_x - r1, cebu_city_y - r1, cebu_city_x + r1, cebu_city_y + r1], outline=(51, 65, 85, 120), width=int(1.5 * ss))
        draw.ellipse([cebu_city_x - r2, cebu_city_y - r2, cebu_city_x + r2, cebu_city_y + r2], outline=(51, 65, 85, 160), width=int(1.5 * ss))

    # Draw island polygons
    for comp_pts in all_simplified:
        scaled_pts = []
        for px, py in comp_pts:
            sx = (px - min_x) * scale + x_off
            sy = (py - min_y) * scale + y_off
            scaled_pts.append((sx, sy))
        if len(scaled_pts) >= 3:
            draw.polygon(scaled_pts, fill=fg_color)

    if with_pulse:
        # Metro Cebu civic pulse point
        pulse_r = int(canvas_size * 0.055)
        core_r = int(canvas_size * 0.024)
        draw.ellipse([cebu_city_x - pulse_r, cebu_city_y - pulse_r, cebu_city_x + pulse_r, cebu_city_y + pulse_r], fill=(239, 68, 68, 100))
        draw.ellipse([cebu_city_x - core_r, cebu_city_y - core_r, cebu_city_x + core_r, cebu_city_y + core_r], fill=(239, 68, 68, 255))

    # Downscale using Lanczos for crisp vector-like anti-aliasing
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

# Output directories
artifact_dir = r'C:\Users\francis\.gemini\antigravity\brain\830a731e-0ea8-498a-b92e-e1401cdc4f8e'
public_icons = r'c:\Users\francis\Documents\GitHub\Watch-Cebu\public\icons'

# Render 3 design variants at 512x512
img_cyan = render_icon(512, (56, 189, 248, 255), (15, 23, 42, 255), with_radar=False, with_pulse=False)
img_radar = render_icon(512, (56, 189, 248, 255), (15, 23, 42, 255), with_radar=True, with_pulse=True)
img_amber = render_icon(512, (245, 158, 11, 255), (15, 23, 42, 255), with_radar=False, with_pulse=False)

# Save to artifacts
img_cyan.save(os.path.join(artifact_dir, 'cebu_logo_cyan.png'))
img_radar.save(os.path.join(artifact_dir, 'cebu_logo_radar.png'))
img_amber.save(os.path.join(artifact_dir, 'cebu_logo_amber.png'))

# Render a header simulation banner (800x120)
header_banner = Image.new('RGBA', (800, 140), (15, 23, 42, 255))
h_draw = ImageDraw.Draw(header_banner)
# Top border line
h_draw.line([(0, 139), (800, 139)], fill=(51, 65, 85, 255), width=2)

# Small cebu icon
mini_icon = render_icon(64, (56, 189, 248, 255), (30, 41, 59, 255), with_radar=False, with_pulse=True)
header_banner.paste(mini_icon, (32, 38), mini_icon)

# Draw simulated header text
try:
    font = ImageFont.truetype("arialbd.ttf", 32)
    font_sub = ImageFont.truetype("arial.ttf", 16)
except:
    font = ImageFont.load_default()
    font_sub = ImageFont.load_default()

h_draw.text((115, 42), "WATCH CEBU", fill=(255, 255, 255, 255), font=font)
h_draw.text((116, 80), "CIVIC AWARENESS & MULTI-HAZARD MAP", fill=(148, 163, 184, 255), font=font_sub)

# Status chip simulation
h_draw.rounded_rectangle([520, 50, 760, 90], radius=8, fill=(30, 41, 59, 255), outline=(16, 185, 129, 255), width=1)
h_draw.ellipse([536, 66, 544, 74], fill=(16, 185, 129, 255))
h_draw.text((554, 60), "4 Live Feeds Verified", fill=(248, 250, 252, 255), font=font_sub)

header_banner.save(os.path.join(artifact_dir, 'cebu_header_preview.png'))

print('All preview icons and banners rendered and saved successfully to artifact directory!')
