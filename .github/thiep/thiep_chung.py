#!/usr/bin/env python3
"""Phần dùng chung cho THIỆP RIÊNG từng cặp (tao_thiep.py tạo · ap_dung.py của bot GitHub sửa · anh_chia_se.py chụp thẻ Zalo).

Một thiệp = thư mục thiep/<mã>/ : index.html (dựng từ thiep-mau.html) + ảnh NN.jpg / NN-800.jpg + share.jpg.
Trong index.html:
  <!--THIEP:META--> … <!--/THIEP:META-->      tiêu đề + thẻ xem trước Zalo/Facebook (chỉ tên hai bạn, ngày cưới, ảnh bìa)
  <script id="thiep-du-lieu" type="application/json">{"v":1,"id","kl","pub":{…},"iv","ct"}</script>
      pub = phần công khai (tên, ngày, số ảnh bìa, tông màu) · iv/ct = toàn bộ dữ liệu thiệp mã hoá AES-GCM
      khoá = SHA-256("pds-thiep|v1|<mã>|<k>") — k (16 ký tự) chỉ nằm trong link, không lưu ở web.
File này không cần thư viện mã hoá (bot GitHub không bao giờ giải mã được thiệp).
"""
import datetime
import html
import json
import os
import re

GOC = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
THU_MUC = os.path.join(GOC, 'thiep')
TEMPLATE = os.path.join(GOC, 'thiep-mau.html')
WEB = 'https://phamducstudio.vn/'
PHIEN_BAN_SUA = '20260926a'          # ?v= của js/sua-thiep.js trong trang thiệp riêng

THEMES = {'', 'do-hy', 'hoang-kim', 'diu-dang', 'xanh-reu', 'xanh-dem', 'hien-dai', 'xanh-petrol'}
STYLES = {'', 'phim-xua', 'thanh-lich', 'han-quoc', 'nang-gio', 'song-hy'}
RE_MA = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+){1,8}$')
RE_SO = re.compile(r'^\d{2,3}$')
RE_POS = re.compile(r'^(\d{1,3})% (\d{1,3})%$')
RE_B64U = re.compile(r'^[A-Za-z0-9_-]+$')
RE_NGAY = re.compile(r'^(\d{4})-(\d{2})-(\d{2})$')
KY_TU_CAM = set('<>{}[]`"\\|')
DOW = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']   # date.weekday(): 0 = thứ Hai

RE_KHOI = re.compile(r'(<script id="thiep-du-lieu" type="application/json">)(.*?)(</script>)', re.S)
RE_META = re.compile(r'<!--THIEP:META-->.*?<!--/THIEP:META-->', re.S)


class Loi(Exception):
    pass


def duong_dan(ma, *ten):
    if not RE_MA.match(ma or ''):
        raise Loi(f'mã thiệp "{ma}" không hợp lệ')
    return os.path.join(THU_MUC, ma, *ten)


def doc_trang(ma):
    """→ (nội dung index.html, khối dữ liệu E)"""
    p = duong_dan(ma, 'index.html')
    if not os.path.isfile(p):
        raise Loi(f'không có thiệp {ma} trên web')
    s = open(p, encoding='utf-8').read()
    m = RE_KHOI.search(s)
    if not m:
        raise Loi(f'thiệp {ma} không có khối dữ liệu')
    E = json.loads(m.group(2).replace('<\\/', '</'))
    if E.get('id') != ma:
        raise Loi('mã trong khối dữ liệu không khớp thư mục')
    return s, E


def json_trong_script(o):
    return json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')


def ghi_du_lieu(s, E):
    s2, n = RE_KHOI.subn(lambda m: m.group(1) + json_trong_script(E) + m.group(3), s, count=1)
    if n != 1:
        raise Loi('không thay được khối dữ liệu')
    return s2


def ngay_hien_thi(ngay):
    m = RE_NGAY.match(ngay or '')
    if not m:
        return ''
    d = datetime.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    return f'{DOW[d.weekday()]}, {d.day:02d}.{d.month:02d}.{d.year}'


