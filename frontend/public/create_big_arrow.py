from PIL import Image, ImageDraw, ImageFont

print("Creating logo with BIGGER, CLEARER arrow...")

# Create 1200x630 image
width, height = 1200, 630
img = Image.new('RGB', (width, height), color='#1a0b2e')

# Dark purple gradient background
draw = ImageDraw.Draw(img)
for y in range(height):
    r = int(26 + (66 - 26) * (y / height))
    g = int(11 + (29 - 11) * (y / height))
    b = int(46 + (95 - 46) * (y / height))
    draw.rectangle([(0, y), (width, y+1)], fill=(r, g, b))

# ZIGZAG line
start_x = 180
start_y = 450
line_color = '#FFD700'
line_width = 24

# Zigzag points
points = [
    (start_x, start_y),
    (start_x + 85, start_y - 105),
    (start_x + 165, start_y - 55),
    (start_x + 250, start_y - 175),
]

# Draw zigzag segments
for i in range(len(points) - 1):
    draw.line([points[i], points[i+1]], fill=line_color, width=line_width)

# Draw dots
dot_radius = 16
for point in points:
    draw.ellipse([point[0]-dot_radius, point[1]-dot_radius,
                   point[0]+dot_radius, point[1]+dot_radius],
                  fill=line_color)

# BIGGER ARROW from last point
last_point = points[-1]

# Longer arrow shaft
arrow_end_x = last_point[0] + 65
arrow_end_y = last_point[1] - 65

# Draw thicker arrow shaft
draw.line([last_point, (arrow_end_x, arrow_end_y)], fill=line_color, width=line_width)

# MUCH BIGGER arrow head
arrow_tip = (arrow_end_x, arrow_end_y)
arrow_size = 45  # Much bigger!

# Create bold arrow head pointing up-right
# Right-pointing part
draw.polygon([
    arrow_tip,
    (arrow_tip[0] - 15, arrow_tip[1] + arrow_size),
    (arrow_tip[0] + 15, arrow_tip[1] + arrow_size),
], fill=line_color)

# Up-pointing part
draw.polygon([
    arrow_tip,
    (arrow_tip[0] - arrow_size, arrow_tip[1] + 15),
    (arrow_tip[0] - arrow_size, arrow_tip[1] - 15),
], fill=line_color)

# Add connecting shape to make arrow more solid
draw.polygon([
    arrow_tip,
    (arrow_tip[0] - arrow_size, arrow_tip[1]),
    (arrow_tip[0] - arrow_size + 15, arrow_tip[1] + 15),
    (arrow_tip[0] - 15, arrow_tip[1] + arrow_size - 15),
    (arrow_tip[0], arrow_tip[1] + arrow_size),
], fill=line_color)

# Add text
try:
    font_title = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 90)
    font_sub = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 36)
except:
    font_title = ImageFont.load_default()
    font_sub = ImageFont.load_default()

text_x = 540

# Title
draw.text((text_x, 200), "FunBet.AI", fill='#ffffff', font=font_title)

# Subtitle
draw.text((text_x, 310), "Odds Comparison,", fill='#d1d5db', font=font_sub)
draw.text((text_x, 355), "Live Scores &", fill='#d1d5db', font=font_sub)
draw.text((text_x, 400), "AI Predictions", fill='#d1d5db', font=font_sub)

# Save
img.save('og-image-big-arrow.png', 'PNG', optimize=True, quality=90)
print("✓ Created og-image-big-arrow.png with BIG, CLEAR arrow!")

print("\n✅ Arrow is now MUCH bigger and more visible!")
