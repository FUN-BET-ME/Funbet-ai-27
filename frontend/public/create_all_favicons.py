from PIL import Image
import cairosvg
import io

print("Creating all favicon files from logo-final.svg...")

# Read the user's exact SVG logo
with open('logo-final.svg', 'r') as f:
    svg_data = f.read()

# Create favicons at multiple sizes
sizes = [
    (512, 'android-chrome-512x512.png'),
    (192, 'android-chrome-192x192.png'),
    (180, 'apple-touch-icon.png'),
    (32, 'favicon-32x32.png'),
    (16, 'favicon-16x16.png')
]

for size, filename in sizes:
    png_data = cairosvg.svg2png(bytestring=svg_data.encode('utf-8'), output_width=size, output_height=size)
    img = Image.open(io.BytesIO(png_data))
    img.save(filename, 'PNG', optimize=True)
    print(f"✓ Created {filename} ({size}x{size})")

# Create favicon.ico (multi-size ICO file)
png_32 = cairosvg.svg2png(bytestring=svg_data.encode('utf-8'), output_width=32, output_height=32)
img_32 = Image.open(io.BytesIO(png_32))

png_16 = cairosvg.svg2png(bytestring=svg_data.encode('utf-8'), output_width=16, output_height=16)
img_16 = Image.open(io.BytesIO(png_16))

img_32.save('favicon.ico', format='ICO', sizes=[(16, 16), (32, 32)])
print("✓ Created favicon.ico (16x16, 32x32)")

print("\n✅ All favicon files created with your brand logo!")
