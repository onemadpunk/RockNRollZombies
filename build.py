"""Bundle the game into ONE double-clickable HTML file: "Play Rock n Roll Zombies.html".

Browsers refuse to load separate game-code files from a page opened straight from disk,
so this packs the CSS and every js/ module into the page itself.
Run after changing any code:  python build.py
"""
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
ORDER = ["config", "audio", "input", "models", "levelkit", "level1", "level2", "level3", "level4", "level5", "level", "fx", "screens", "online", "game", "main"]  # dependencies first
OUT = os.path.join(ROOT, "Play Rock n Roll Zombies.html")

LOCAL_IMPORT = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'\./[^']+';", re.S)
LIB_IMPORT = re.compile(r"^import .* from '(three|three/addons/[^']+)';\s*$", re.M)
EXPORT = re.compile(r"^export (const|let|function|class) ([A-Za-z_$][\w$]*)", re.M)


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


lib_imports = []
blocks = []
for name in ORDER:
    src = read(os.path.join(ROOT, "js", name + ".js"))
    for m in LIB_IMPORT.finditer(src):
        if m.group(0).strip() not in lib_imports:
            lib_imports.append(m.group(0).strip())
    src = LIB_IMPORT.sub("", src)
    # import { a, b } from './x.js'  ->  const { a, b } = __m;
    src = LOCAL_IMPORT.sub(lambda m: "const {" + m.group(1) + "} = __m;", src)
    exports = [m.group(2) for m in EXPORT.finditer(src)]
    src = EXPORT.sub(lambda m: m.group(1) + " " + m.group(2), src)
    # Each module gets its own block scope; exports are shared through __m.
    blocks.append(f"// ---- {name}.js ----\n{{\n{src}\nObject.assign(__m, {{ {', '.join(exports)} }});\n}}\n")

bundle = "\n".join(lib_imports) + "\nconst __m = {};\n" + "\n".join(blocks)
assert "</script" not in bundle, "bundle contains </script>"

html = read(os.path.join(ROOT, "index.html"))
css = read(os.path.join(ROOT, "style.css"))
html = html.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + css + "\n</style>")
# Drop the "don't open this file directly" warning: this file is meant to be opened directly.
html = re.sub(r"\s*<script>\s*// Opened by double-clicking.*?</script>", "", html, flags=re.S)
html = html.replace('<script type="module" src="js/main.js"></script>', '<script type="module">\n' + bundle + "\n</script>")

with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Built {os.path.basename(OUT)} ({len(html) // 1024} KB)")