def khoi_meta(pub, v_anh=''):
    e = lambda x: html.escape(str(x or ''), quote=True)
    ten = f"{pub.get('ten_cd', '')} & {pub.get('ten_cr', '')}"
    ngay = ngay_hien_thi(pub.get('ngay', ''))
    mo_ta = 'Trân trọng kính mời bạn tới chung vui cùng hai gia đình' + (f' — {ngay}' if ngay else '') + '.'
    anh = f"{WEB}thiep/{pub.get('id', '')}/share.jpg" + (f'?v={v_anh}' if v_anh else '')
    return ('<!--THIEP:META-->\n'
            '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">\n'
            '<meta name="referrer" content="strict-origin">\n'
            f'<title>{e(ten)} — Thiệp cưới</title>\n'
            f'<meta name="description" content="{e(mo_ta)}">\n'
            '<meta property="og:type" content="website">\n'
            '<meta property="og:site_name" content="Phạm Đức Studio">\n'
            f'<meta property="og:title" content="{e(ten)} · Thiệp mời cưới">\n'
            f'<meta property="og:description" content="{e(mo_ta)}">\n'
            f'<meta property="og:image" content="{e(anh)}">\n'
            '<meta property="og:image:width" content="1200">\n'
            '<meta property="og:image:height" content="630">\n'
            '<!--/THIEP:META-->')


def v_anh_hien_tai(s):
    m = re.search(r'share\.jpg\?v=([0-9a-f]{6,16})', s)
    return m.group(1) if m else ''


def ghi_meta(s, pub, v_anh=None):
    if v_anh is None:
        v_anh = v_anh_hien_tai(s)
    s2, n = RE_META.subn(lambda m: khoi_meta(pub, v_anh), s, count=1)
    if n != 1:
        raise Loi('không thay được phần tiêu đề thiệp')
    return s2


def sach_ten(v, ten_truong):
    if not isinstance(v, str):
        raise Loi(f'{ten_truong} phải là chữ')
    v = re.sub(r'\s+', ' ', v).strip()
    if not v or len(v) > 30:
        raise Loi(f'{ten_truong} phải dài 1–30 ký tự')
    if any(c in KY_TU_CAM or ord(c) < 32 for c in v):
        raise Loi(f'{ten_truong} có ký tự không cho phép')
    return v


def sach_pos(v, ten_truong):
    if v in ('', None):
        return ''
    m = RE_POS.match(str(v).strip()) if isinstance(v, str) else None
    if not m or int(m.group(1)) > 100 or int(m.group(2)) > 100:
        raise Loi(f'{ten_truong} phải dạng "x% y%" (0–100)')
    return f'{int(m.group(1))}% {int(m.group(2))}%'


def sach_ngay(v, ten_truong, cho_trong=False):
    v = '' if v is None else str(v).strip()
    if not v and cho_trong:
        return ''
    m = RE_NGAY.match(v)
    try:
        datetime.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    except Exception:
        raise Loi(f'{ten_truong} phải dạng năm-tháng-ngày (vd 2026-12-20)')
    return v


NHAC_CO = {'canon-in-d', 'minuet-in-g', 'gymnopedie'}
PUB_SUA = ['ten_cd', 'ten_cr', 'bia', 'bia_pos', 'anh_cr', 'anh_cd', 'anh_ds', 'poster', 'poster_pos', 'pos', 'ngay', 'nhac']
CHUP_LAI = ('ten_cd', 'ten_cr', 'ngay', 'bia', 'bia_pos', 'theme', 'style')   # đổi mấy trường này thì chụp lại share.jpg


def sach_nhac(v, mac_dinh=''):
    v = (v or '').strip()
    if not v:
        return mac_dinh
    for x in v.split(','):
        x = x.strip()
        if not (x in NHAC_CO or x == 'khong' or re.match(r'^d:[-\w]{10,}$', x) or re.match(r'^(https://|/images/)\S+\.(mp3|m4a|aac|ogg|wav)$', x)):
            raise Loi(f'mã nhạc "{x}" không đúng')
    return v


