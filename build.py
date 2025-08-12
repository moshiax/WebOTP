from bs4 import BeautifulSoup
import os
import base64
import mimetypes

INPUT_FILE = "index.html"
OUTPUT_FILE = "webotp.html"
BASE_DIR = os.path.dirname(os.path.abspath(INPUT_FILE))

def file_to_data_uri(path, mime_override=None):
    mime, _ = mimetypes.guess_type(path)
    if mime_override:
        mime = mime_override
    if mime is None:
        mime = "application/octet-stream"
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    return f"data:{mime};base64,{b64}"

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f, "html.parser")

for script in soup.find_all("script", src=True):
    src_path = os.path.join(BASE_DIR, script["src"])
    if os.path.exists(src_path):
        with open(src_path, "r", encoding="utf-8") as s:
            code = s.read()
        script.clear()
        script.string = code
        del script["src"]

for link in soup.find_all("link", rel="stylesheet", href=True):
    css_path = os.path.join(BASE_DIR, link["href"])
    if os.path.exists(css_path):
        with open(css_path, "r", encoding="utf-8") as c:
            css_code = c.read()
        style_tag = soup.new_tag("style")
        style_tag.string = css_code
        link.replace_with(style_tag)

for img in soup.find_all("img", src=True):
    img_path = os.path.join(BASE_DIR, img["src"])
    if os.path.exists(img_path):
        img["src"] = file_to_data_uri(img_path)

for link in soup.find_all("link", href=True):
    href_path = os.path.join(BASE_DIR, link["href"])
    if os.path.exists(href_path):
        mime, _ = mimetypes.guess_type(href_path)
        if mime and mime.startswith("image/"):
            link["href"] = file_to_data_uri(href_path)

for link in soup.find_all("link", rel="manifest", href=True):
    manifest_path = os.path.join(BASE_DIR, link["href"])
    if os.path.exists(manifest_path):
        link["href"] = file_to_data_uri(manifest_path, mime_override="application/manifest+json")

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write(str(soup))