from PIL import Image, ImageDraw, ImageFont
import cairosvg
import io

print("Creating social media logo from YOUR SVG design...")

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

# Convert YOUR SVG to PNG
with open('logo-final.svg', 'r') as f:
    svg_data = f.read()

# Convert to PNG at good size
logo_png = cairosvg.svg2png(bytestring=svg_data.encode('utf-8'), output_width=380, output_height=380)
logo_img = Image.open(io.BytesIO(logo_png))

# Place the logo
logo_x = 120
logo_y = (height - 380) // 2
img.paste(logo_img, (logo_x, logo_y), logo_img if logo_img.mode == 'RGBA' else None)

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
img.save('og-image-your-design.png', 'PNG', optimize=True, quality=90)
print("✓ Created og-image-your-design.png using YOUR exact SVG!")

print("\n✅ This uses the EXACT design you provided!")
