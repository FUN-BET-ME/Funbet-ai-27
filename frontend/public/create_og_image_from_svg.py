from PIL import Image, ImageDraw, ImageFont
import cairosvg
import io

print("Creating social media OG image using actual website logo...")

# Create 1200x630 image for social media
width, height = 1200, 630
img = Image.new('RGB', (width, height), color='#1a0b2e')

# Create gradient background (dark purple gradient)
draw = ImageDraw.Draw(img)
for y in range(height):
    r = int(26 + (66 - 26) * (y / height))
    g = int(11 + (29 - 11) * (y / height))
    b = int(46 + (95 - 46) * (y / height))
    draw.rectangle([(0, y), (width, y+1)], fill=(r, g, b))

# Convert the actual website logo SVG to PNG and overlay it
with open('logo.svg', 'r') as f:
    svg_data = f.read()

# Convert SVG to PNG at a good size for the OG image
logo_png_data = cairosvg.svg2png(bytestring=svg_data.encode('utf-8'), output_width=300, output_height=300)
logo_img = Image.open(io.BytesIO(logo_png_data))

# Paste the logo on the left side
logo_x = 120
logo_y = (height - 300) // 2
img.paste(logo_img, (logo_x, logo_y), logo_img if logo_img.mode == 'RGBA' else None)

# Add text next to the logo
try:
    font_large = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 72)
    font_medium = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 54)
    font_small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 32)
except:
    try:
        font_large = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 72)
        font_medium = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 54)
        font_small = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', 32)
    except:
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()

text_x = 480

# Draw "FunBet.AI" text
draw.text((text_x, 220), "FunBet.AI", fill='#ffffff', font=font_large)

# Draw tagline
tagline = "Odds Comparison, Live Scores"
draw.text((text_x, 310), tagline, fill='#9ca3af', font=font_small)

tagline2 = "& AI Predictions"
draw.text((text_x, 355), tagline2, fill='#9ca3af', font=font_small)

# Save the image
img.save('og-image.png', 'PNG', optimize=True, quality=85)
print("✓ Created og-image.png (1200x630) with actual website logo")

# Also create a simpler square version using just the logo
logo_png_512 = cairosvg.svg2png(bytestring=svg_data.encode('utf-8'), output_width=512, output_height=512)
logo_512 = Image.open(io.BytesIO(logo_png_512))
logo_512.save('logo-512.png', 'PNG', optimize=True)
print("✓ Created logo-512.png (512x512)")

print("\n✅ Social media images created with actual FunBet.AI branding!")
