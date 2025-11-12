from PIL import Image, ImageDraw
import cairosvg
import io

print("Converting SVG logo to all required favicon formats...")

# Read the SVG
with open('logo.svg', 'r') as f:
    svg_data = f.read()

# Convert SVG to PNG at highest resolution first
png_data = cairosvg.svg2png(bytestring=svg_data.encode('utf-8'), output_width=512, output_height=512)
img_512 = Image.open(io.BytesIO(png_data))

# Save 512x512
img_512.save('android-chrome-512x512.png', 'PNG')
print("✓ Created android-chrome-512x512.png")

# Create 192x192
img_192 = img_512.resize((192, 192), Image.Resampling.LANCZOS)
img_192.save('android-chrome-192x192.png', 'PNG')
print("✓ Created android-chrome-192x192.png")

# Create 180x180 (Apple touch icon)
img_180 = img_512.resize((180, 180), Image.Resampling.LANCZOS)
img_180.save('apple-touch-icon.png', 'PNG')
print("✓ Created apple-touch-icon.png")

# Create 32x32
img_32 = img_512.resize((32, 32), Image.Resampling.LANCZOS)
img_32.save('favicon-32x32.png', 'PNG')
print("✓ Created favicon-32x32.png")

# Create 16x16
img_16 = img_512.resize((16, 16), Image.Resampling.LANCZOS)
img_16.save('favicon-16x16.png', 'PNG')
print("✓ Created favicon-16x16.png")

# Create favicon.ico (contains multiple sizes)
img_32.save('favicon.ico', format='ICO', sizes=[(16, 16), (32, 32)])
print("✓ Created favicon.ico")

print("\n✅ All favicon files updated with FunBet.AI logo!")
