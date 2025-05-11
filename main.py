from PIL import Image, ImageDraw, ImageFont

# Load background image
bg = Image.open("bg/Automate by.png").convert("RGB")
img_width, img_height = bg.size

# Load fonts (update the paths)
font_path = "font/Montserrat-Full-Version/Desktop Fonts/Montserrat/TTF/"
font_main = ImageFont.truetype(font_path + "Montserrat-Bold.ttf", 100)
font_sub = ImageFont.truetype(font_path + "Montserrat-Regular.ttf", 60)

# Quote to center
main_text = "hi"
sub_text = "me"

# Draw on image
draw = ImageDraw.Draw(bg)

# Calculate center positions
def center_text(draw, text, font, y_pos):
    # Use getbbox for accurate text size in modern Pillow
    bbox = font.getbbox(text)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (img_width - w) // 2
    draw.text((x, y_pos), text, font=font, fill=(255, 255, 255))

center_text(draw, main_text, font_main, img_height // 2 - 120)
center_text(draw, sub_text, font_sub, img_height // 2 + 10)

# Save the output
bg.save("final_quote_poster.png")
