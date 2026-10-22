"""Turn a finished design HTML into a self-contained editable page.

usage: python make_editable.py design.html out.html [--key NAME] [--file NAME.png]

- design.html must wrap the whole design in <div id="design"> with a fixed width and height in CSS.
- Every local <img src> is inlined as a data URI (the page must work as one file, also when downloaded).
- Images whose CSS uses object-fit should be pre-cropped to their box first: html2canvas ignores object-fit.
- Adds editor.css, html2canvas (cdnjs) and editor.js from this skill's assets folder.
"""
import base64, mimetypes, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'assets')

def data_uri(path):
    mt = mimetypes.guess_type(path)[0] or 'image/png'
    with open(path, 'rb') as f:
        return f'data:{mt};base64,' + base64.b64encode(f.read()).decode()

def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__); sys.exit(1)
    src, out = args[0], args[1]
    key = args[args.index('--key') + 1] if '--key' in args else os.path.splitext(os.path.basename(out))[0]
    fname = args[args.index('--file') + 1] if '--file' in args else os.path.splitext(os.path.basename(out))[0] + '.png'
    base = os.path.dirname(os.path.abspath(src))
    s = open(src, encoding='utf-8').read()
    if 'id="design"' not in s:
        sys.exit('missing <div id="design">')

    def inline(m):
        url = m.group(2)
        if url.startswith(('data:', 'http:', 'https:')):
            return m.group(0)
        p = os.path.join(base, url)
        return m.group(1) + data_uri(p) + m.group(3) if os.path.exists(p) else m.group(0)
    s = re.sub(r'(<img[^>]*?src=")([^"]+)(")', inline, s)
    s = re.sub(r'(url\(["\']?)([^"\')]+)(["\']?\))', inline, s)

    s = s.replace('<div id="design"', f'<div id="design" data-key="{key}" data-file="{fname}"', 1)
    css = open(os.path.join(ASSETS, 'editor.css'), encoding='utf-8').read()
    js = open(os.path.join(ASSETS, 'editor.js'), encoding='utf-8').read()
    s = s.replace('</head>', f'<style>\n{css}</style>\n</head>', 1)
    tail = ('<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>\n'
            f'<script>\n{js}</script>\n</body>')
    i = s.rfind('</body>')
    s = s[:i] + tail + s[i + 7:]
    open(out, 'w', encoding='utf-8').write(s)
    print('written', out, f'{len(s)//1024} KB')

main()
