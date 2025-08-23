import sys
from bs4 import BeautifulSoup
import os
import base64
import mimetypes
import re

EXTENSIONS_TO_INLINE = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg',
    '.mp3', '.wav', '.mp4', '.woff', '.woff2', '.json', '.manifest'
]

def file_to_data_uri(path, mime_override=None):
    if not os.path.isfile(path):
        return False
    
    mime, _ = mimetypes.guess_type(path)
    if mime_override:
        mime = mime_override
    with open(path, "rb") as f:
        file_data = f.read()
    
    encoded_data = base64.b64encode(file_data).decode("utf-8")
    return f"data:{mime};base64,{encoded_data}"

def inline_html(input_file, output_file=None):
    base_dir = os.path.dirname(os.path.abspath(input_file))
    if not output_file:
        name, ext = os.path.splitext(input_file)
        output_file = f"webotp.html"

    with open(input_file, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")

    # Scripts
    for script in soup.find_all("script", src=True):
        src_path = os.path.join(base_dir, script["src"])
        if os.path.exists(src_path):
            with open(src_path, "r", encoding="utf-8") as s:
                code = s.read()
            
            def replace_js_match(match):
                path = match.group(2)
                if path.startswith("data:") or "://" in path:
                    return match.group(0)
                if not any(path.lower().endswith(ext) for ext in EXTENSIONS_TO_INLINE):
                    return match.group(0)
                abs_path = os.path.join(base_dir, path)
                if os.path.exists(abs_path):
                    mime, _ = mimetypes.guess_type(abs_path)
                    if path.lower().endswith('.js'):
                        mime = "text/javascript"
                    return f'{match.group(1)}{file_to_data_uri(abs_path, mime_override=mime)}{match.group(1)}'
                return match.group(0)

            code = re.sub(r'(["\'])(.+?)\1', replace_js_match, code)
            script.clear()
            script.string = code
            del script["src"]

    for script in soup.find_all("script", src=False):
        if script.string:
            def replace_inline_js(match):
                path = match.group(2)
                if path.startswith("data:") or "://" in path:
                    return match.group(0)
                if not any(path.lower().endswith(ext) for ext in EXTENSIONS_TO_INLINE):
                    return match.group(0)
                abs_path = os.path.join(base_dir, path)
                if os.path.exists(abs_path):
                    mime, _ = mimetypes.guess_type(abs_path)
                    if path.lower().endswith('.js'):
                        mime = "text/javascript"
                    return f'{match.group(1)}{file_to_data_uri(abs_path, mime_override=mime)}{match.group(1)}'
                return match.group(0)

            script.string = re.sub(r'(["\'])(.+?)\1', replace_inline_js, script.string)

    # Styles
    for link in soup.find_all("link", rel="stylesheet", href=True):
        css_path = os.path.join(base_dir, link["href"])
        if os.path.exists(css_path):
            with open(css_path, "r", encoding="utf-8") as c:
                css_code = c.read()
            
            def replace_css_match(match):
                url = match.group(1).strip(' \'"')
                if url.startswith("data:") or "://" in url:
                    return f"url({url})"
                abs_path = os.path.join(base_dir, url)
                if os.path.exists(abs_path):
                    return f"url({file_to_data_uri(abs_path)})"
                return f"url({url})"
            
            css_code = re.sub(r'url\(([^)]+)\)', replace_css_match, css_code)
            style_tag = soup.new_tag("style")
            style_tag.string = css_code
            link.replace_with(style_tag)

    # Media
    for tag in soup.find_all(["img", "audio", "video", "source", "object", "embed"], src=True):
        src_attr = "src" if tag.name != "object" and tag.name != "embed" else "data"
        resource_path = os.path.join(base_dir, tag[src_attr])
        if os.path.exists(resource_path):
            tag[src_attr] = file_to_data_uri(resource_path)

    # Other links
    for link in soup.find_all("link", href=True):
        href_path = os.path.join(base_dir, link["href"])
        if os.path.exists(href_path):
            mime, _ = mimetypes.guess_type(href_path)
            if mime and (mime.startswith("image/") or mime.startswith("font/")):
                link["href"] = file_to_data_uri(href_path)

    for link in soup.find_all("link", rel="manifest", href=True):
        manifest_path = os.path.join(base_dir, link["href"])
        if os.path.exists(manifest_path):
            link["href"] = file_to_data_uri(manifest_path, mime_override="application/manifest+json")

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(str(soup))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        input_file = "index.html"
    else:
        input_file = sys.argv[1]
    inline_html(input_file)
