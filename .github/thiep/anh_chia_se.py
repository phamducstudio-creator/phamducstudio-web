#!/usr/bin/env python3
"""Chụp thẻ xem trước Zalo/Facebook (share.jpg 1200×630) cho 1 thiệp riêng: ảnh bìa bên phải, tên hai bạn + ngày cưới
bên trái, đúng tông màu & font của mẫu thiệp (lấy nguyên CSS của thiep-mau.html). Chỉ dùng phần công khai (pub) nên bot
GitHub chạy được mà không cần khoá. Xong thì cập nhật og:image ?v= trong index.html.

  anh_chia_se.py <mã thiệp>        (chạy ở gốc repo; cần: pip install playwright pillow)
"""
import asyncio
import hashlib
import html
import io
import mimetypes
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import thiep_chung as C  # noqa: E402

GIA = 'http://the.local/'
CSS_THE = """
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:var(--wine-900)}
.sc{position:relative;width:1200px;height:630px;overflow:hidden;background:var(--wine-900);font-family:var(--font-body)}
.sc-anh{position:absolute;right:0;top:0;width:650px;height:630px;object-fit:cover;object-position:var(--bp,50% 25%)}
.sc-mo{position:absolute;right:430px;top:0;width:220px;height:630px;background:linear-gradient(90deg,var(--wine-900) 0%,rgba(var(--wine-rgb),.0) 100%)}
.sc-txt{position:absolute;left:0;top:0;width:590px;height:630px;box-sizing:border-box;padding:0 54px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff}
.sc-e{font-size:19px;letter-spacing:.36em;text-transform:uppercase;color:var(--gold-light);font-weight:600;margin:0 0 18px;padding-left:.36em}
.sc-t{font-family:var(--font-names,var(--font-display));font-style:italic;font-weight:500;line-height:1.08;margin:0;color:#fff;text-wrap:balance;max-width:480px}
.sc-t .amp{font-style:normal;color:var(--gold-light);font-size:.6em;margin:0 .16em;vertical-align:middle}
.sc-l{width:84px;height:1px;background:var(--gold-light);opacity:.8;margin:26px auto 22px}
.sc-d{font-family:var(--font-display);font-size:30px;letter-spacing:.14em;color:var(--gold-light);margin:0}
.sc-w{font-size:17px;color:rgba(255,255,255,.72);margin:10px 0 0;letter-spacing:.02em}
.sc-m{font-size:19px;color:rgba(255,255,255,.86);margin:30px 0 0;font-style:italic;font-family:var(--font-display)}
.sc-b{position:absolute;left:0;width:590px;bottom:34px;text-align:center;font-size:13px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.5)}
html[data-style="phim-xua"] .sc-anh{filter:sepia(.16) saturate(.9) contrast(1.04)}
"""


def css_template():
    s = open(C.TEMPLATE, encoding='utf-8').read()
    fonts = re.search(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com/[^"]+)">', s)
    style = re.search(r'<style>(.*?)</style>', s, re.S)
    return (fonts.group(1) if fonts else ''), (style.group(1) if style else '')


def html_the(pub):
    font_url, css = css_template()
    e = lambda x: html.escape(str(x or ''), quote=True)
    ngay = C.RE_NGAY.match(pub.get('ngay') or '')
    thu = C.ngay_hien_thi(pub.get('ngay') or '').split(',')[0] if ngay else ''
    ngay_txt = f'{ngay.group(3)} · {ngay.group(2)} · {ngay.group(1)}' if ngay else ''
    attr = ''
    if pub.get('theme') and pub['theme'] != 'do-hy':
        attr += f' data-theme="{e(pub["theme"])}"'
    if pub.get('style'):
        attr += f' data-style="{e(pub["style"])}"'
    bp = pub.get('bia_pos') or '50% 25%'
    return f"""<!doctype html><html lang="vi"{attr}><head><meta charset="utf-8">
<link rel="stylesheet" href="{e(font_url)}"><style>{css}</style><style>{CSS_THE}</style></head>
<body><div class="sc" style="--bp:{e(bp)}">
<img class="sc-anh" src="/thiep/{e(pub['id'])}/{e(pub['bia'])}.jpg" alt="">
<div class="sc-mo"></div>
<div class="sc-txt">
  <p class="sc-e">Save the date</p>
  <h1 class="sc-t" id="ten">{e(pub['ten_cd'])} <span class="amp">&amp;</span> {e(pub['ten_cr'])}</h1>
  <div class="sc-l"></div>
  {'<p class="sc-d">' + e(ngay_txt) + '</p>' if ngay_txt else ''}
  {'<p class="sc-w">' + e(thu) + '</p>' if thu else ''}
  <p class="sc-m">Trân trọng kính mời</p>
</div>
<div class="sc-b">Thiệp cưới · Phạm Đức Studio</div>
</div>
<script>
(function(){{ /* tên dài: thu cỡ chữ tới khi vừa 2 dòng */
  var t = document.getElementById('ten'), c = 84;
  function vua(){{ t.style.fontSize = c + 'px'; var lh = parseFloat(getComputedStyle(t).lineHeight) || c * 1.08; return t.scrollWidth <= 482 && t.offsetHeight <= lh * 2.05; }}
  while (c > 40 && !vua()) c -= 2;
}})();
</script></body></html>"""


async def _chup(pub):
    from playwright.async_api import async_playwright
    trang = html_the(pub)
    async with async_playwright() as p:
        b = None
        for cach in ({}, {'channel': 'chrome'}):
            try:
                b = await p.chromium.launch(**cach)
                break
            except Exception:
                pass
        if b is None:
            subprocess.run([sys.executable, '-m', 'playwright', 'install', 'chromium'], check=True)
            b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)

        async def phuc_vu(route):
            u = route.request.url
            if not u.startswith(GIA):
                return await route.continue_()
            duong = u[len(GIA):].split('?')[0]
            if duong in ('', 'the.html'):
                return await route.fulfill(status=200, content_type='text/html; charset=utf-8', body=trang)
            f = os.path.normpath(os.path.join(C.GOC, duong))
            if not f.startswith(C.GOC + os.sep) or not os.path.isfile(f):
                return await route.fulfill(status=404, body='')
            return await route.fulfill(status=200, content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream', body=open(f, 'rb').read())
        await pg.route('**/*', phuc_vu)
        await pg.goto(GIA + 'the.html', wait_until='load')
        await pg.evaluate('document.fonts.ready.then(()=>1)')
        await pg.wait_for_function("(()=>{const i=document.querySelector('.sc-anh');return i&&i.complete&&i.naturalWidth>0})()", timeout=30000)
        await pg.wait_for_timeout(300)
        png = await pg.screenshot(clip={'x': 0, 'y': 0, 'width': 1200, 'height': 630})
        await b.close()
    return png


def chup(ma):
    """Chụp share.jpg + sửa og:image ?v= trong index.html. Trả về mã phiên bản ảnh."""
    from PIL import Image
    s, E = C.doc_trang(ma)
    pub = dict(E.get('pub') or {})
    pub['id'] = ma
    png = asyncio.run(_chup(pub))
    im = Image.open(io.BytesIO(png)).convert('RGB')
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=84, optimize=True, progressive=True)
    open(C.duong_dan(ma, 'share.jpg'), 'wb').write(buf.getvalue())
    v = hashlib.sha1(buf.getvalue()).hexdigest()[:8]
    s = C.ghi_meta(s, pub, v)
    open(C.duong_dan(ma, 'index.html'), 'w', encoding='utf-8').write(s)
    return v


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    print('share.jpg v=' + chup(sys.argv[1]))
