from PIL import Image, ImageDraw, ImageFont

print("Creating the CORRECT zigzag icon like the reference image...")

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

# Create the ZIGZAG pattern exactly like the icon (up-down-up pattern)
start_x = 180
start_y = 450
line_color = '#FFD700'  # Gold
line_width = 20

# ZIGZAG points - this creates the up-down-up pattern
points = [
    (start_x, start_y),              # Start point (bottom left)
    (start_x + 80, start_y - 100),   # Go UP (first peak)
    (start_x + 160, start_y - 50),   # Go DOWN (valley)
    (start_x + 240, start_y - 170),  # Go UP (second peak, higher)
]

# Draw the thick zigzag line
for i in range(len(points) - 1):
    draw.line([points[i], points[i+1]], fill=line_color, width=line_width)

# Draw large dots at each point
dot_radius = 14
for point in points:
    draw.ellipse([point[0]-dot_radius, point[1]-dot_radius, 
                   point[0]+dot_radius, point[1]+dot_radius], 
                  fill=line_color)

# Draw the ARROW continuing from the last point (up-right direction)
last_point = points[-1]
arrow_length = 70
arrow_end_x = last_point[0] + 60
arrow_end_y = last_point[1] - 60

# Arrow shaft (diagonal line going up-right)
draw.line([last_point, (arrow_end_x, arrow_end_y)], fill=line_color, width=line_width)

# Arrow HEAD - pointing up and right
arrow_tip = (arrow_end_x, arrow_end_y)
arrow_size = 30

# Right-pointing triangle
draw.polygon([
    arrow_tip,
    (arrow_tip[0] - arrow_size, arrow_tip[1] + arrow_size//2),
    (arrow_tip[0] - arrow_size//2, arrow_tip[1])
], fill=line_color)

# Up-pointing triangle
draw.polygon([
    arrow_tip,
    (arrow_tip[0] - arrow_size//2, arrow_tip[1]),
    (arrow_tip[0], arrow_tip[1] + arrow_size)
], fill=line_color)

# Add text
try:
    font_title = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 90)
    font_sub = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 36)
except:
    font_title = ImageFont.load_default()
    font_sub = ImageFont.load_default()

text_x = 540

# Main title
draw.text((text_x, 200), "FunBet.AI", fill='#ffffff', font=font_title)

# Subtitle
draw.text((text_x, 310), "Odds Comparison,", fill='#d1d5db', font=font_sub)
draw.text((text_x, 355), "Live Scores &", fill='#d1d5db', font=font_sub)
draw.text((text_x, 400), "AI Predictions", fill='#d1d5db', font=font_sub)

# Save
img.save('og-image-zigzag.png', 'PNG', optimize=True, quality=90)
print("✓ Created og-image-zigzag.png with PROPER zigzag pattern!")

print("\n✅ This NOW has the up-down-up zigzag pattern like your icon!")
