from PIL import Image, ImageDraw, ImageFont

print("Creating social media logo with PROPER arrow at the end...")

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

# ZIGZAG line with proper dimensions
start_x = 180
start_y = 450
line_color = '#FFD700'
line_width = 22

# Zigzag points
points = [
    (start_x, start_y),
    (start_x + 85, start_y - 105),
    (start_x + 165, start_y - 55),
    (start_x + 250, start_y - 175),
]

# Draw zigzag line segments
for i in range(len(points) - 1):
    draw.line([points[i], points[i+1]], fill=line_color, width=line_width)

# Draw dots at each zigzag point
dot_radius = 15
for point in points:
    draw.ellipse([point[0]-dot_radius, point[1]-dot_radius,
                   point[0]+dot_radius, point[1]+dot_radius],
                  fill=line_color)

# Now add the ARROW pointing UP-RIGHT from the last point
last_point = points[-1]

# Arrow dimensions
arrow_shaft_length = 55
arrow_end_x = last_point[0] + 45
arrow_end_y = last_point[1] - 45

# Draw arrow shaft (diagonal line)
draw.line([last_point, (arrow_end_x, arrow_end_y)], fill=line_color, width=line_width)

# Create ARROW HEAD
# The arrow head should be a clear up-right pointing arrow
arrow_tip = (arrow_end_x, arrow_end_y)
arrow_size = 28

# Create the arrow head as a triangle pointing up-right
# Right part of arrow
right_arrow = [
    arrow_tip,
    (arrow_tip[0], arrow_tip[1] + arrow_size),
    (arrow_tip[0] - arrow_size//2, arrow_tip[1] + arrow_size//2)
]
draw.polygon(right_arrow, fill=line_color)

# Top part of arrow
top_arrow = [
    arrow_tip,
    (arrow_tip[0] - arrow_size, arrow_tip[1]),
    (arrow_tip[0] - arrow_size//2, arrow_tip[1] + arrow_size//2)
]
draw.polygon(top_arrow, fill=line_color)

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
img.save('og-image-final-arrow.png', 'PNG', optimize=True, quality=90)
print("✓ Created og-image-final-arrow.png with PROPER up-right arrow!")

print("\n✅ NOW with clear arrow pointing up-right like your reference icon!")
