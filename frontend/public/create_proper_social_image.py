from PIL import Image, ImageDraw, ImageFont
import cairosvg
import io

print("Creating social media image that matches the ACTUAL website logo...")

# Create 1200x630 image for social media
width, height = 1200, 630
img = Image.new('RGB', (width, height), color='#1a0b2e')

# Create the exact dark purple gradient background from the website
draw = ImageDraw.Draw(img)
for y in range(height):
    # Darker purple gradient to match website
    r = int(26 + (46 - 26) * (y / height))
    g = int(11 + (14 - 11) * (y / height))
    b = int(46 + (79 - 46) * (y / height))
    draw.rectangle([(0, y), (width, y+1)], fill=(r, g, b))

# Load and convert the ACTUAL website SVG logo
with open('logo.svg', 'r') as f:
    svg_data = f.read()

# Convert to PNG at larger size for better quality
logo_png_data = cairosvg.svg2png(bytestring=svg_data.encode('utf-8'), output_width=400, output_height=400)
logo_img = Image.open(io.BytesIO(logo_png_data))

# Place the logo prominently in the center-left
logo_x = 100
logo_y = (height - 400) // 2
img.paste(logo_img, (logo_x, logo_y), logo_img if logo_img.mode == 'RGBA' else None)

# Add the FunBet.AI text next to the logo
try:
    font_title = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 85)
    font_sub = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 36)
except:
    try:
        font_title = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 85)
        font_sub = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', 36)
    except:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

# Text positioning
text_x = 540

# Main title
draw.text((text_x, 200), "FunBet.AI", fill='#ffffff', font=font_title)

# Subtitle
draw.text((text_x, 300), "Odds Comparison,", fill='#d1d5db', font=font_sub)
draw.text((text_x, 345), "Live Scores &", fill='#d1d5db', font=font_sub)
draw.text((text_x, 390), "AI Predictions", fill='#d1d5db', font=font_sub)

# Save
img.save('og-image-final.png', 'PNG', optimize=True, quality=90)
print("✓ Created og-image-final.png (1200x630) - matches website logo exactly")

# Also update the square logo
logo_png_512 = cairosvg.svg2png(bytestring=svg_data.encode('utf-8'), output_width=512, output_height=512)
logo_512_img = Image.open(io.BytesIO(logo_png_512))
logo_512_img.save('logo-512-final.png', 'PNG', optimize=True)
print("✓ Created logo-512-final.png (512x512)")

print("\n✅ Social media images created using EXACT website logo!")