def ap_set_thiep(pub, set_, ma):
    """Bot: kiểm chặt phần công khai bảng sửa ẩn gửi lên (tên, bố cục ảnh, ngày, nhạc) rồi ghép vào pub. Trả về pub mới."""
    if not isinstance(set_, dict):
        raise Loi('phần sửa (set) sai dạng')
    la = [k for k in set_ if k not in PUB_SUA]
    if la:
        raise Loi('trường không được sửa: ' + ', '.join(la))
    m = dict(pub)
    m.update(set_)
    so = {x.get('n') for x in pub.get('anh_co') or []}

    def sn(v, ten, trong=False):
        v = '' if v is None else str(v).strip()
        if not v:
            if trong:
                return ''
            raise Loi(f'{ten} đang trống')
        if not RE_SO.match(v) or v not in so or not co_anh(ma, v):
            raise Loi(f'{ten}: không có ảnh {v} trong thiệp')
        return v
    moi = dict(pub)
    moi['ten_cd'] = sach_ten(m.get('ten_cd'), 'Tên cô dâu')
    moi['ten_cr'] = sach_ten(m.get('ten_cr'), 'Tên chú rể')
    moi['bia'] = sn(m.get('bia'), 'Ảnh bìa')
    moi['bia_pos'] = sach_pos(m.get('bia_pos'), 'Canh khung ảnh bìa')
    moi['anh_cr'] = sn(m.get('anh_cr'), 'Ảnh chú rể')
    moi['anh_cd'] = sn(m.get('anh_cd'), 'Ảnh cô dâu')
    ds = m.get('anh_ds')
    ds = ds.split(',') if isinstance(ds, str) else (ds if isinstance(ds, list) else None)
    if ds is None:
        raise Loi('Ảnh câu chuyện phải là danh sách số ảnh')
    ds = [sn(x, 'Ảnh câu chuyện') for x in [str(x).strip() for x in ds] if x]
    if not ds or len(ds) > 24:
        raise Loi('Ảnh câu chuyện cần 1–24 ảnh')
    moi['anh_ds'] = ','.join(ds)
    moi['poster'] = sn(m.get('poster'), 'Ảnh khung clip', trong=True)
    moi['poster_pos'] = sach_pos(m.get('poster_pos'), 'Canh khung ảnh clip')
    dung = [moi['bia'], moi['anh_cr'], moi['anh_cd']] + ds + ([moi['poster']] if moi['poster'] else [])
    lap = sorted({n for n in dung if dung.count(n) > 1})
    if lap:
        raise Loi('ảnh bị dùng 2 lần: ' + ', '.join(lap))
    pos = m.get('pos') or {}
    if not isinstance(pos, dict):
        raise Loi('canh khung (pos) sai dạng')
    than = set([moi['anh_cr'], moi['anh_cd']] + ds)
    moi['pos'] = {}
    for n in sorted(pos):
        n2 = str(n).strip()
        if not RE_SO.match(n2):
            raise Loi(f'canh khung: số ảnh "{n}" không hợp lệ')
        v = sach_pos(pos[n], f'Canh khung ảnh {n2}')
        if v and n2 in than:
            moi['pos'][n2] = v
    moi['ngay'] = sach_ngay(m.get('ngay'), 'Ngày cưới', cho_trong=True)
    moi['nhac'] = sach_nhac(m.get('nhac'), '')
    return moi


def co_anh(ma, n):
    return all(os.path.isfile(duong_dan(ma, f'{n}{s}.jpg')) for s in ('', '-800'))


def fmt_le(ngay, gio, ghi=''):
    """"Thứ Bảy · 19/12 · 08:00 — ghi chú" (giống thiệp mẫu)."""
    m = RE_NGAY.match(ngay or '')
    phan = []
    if m:
        d = datetime.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        phan += [DOW[d.weekday()], f'{d.day:02d}/{d.month:02d}']
    if gio:
        phan.append(gio)
    s = ' · '.join(phan)
    if ghi:
        s += (' — ' if s else '') + ghi
    return s


def mau_trong_template():
    """6 mẫu (tông màu, phong cách, nhạc) đọc thẳng từ thiep-mau.html — 1 nguồn duy nhất."""
    s = open(TEMPLATE, encoding='utf-8').read()
    dong = [l for l in s.split('\n') if l.startswith('  var MAU = ')]
    if len(dong) != 1:
        raise Loi('không đọc được danh sách mẫu trong thiep-mau.html')
    d = dong[0]
    return {x['key']: x for x in json.loads(d[d.index('['):d.rindex(']') + 1])}
