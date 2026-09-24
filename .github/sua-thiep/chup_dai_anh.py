#!/usr/bin/env python3
"""Chụp lại "dải ảnh" của 1 thiệp mẫu cho trang bán (images/thiep-mau-<mẫu>.webp) rồi sửa height= + ?v= trong
thiep-cuoi-online.html. Cách chụp giữ đúng như bản dựng tay 24/09: màn 390px × DPR 2, ẩn thanh chọn mẫu / thanh nổi /
nút nhạc, từ đầu thiệp tới hết khối "Wedding Time" (lịch + đếm ngược), thu về rộng 300px, WebP.
Song Hỷ: thêm khung phong bì 711px (màn 390×759 trừ thanh mẫu 48px) ở đầu dải.

  chup_dai_anh.py <mẫu>          (chạy ở gốc repo; cần: pip install playwright pillow)
Dùng Chrome có sẵn trên máy chạy GitHub Actions (channel="chrome"); không có thì tự tải Chromium của Playwright.
"""
import asyncio
import functools
import hashlib
import http.server
import io
import os
import re
import subprocess
import sys
import threading

from PIL import Image

GOC = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
W, DPR, H_VIEW, BAR = 390, 2, 759, 48
AN = """
.mau-bar,.bar,.music,.music-hint,.wfloat,.toast,.amb,.petal,.lb{display:none!important}
.rv{opacity:1!important;transform:none!important;transition:none!important}
.cover .photo{animation:none!important}
"""


class Im(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def chay_server():
    h = functools.partial(Im, directory=GOC)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


async def chup(key, port):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = None
        for cach in ({}, {'channel': 'chrome'}):          # Chromium của Playwright (nếu có) → Chrome cài sẵn
            try:
                b = await p.chromium.launch(**cach)
                break
            except Exception:
                pass
        if b is None:
            subprocess.run([sys.executable, '-m', 'playwright', 'install', 'chromium'], check=True)
            b = await p.chromium.launch()
        # giờ Việt Nam: máy GitHub chạy UTC → thiệp tính ngày cưới theo giờ máy, thứ trong tuần bị lệch 1 ngày nếu để UTC
        pg = await b.new_page(viewport={'width': W, 'height': H_VIEW}, device_scale_factor=DPR,
                              timezone_id='Asia/Ho_Chi_Minh', locale='vi-VN')
        await pg.route(lambda u: any(x in u for x in ('google.com/maps', 'maps.google', 'youtube.com', 'ytimg.com', 'nhac-thiep', '.mp3')),
                       lambda r: r.abort())
        await pg.goto(f'http://127.0.0.1:{port}/thiep-mau.html?m={key}', wait_until='domcontentloaded')
        await pg.wait_for_selector('#card:not([hidden])', timeout=30000)
        await pg.evaluate('document.fonts.ready.then(()=>1)')
        await pg.wait_for_timeout(1200)
        khung = []
        if await pg.query_selector('#env'):
            await pg.wait_for_function("(()=>{const i=document.querySelector('#env .letter img');return i&&i.complete&&i.naturalWidth>0})()", timeout=20000)
            await pg.wait_for_timeout(500)
            khung.append(await pg.screenshot(clip={'x': 0, 'y': BAR, 'width': W, 'height': H_VIEW - BAR}))
            await pg.evaluate("(()=>{const e=document.getElementById('env'); if(e) e.remove(); document.body.classList.remove('env-lock');})()")
        await pg.add_style_tag(content=AN)
        await pg.evaluate("(()=>{document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'));document.querySelectorAll('img').forEach(i=>{if(i.loading==='lazy'){i.loading='eager';const s=i.src;i.src='';i.src=s;}});})()")
        await pg.wait_for_function("[...document.querySelectorAll('#card img')].filter(i=>i.getAttribute('src')&&i.offsetParent!==null).every(i=>i.complete&&i.naturalWidth>0)", timeout=60000)
        await pg.evaluate('document.fonts.ready.then(()=>1)')
        await pg.wait_for_timeout(800)
        top, day = await pg.evaluate("(()=>{const c=document.getElementById('card').getBoundingClientRect(), t=document.getElementById('timeSec').getBoundingClientRect(); return [c.top+scrollY, t.bottom+scrollY];})()")
        than = await pg.screenshot(full_page=True, clip={'x': 0, 'y': top, 'width': W, 'height': day - top})
        await b.close()
    return khung, than


def ghep(khung, than):
    phan = [Image.open(io.BytesIO(x)).convert('RGB') for x in khung + [than]]
    rong = phan[0].width
    cao = sum(x.height for x in phan)
    im = Image.new('RGB', (rong, cao), 'white')
    y = 0
    for x in phan:
        im.paste(x, (0, y))
        y += x.height
    return im.resize((300, round(cao * 300 / rong)), Image.LANCZOS)


def sua_trang_ban(key, h, v):
    p = os.path.join(GOC, 'thiep-cuoi-online.html')
    s = open(p, encoding='utf-8').read()
    re_img = re.compile(r'<img src="images/thiep-mau-' + re.escape(key) + r'\.webp(?:\?v=[\w-]+)?"[^>]*>')

    def doi(m):
        t = re.sub(r'src="[^"]*"', f'src="images/thiep-mau-{key}.webp?v={v}"', m.group(0), count=1)
        return re.sub(r'height="\d+"', f'height="{h}"', t, count=1)
    s2, n = re_img.subn(doi, s)
    open(p, 'w', encoding='utf-8').write(s2)
    return n


def main(key):
    if not re.match(r'^[a-z0-9-]{1,40}$', key or ''):
        sys.exit('mẫu không hợp lệ')
    srv = chay_server()
    try:
        khung, than = asyncio.run(chup(key, srv.server_address[1]))
    finally:
        srv.shutdown()
    im = ghep(khung, than)
    ra = os.path.join(GOC, 'images', f'thiep-mau-{key}.webp')
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=80, method=6)
    open(ra, 'wb').write(buf.getvalue())
    v = hashlib.sha1(buf.getvalue()).hexdigest()[:8]
    n = sua_trang_ban(key, im.height, v)
    print(f'{ra}: {im.width}x{im.height}, {len(buf.getvalue()) // 1024} KB, sửa {n} chỗ trong thiep-cuoi-online.html')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '')
