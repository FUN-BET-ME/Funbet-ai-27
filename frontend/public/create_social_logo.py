from PIL import Image, ImageDraw, ImageFont
import math

# Create 1200x630 image for social media (LinkedIn, Facebook, Twitter optimal size)
width, height = 1200, 630
img = Image.new('RGB', (width, height), color='#1a0b2e')

# Create gradient background (purple gradient)
draw = ImageDraw.Draw(img)
for y in range(height):
    # Gradient from dark purple to slightly lighter purple
    r = int(26 + (66 - 26) * (y / height))
    g = int(11 + (29 - 11) * (y / height))
    b = int(46 + (95 - 46) * (y / height))
    draw.rectangle([(0, y), (width, y+1)], fill=(r, g, b))

# Draw upward trending graph icon
graph_x = 400
graph_y = 250
graph_size = 120

# Draw trending line (upward)
points = [
    (graph_x, graph_y + 80),
    (graph_x + 30, graph_y + 60),
    (graph_x + 60, graph_y + 40),
    (graph_x + 90, graph_y + 10),
    (graph_x + 120, graph_y)
]

# Draw thick line with gradient effect (gold to purple)
for i in range(len(points)-1):
    draw.line([points[i], points[i+1]], fill='#fbbf24', width=8)

# Draw dots at each point
for point in points:
    draw.ellipse([point[0]-6, point[1]-6, point[0]+6, point[1]+6], fill='#fbbf24')

# Try to use a font, fallback to default if not available
try:
    # Try different font paths
    font_large = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 80)
    font_small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 60)
except:
    try:
        font_large = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 80)
        font_small = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 60)
    except:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

# Draw "FunBet.AI" text
text_x = 540
text_y = 280

# Draw "FunBet" in white
draw.text((text_x, text_y), "FunBet", fill='#ffffff', font=font_large)

# Draw ".AI" in gold
try:
    bbox = draw.textbbox((text_x, text_y), "FunBet", font=font_large)
    ai_x = bbox[2] + 5
except:
    ai_x = text_x + 300

draw.text((ai_x, text_y), ".AI", fill='#fbbf24', font=font_large)

# Draw tagline below
tagline = "Odds Comparison, Live Scores & AI Predictions"
try:
    tagline_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 28)
except:
    try:
        tagline_font = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', 28)
    except:
        tagline_font = font_small

try:
    tagline_bbox = draw.textbbox((0, 0), tagline, font=tagline_font)
    tagline_width = tagline_bbox[2] - tagline_bbox[0]
    tagline_x = (width - tagline_width) // 2
except:
    tagline_x = 300

draw.text((tagline_x, 400), tagline, fill='#9ca3af', font=tagline_font)

# Save the image
img.save('og-image.png', 'PNG', optimize=True)
print("Social media logo created: og-image.png (1200x630)")

# Also create a square version for favicons and smaller shares
img_square = Image.new('RGB', (512, 512), color='#1a0b2e')
draw_sq = ImageDraw.Draw(img_square)

# Gradient background
for y in range(512):
    r = int(26 + (66 - 26) * (y / 512))
    g = int(11 + (29 - 11) * (y / 512))
    b = int(46 + (95 - 46) * (y / 512))
    draw_sq.rectangle([(0, y), (512, y+1)], fill=(r, g, b))

# Draw trending line (smaller)
sq_x = 100
sq_y = 150
points_sq = [
    (sq_x, sq_y + 50),
    (sq_x + 25, sq_y + 35),
    (sq_x + 50, sq_y + 20),
    (sq_x + 75, sq_y + 5),
    (sq_x + 100, sq_y)
]

for i in range(len(points_sq)-1):
    draw_sq.line([points_sq[i], points_sq[i+1]], fill='#fbbf24', width=6)

for point in points_sq:
    draw_sq.ellipse([point[0]-5, point[1]-5, point[0]+5, point[1]+5], fill='#fbbf24')

# Text for square version
try:
    font_sq = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 48)
except:
    font_sq = font_large

draw_sq.text((100, 260), "FunBet", fill='#ffffff', font=font_sq)
try:
    bbox_sq = draw_sq.textbbox((100, 260), "FunBet", font=font_sq)
    ai_x_sq = bbox_sq[2] + 5
except:
    ai_x_sq = 300

draw_sq.text((ai_x_sq, 260), ".AI", fill='#fbbf24', font=font_sq)

img_square.save('logo-512.png', 'PNG', optimize=True)
print("Square logo created: logo-512.png (512x512)")

print("✓ Social media logos created successfully!")
