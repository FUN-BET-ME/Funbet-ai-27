from PIL import Image, ImageDraw, ImageFont

print("Creating social media image with the CORRECT zigzag arrow icon...")

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

# Create the ZIGZAG upward trending line with arrow (like the icon you showed)
# Starting position
start_x = 180
start_y = 420
line_color = '#FFD700'  # Gold
line_width = 18  # Thicker line

# Define the zigzag points going upward
points = [
    (start_x, start_y),
    (start_x + 70, start_y - 50),
    (start_x + 140, start_y - 90),
    (start_x + 220, start_y - 180),
]

# Draw thick line segments
for i in range(len(points) - 1):
    draw.line([points[i], points[i+1]], fill=line_color, width=line_width)

# Draw dots at each point
dot_radius = 11
for point in points:
    draw.ellipse([point[0]-dot_radius, point[1]-dot_radius, 
                   point[0]+dot_radius, point[1]+dot_radius], 
                  fill=line_color)

# Draw ARROW at the end pointing up-right
arrow_start = points[-1]
arrow_end_x = arrow_start[0] + 50
arrow_end_y = arrow_start[1] - 50

# Arrow shaft
draw.line([arrow_start, (arrow_end_x, arrow_end_y)], fill=line_color, width=line_width)

# Arrow head (pointing up-right)
arrow_tip = (arrow_end_x, arrow_end_y)
arrow_size = 25

# Create triangle arrow head
arrow_points = [
    arrow_tip,  # Tip
    (arrow_tip[0] - arrow_size, arrow_tip[1] + arrow_size),  # Bottom left
    (arrow_tip[0], arrow_tip[1] + arrow_size),  # Bottom middle
    (arrow_tip[0] + arrow_size, arrow_tip[1] + arrow_size),  # Bottom right
]
draw.polygon([
    arrow_tip,
    (arrow_tip[0] - arrow_size, arrow_tip[1] + arrow_size),
    (arrow_tip[0] + arrow_size, arrow_tip[1] + arrow_size)
], fill=line_color)

# Vertical part of arrow
draw.polygon([
    arrow_tip,
    (arrow_tip[0] - arrow_size, arrow_tip[1]),
    (arrow_tip[0] - arrow_size, arrow_tip[1] + arrow_size)
], fill=line_color)

# Dot at arrow start
draw.ellipse([arrow_start[0]-dot_radius, arrow_start[1]-dot_radius,
               arrow_start[0]+dot_radius, arrow_start[1]+dot_radius],
              fill=line_color)

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
img.save('og-image-correct.png', 'PNG', optimize=True, quality=90)
print("✓ Created og-image-correct.png with ZIGZAG arrow icon!")

print("\n✅ This matches the icon you showed me!")
