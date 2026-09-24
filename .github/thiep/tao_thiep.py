#!/usr/bin/env python3
"""TẠO / SỬA THIỆP RIÊNG cho từng cặp — Phạm Đức Studio.
Chạy ở gốc repo, trong máy của Claude (cần: pip install cryptography pillow playwright). KHÔNG chạy trên GitHub.

  tao_thiep.py tao <thong-tin.json>            tạo thiệp mới → in LINK RIÊNG + dòng cho Sổ thiệp (JSON)
  tao_thiep.py mo <link>                       giải mã → in toàn bộ dữ liệu thiệp (JSON)
  tao_thiep.py sua <link> <thay-doi.json>      sửa vài trường (JSON phẳng, cùng tên trường như thong-tin.json) → mã hoá lại
  tao_thiep.py them-anh <link> <ảnh>…          thêm ảnh vào bộ ảnh của thiệp (số tiếp theo), thêm luôn vào cuối phần câu chuyện
  tao_thiep.py lam-lai <mã>… | --tat-ca         dựng lại trang từ thiep-mau.html mới nhất, giữ nguyên dữ liệu mã hoá
  tao_thiep.py kiem <link>                     mở thử bằng khoá + soát ảnh

Link riêng: https://phamducstudio.vn/thiep/<mã>/?k=<16 ký tự>. Khoá k KHÔNG lưu ở đâu trên web/GitHub — chỉ nằm trong link
(và Sổ thiệp riêng tư của studio). Mất link = không mở lại được thiệp, phải tạo lại. Trên web/GitHub chỉ công khai: tên hai bạn,
ngày cưới, ảnh (để Zalo hiện thẻ xem trước). Ảnh được bỏ hết thông tin máy chụp/GPS.

thong-tin.json (bỏ trống mục nào thì thiệp tự ẩn khối đó):
{
  "mau": "co-dien",                      // co-dien · han-quoc · song-hy · sang-trong · nang-gio · phim-xua
  "ten_cd": "An", "ten_cr": "Phong",      // tên hiện trên thiệp (≤30 ký tự)
  "sdt_cd": "0901234567", "sdt_cr": "",  // nút Gọi + nhận xác nhận/lời chúc qua Zalo khi kho lời chúc chưa bật
  "cha_cr": "Ông …", "me_cr": "Bà …", "cha_cd": "", "me_cd": "",
  "le": {                                 // ngày 2026-12-20, giờ 24h; "ghi" = ghi chú sau giờ
    "vu_quy":    {"ngay": "2026-12-19", "gio": "08:00", "noi": "Tư gia nhà gái · …"},
    "thanh_hon": {"ngay": "2026-12-20", "gio": "09:00", "noi": "Tư gia nhà trai · …"},
    "tiec":      {"ngay": "2026-12-20", "gio": "11:00", "noi": "Nhà hàng … · …", "ghi": "đón khách trước 30 phút"}
  },
  "ban_do": "",                           // địa chỉ cho bản đồ (trống = nơi tiệc)
  "vietqr_bank": "", "vietqr_stk": "", "vietqr_ten": "",
  "youtube_id": "",                       // mã 11 ký tự hoặc link YouTube (trống = không có khối clip)
  "loi_ngo": "", "cau_chuyen": "",        // trống = câu mặc định
  "nhac": "",                             // trống = nhạc của mẫu · canon-in-d · minuet-in-g · gymnopedie · d:<mã Drive> · khong
  "anh": {"thu_muc": "…", "tep": [],      // tep trống = mọi ảnh trong thư mục (theo tên)
          "bia": 1, "cr": 2, "cd": 3, "ds": [4, 5, 6], "poster": 7,   // số thứ tự trong danh sách ảnh (1 = ảnh đầu); trống = tự chọn
          "bia_pos": "", "pos": {"4": "50% 20%"}},
  "so": {"dia_chi": "", "ghi_chu": "", "thu": false}   // chỉ ghi vào Sổ thiệp, không lên thiệp (thu = thiệp thử)
}
Sổ thiệp (riêng tư, trong Claude): https://claude.ai/artifact/7C7nJ77VMcb6b2Jd2pmpcX — tạo xong thì ghi "so" (JSON in ra) vào
collection "thiep", doc_id = mã thiệp (ArtifactData set). Mọi thiệp phải có dòng trong sổ, vì khoá chỉ nằm ở link.
"""
import base64
import copy
import datetime
import hashlib
import io
import json
import os
import re
import secrets
import string
import sys
import unicodedata
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import thiep_chung as C  # noqa: E402

B62 = string.ascii_letters + string.digits
KL = 16
DUOI_ANH = ('.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff')
# Phần CÔNG KHAI (pub, nằm trần trong trang — như chính các file ảnh): tên, ngày cưới, bố cục ảnh, nhạc.
# Phần RIÊNG (mã hoá): SĐT, cha mẹ, lịch lễ & địa điểm, bản đồ, tài khoản mừng cưới, clip, lời ngỏ/câu chuyện.
# Bảng sửa ẩn (js/sua-thiep.js) dùng đúng 2 danh sách này.
PUB_ANH = ['bia', 'bia_pos', 'anh_cr', 'anh_cd', 'anh_ds', 'poster', 'poster_pos', 'pos']
PUB_TEN = ['ten_cd', 'ten_cr']
RIENG = ['sdt_cd', 'sdt_cr', 'cha_cr', 'me_cr', 'cha_cd', 'me_cd', 'le', 'ban_do', 'vietqr_bank', 'vietqr_stk', 'vietqr_ten',
         'youtube_id', 'loi_ngo', 'cau_chuyen', 'loi_moi_mau', 'tao']


# ---------------- mã hoá ----------------
def b64u(b):
    return base64.urlsafe_b64encode(b).decode().rstrip('=')


def ub64(s):
    return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))


def khoa(ma, k):
    return hashlib.sha256(f'pds-thiep|v1|{ma}|{k}'.encode()).digest()


def ma_hoa(ma, k, obj):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    iv = secrets.token_bytes(12)
    ct = AESGCM(khoa(ma, k)).encrypt(iv, json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode(), None)
    return b64u(iv), b64u(ct)


def giai_ma(ma, k, iv, ct):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    try:
        return json.loads(AESGCM(khoa(ma, k)).decrypt(ub64(iv), ub64(ct), None).decode())
    except Exception:
        raise C.Loi('khoá không đúng (link sai hoặc thiếu ký tự)')


# ---------------- tên, mã, link ----------------
def khong_dau(s):
    s = unicodedata.normalize('NFD', s or '')
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').replace('đ', 'd').replace('Đ', 'D')


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', khong_dau(s).lower()).strip('-')


def tao_ma(ten_cd, ten_cr):
    goc = '-'.join(x for x in (slug(ten_cd), slug(ten_cr)) if x)
    goc = re.sub(r'-+', '-', goc[:40]).strip('-') or 'thiep'
    if goc.count('-') > 6:
        goc = '-'.join(goc.split('-')[:7])
    for _ in range(50):
        ma = goc + '-' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(4))
        if C.RE_MA.match(ma) and not os.path.exists(os.path.join(C.THU_MUC, ma)):
            return ma
    raise C.Loi('không tạo được mã thiệp')


def tao_k():
    return ''.join(secrets.choice(B62) for _ in range(KL))


def link(ma, k):
    return f'{C.WEB}thiep/{ma}/?k={k}'


def doc_link(s):
    u = urllib.parse.urlparse(s.strip())
    m = re.search(r'/thiep/([a-z0-9-]+)/?$', u.path)
    k = urllib.parse.parse_qs(u.query).get('k', [''])[0] or urllib.parse.parse_qs(u.fragment).get('k', [''])[0]
    k = re.sub(r'[^A-Za-z0-9]', '', k)[:KL]
    if not m or len(k) != KL:
        raise C.Loi('link thiệp không đúng dạng …/thiep/<mã>/?k=<16 ký tự>')
    return m.group(1), k


# ---------------- ảnh ----------------
def xu_ly_anh(nguon, thu_muc, so):
    """Ảnh gốc → <so>.jpg (cạnh dài 1600) + <so>-800.jpg; xoay theo EXIF, đổi về sRGB, bỏ mọi thông tin máy/GPS."""
    from PIL import Image, ImageCms, ImageOps
    im = Image.open(nguon)
    im = ImageOps.exif_transpose(im)
    icc = im.info.get('icc_profile')
    if im.mode not in ('RGB', 'L'):
        im = im.convert('RGB')
    if icc:
        try:
            im = ImageCms.profileToProfile(im, ImageCms.ImageCmsProfile(io.BytesIO(icc)), ImageCms.createProfile('sRGB'), outputMode='RGB')
        except Exception:
            pass
    im = im.convert('RGB')
    w, h = im.size
    for canh, ten, q in ((1600, f'{so}.jpg', 84), (800, f'{so}-800.jpg', 80)):
        x = im.copy()
        if max(w, h) > canh:
            x.thumbnail((canh, canh), Image.LANCZOS)
        x.save(os.path.join(thu_muc, ten), 'JPEG', quality=q, optimize=True, progressive=True)
    return round(w / h, 4)


def ds_tep(a):
    tm = a.get('thu_muc') or ''
    tep = a.get('tep') or []
    if tep:
        ds = [t if os.path.isabs(t) else os.path.join(tm, t) for t in tep]
    else:
        if not os.path.isdir(tm):
            raise C.Loi(f'không có thư mục ảnh: {tm}')
        ds = sorted(os.path.join(tm, f) for f in os.listdir(tm) if f.lower().endswith(DUOI_ANH) and not f.startswith('.'))
    for f in ds:
        if not os.path.isfile(f):
            raise C.Loi(f'không có ảnh: {f}')
    if len(ds) < 4:
        raise C.Loi('cần ít nhất 4 ảnh (bìa, chú rể, cô dâu, 1 ảnh câu chuyện) — nên 8–12 ảnh')
    if len(ds) > 60:
        raise C.Loi('tối đa 60 ảnh cho 1 thiệp')
    return ds


def chon_anh(anh_co, a, co_clip):
    """Gán ảnh vào các ô: theo chỉ định (số thứ tự 1…) hoặc tự chọn (ảnh dọc cho bìa/rể/dâu, ảnh ngang cho khung clip)."""
    so = [x['n'] for x in anh_co]
    r = {x['n']: x['r'] for x in anh_co}

    def sn(v):
        if v in (None, '', 0):
            return ''
        v = int(v)
        if not 1 <= v <= len(so):
            raise C.Loi(f'ảnh số {v} không có (chỉ có 1–{len(so)})')
        return so[v - 1]
    dung = set()
    chi = {k: sn(a.get(k)) for k in ('bia', 'cr', 'cd', 'poster')}
    ds_chi = [sn(v) for v in (a.get('ds') or [])]
    for v in list(chi.values()) + ds_chi:
        if v:
            dung.add(v)
    doc = [n for n in so if r[n] < 0.95]
    ngang = [n for n in so if r[n] > 1.05]

    def lay(*pools):
        for p in pools:
            for n in p:
                if n not in dung:
                    dung.add(n)
                    return n
        return ''
    o = {'bia': chi['bia'] or lay(doc, so)}
    o['anh_cr'] = chi['cr'] or lay(doc, so)
    o['anh_cd'] = chi['cd'] or lay(doc, so)
    o['poster'] = (chi['poster'] or lay(ngang, so)) if co_clip else ''
    o['anh_ds'] = ds_chi or [n for n in so if n not in dung][:10]
    tat_ca = [o['bia'], o['anh_cr'], o['anh_cd']] + o['anh_ds'] + ([o['poster']] if o['poster'] else [])
    lap = sorted({n for n in tat_ca if tat_ca.count(n) > 1})
    if lap:
        raise C.Loi('ảnh bị dùng 2 lần: ' + ', '.join(lap))
    if not o['anh_ds']:
        raise C.Loi('chưa có ảnh nào cho phần câu chuyện')
    o['anh_ds'] = ','.join(o['anh_ds'])
    return o


# ---------------- dữ liệu thiệp ----------------
def youtube(v):
    v = (v or '').strip()
    if not v:
        return ''
    m = re.search(r'(?:v=|youtu\.be/|embed/|shorts/)([\w-]{11})', v) or re.match(r'^([\w-]{11})$', v)
    if not m:
        raise C.Loi('youtube_id không đúng (mã 11 ký tự hoặc link YouTube)')
    return m.group(1)


def sach_sdt(v, ten):
    v = re.sub(r'[^\d+]', '', v or '')
    if v and not re.match(r'^\+?\d{9,12}$', v):
        raise C.Loi(f'{ten} không đúng')
    return v


def sach_nhac(v, mac_dinh):
    return C.sach_nhac(v, mac_dinh)


def sach_le(x, ten):
    x = x or {}
    return {'ngay': C.sach_ngay(x.get('ngay'), f'Ngày {ten}', cho_trong=True),
            'gio': sach_gio(x.get('gio'), f'Giờ {ten}'),
            'noi': chu(x.get('noi'), 160), 'ghi': chu(x.get('ghi'), 80)}


def sach_gio(v, ten):
    v = (v or '').strip()
    if not v:
        return ''
    m = re.match(r'^(\d{1,2})[:h](\d{2})$', v)
    if not m or int(m.group(1)) > 23 or int(m.group(2)) > 59:
        raise C.Loi(f'{ten} phải dạng 24h, vd 09:30')
    return f'{int(m.group(1)):02d}:{m.group(2)}'


def chu(v, dai):
    v = re.sub(r'[ \t]+', ' ', str(v or '')).strip()
    v = ''.join(c for c in v if c == '\n' or ord(c) >= 32)
    if len(v) > dai:
        raise C.Loi(f'"{v[:30]}…" dài quá {dai} ký tự')
    return v


def ngay_cua(le):
    le = le or {}
    return (le.get('tiec') or {}).get('ngay') or (le.get('thanh_hon') or {}).get('ngay') or (le.get('vu_quy') or {}).get('ngay') or ''


def xem_day_du(pub, rieng):
    """Gộp 2 phần + các dòng hiển thị (giống ghepThiep/tinhToan trong thiep-mau.html) — để in cho người đọc."""
    d = dict(rieng)
    for k in ('mau', 'ten_cd', 'ten_cr', 'anh_co', 'nhac') + tuple(PUB_ANH):
        d[k] = pub.get(k)
    le = d.get('le') or {}
    vq, th, ti = (le.get(k) or {} for k in ('vu_quy', 'thanh_hon', 'tiec'))
    d['ngay_cuoi'] = ngay_cua(le)
    d['gio_dem_nguoc'] = ti.get('gio') or th.get('gio') or ''
    for k, x in (('vuquy', vq), ('thanhhon', th), ('tiec', ti)):
        d[k + '_thoigian'] = C.fmt_le(x.get('ngay'), x.get('gio'), x.get('ghi'))
        d[k + '_diadiem'] = x.get('noi', '')
    d['map_diadiem'] = d.get('ban_do') or ti.get('noi') or th.get('noi') or vq.get('noi') or ''
    return d


def kiem_du_lieu(ma, pub, rieng):
    so = {x['n'] for x in pub.get('anh_co') or []}
    for k, ten in (('bia', 'ảnh bìa'), ('anh_cr', 'ảnh chú rể'), ('anh_cd', 'ảnh cô dâu')):
        if pub.get(k) not in so:
            raise C.Loi(f'ô {ten} chưa có ảnh')
    ds = [x for x in (pub.get('anh_ds') or '').split(',') if x]
    if not ds:
        raise C.Loi('chưa có ảnh nào cho phần câu chuyện')
    for n in ds + ([pub['poster']] if pub.get('poster') else []):
        if n not in so:
            raise C.Loi(f'ảnh {n} không có trong bộ ảnh')
    dung = [pub['bia'], pub['anh_cr'], pub['anh_cd']] + ds + ([pub['poster']] if pub.get('poster') else [])
    lap = sorted({n for n in dung if dung.count(n) > 1})
    if lap:
        raise C.Loi('ảnh bị dùng 2 lần: ' + ', '.join(lap))
    for n in so:
        if not C.co_anh(ma, n):
            raise C.Loi(f'thiếu file ảnh {n}')
    if not ngay_cua(rieng.get('le')):
        raise C.Loi('chưa có ngày cưới (ngày tiệc hoặc lễ Thành Hôn)')


# ---------------- trang ----------------
BOOT = """<script id="thiep-du-lieu" type="application/json">%s</script>
<script>
/* THIỆP RIÊNG — Phạm Đức Studio (tạo bằng .github/thiep/tao_thiep.py). SĐT, địa chỉ, lịch lễ, tài khoản… mã hoá: chỉ mở được
   bằng đúng link có ?k=…  ?sua=1 → bảng sửa ẩn (lưu được hay không do GitHub kiểm tài khoản chủ web). */
(function(){
  if (location.protocol === 'http:' && /(^|\\.)phamducstudio\\.vn$/.test(location.hostname)) { location.replace('https://' + location.host + location.pathname + location.search + location.hash); return; }
  var E = null; try { E = JSON.parse(document.getElementById('thiep-du-lieu').textContent); } catch (e) {}
  if (!E || !E.id) return;
  window.__THIEP_ENC__ = E; window.__THIEP_ANH__ = '/thiep/' + E.id + '/';
  var P = E.pub || {};
  if (P.theme && P.theme !== 'do-hy') document.documentElement.setAttribute('data-theme', P.theme);
  if (P.style) document.documentElement.setAttribute('data-style', P.style);
  if (/[?&]sua(=|&|$)/.test(location.search)) {
    window.__SUA__ = { thiep: true };
    var sj = document.createElement('script'); sj.src = '/js/sua-thiep.js?v=%s'; sj.async = true; document.head.appendChild(sj);
  }
})();
</script>"""


def thay_khoi(s, dau, cuoi, moi):
    i = s.find(dau)
    j = s.find(cuoi, i + 1) if i >= 0 else -1
    if i < 0 or j < 0 or s.find(dau, i + 1) >= 0:
        raise C.Loi(f'thiep-mau.html thiếu (hoặc lặp) mốc {dau}')
    return s[:i] + moi + s[j + len(cuoi):]


def dung_trang(E, v_anh=''):
    s = open(C.TEMPLATE, encoding='utf-8').read()
    s = thay_khoi(s, '<!--MAU:BOOT', '<!--/MAU:BOOT-->', BOOT % (C.json_trong_script(E), C.PHIEN_BAN_SUA))
    s = thay_khoi(s, '<!--MAU:META-->', '<!--/MAU:META-->', C.khoi_meta(E['pub'], v_anh))
    s = thay_khoi(s, '<!--MAU:BAR-->', '<!--/MAU:BAR-->', '')
    return s


def ghi_thiep(ma, k, pub, rieng, E_cu=None, chup_the=True):
    """Ghi thiep/<mã>/index.html. rieng=None → giữ nguyên phần mã hoá cũ (E_cu)."""
    if rieng is None:
        rieng = giai_ma(ma, k, E_cu['iv'], E_cu['ct'])
        iv, ct = E_cu['iv'], E_cu['ct']
    else:
        iv, ct = ma_hoa(ma, k, rieng)
    pub['ngay'] = ngay_cua(rieng.get('le'))
    kiem_du_lieu(ma, pub, rieng)
    E = {'v': 1, 'id': ma, 'kl': KL, 'pub': pub, 'iv': iv, 'ct': ct}
    p = C.duong_dan(ma, 'index.html')
    v_cu = C.v_anh_hien_tai(open(p, encoding='utf-8').read()) if os.path.isfile(p) else ''
    open(p, 'w', encoding='utf-8').write(dung_trang(E, v_cu))
    if chup_the:
        import anh_chia_se
        anh_chia_se.chup(ma)
    return E


def dong_so(ma, k, pub, rieng, tt=None):
    so = (tt or {}).get('so') or {}
    ti = (rieng.get('le') or {}).get('tiec') or {}
    return {'id': ma, 'ten_cd': pub['ten_cd'], 'ten_cr': pub['ten_cr'], 'sdt_cd': rieng.get('sdt_cd', ''), 'sdt_cr': rieng.get('sdt_cr', ''),
            'ngay_cuoi': pub.get('ngay', ''), 'ngay_xuat_ban': rieng.get('tao', ''),
            'dia_chi': so.get('dia_chi') or ti.get('noi') or rieng.get('ban_do', ''),
            'mau': pub.get('mau', ''), 'link': link(ma, k), 'ghi_chu': so.get('ghi_chu', ''), 'thu': bool(so.get('thu')),
            'cap_nhat': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')}


def the_the(pub):
    return {x: pub.get(x) for x in ('ten_cd', 'ten_cr', 'ngay', 'bia', 'bia_pos', 'theme', 'style')}


# ---------------- lệnh ----------------
def lenh_tao(duong):
    tt = json.load(open(duong, encoding='utf-8'))
    MAU = C.mau_trong_template()
    key = tt.get('mau') or 'co-dien'
    if key not in MAU:
        raise C.Loi(f'không có mẫu "{key}" (chọn: {", ".join(MAU)})')
    M = MAU[key]
    ten_cd, ten_cr = C.sach_ten(tt.get('ten_cd'), 'Tên cô dâu'), C.sach_ten(tt.get('ten_cr'), 'Tên chú rể')
    a = tt.get('anh') or {}
    tep = ds_tep(a)
    yt = youtube(tt.get('youtube_id'))
    rieng = {'sdt_cd': sach_sdt(tt.get('sdt_cd'), 'SĐT cô dâu'), 'sdt_cr': sach_sdt(tt.get('sdt_cr'), 'SĐT chú rể'),
             'cha_cr': chu(tt.get('cha_cr'), 60), 'me_cr': chu(tt.get('me_cr'), 60),
             'cha_cd': chu(tt.get('cha_cd'), 60), 'me_cd': chu(tt.get('me_cd'), 60),
             'le': {k2: sach_le((tt.get('le') or {}).get(k2), t) for k2, t in (('vu_quy', 'Vu Quy'), ('thanh_hon', 'Thành Hôn'), ('tiec', 'tiệc'))},
             'ban_do': chu(tt.get('ban_do'), 160),
             'vietqr_bank': chu(tt.get('vietqr_bank'), 40), 'vietqr_stk': chu(tt.get('vietqr_stk'), 30), 'vietqr_ten': chu(tt.get('vietqr_ten'), 60),
             'youtube_id': yt, 'loi_ngo': chu(tt.get('loi_ngo'), 600), 'cau_chuyen': chu(tt.get('cau_chuyen'), 600),
             'loi_moi_mau': 'Quý khách', 'tao': datetime.date.today().isoformat()}
    if not ngay_cua(rieng['le']):
        raise C.Loi('chưa có ngày cưới (le.tiec.ngay hoặc le.thanh_hon.ngay)')
    ma, k = tao_ma(ten_cd, ten_cr), tao_k()
    tm = C.duong_dan(ma)
    os.makedirs(tm)
    try:
        anh_co = []
        for i, f in enumerate(tep, 1):
            n = f'{i:02d}'
            anh_co.append({'n': n, 'r': xu_ly_anh(f, tm, n)})
        chon = chon_anh(anh_co, a, bool(yt))
        pos = {}
        for so_tt, v in (a.get('pos') or {}).items():
            pos[anh_co[int(so_tt) - 1]['n']] = C.sach_pos(v, f'Canh khung ảnh {so_tt}')
        pub = {'id': ma, 'mau': key, 'theme': M.get('theme', ''), 'style': M.get('style', ''),
               'ten_cd': ten_cd, 'ten_cr': ten_cr, 'ngay': '',
               'bia': chon['bia'], 'bia_pos': C.sach_pos(a.get('bia_pos'), 'Canh khung ảnh bìa'),
               'anh_cr': chon['anh_cr'], 'anh_cd': chon['anh_cd'], 'anh_ds': chon['anh_ds'],
               'poster': chon['poster'], 'poster_pos': '', 'pos': pos, 'anh_co': anh_co,
               'nhac': sach_nhac(tt.get('nhac'), M.get('nhac', '')), 'nhac_ten': '', 'nhac_doi': '1'}
        pub['goc'] = copy.deepcopy({x: pub[x] for x in PUB_TEN + PUB_ANH})   # nút "Về bản gốc" của bảng sửa ẩn
        ghi_thiep(ma, k, pub, rieng)
    except Exception:
        import shutil
        shutil.rmtree(tm, ignore_errors=True)
        raise
    print(json.dumps({'link': link(ma, k), 'so': dong_so(ma, k, pub, rieng, tt)}, ensure_ascii=False, indent=1))


def mo_thiep(l):
    ma, k = doc_link(l)
    _, E = C.doc_trang(ma)
    return ma, k, E, dict(E['pub']), giai_ma(ma, k, E['iv'], E['ct'])


def lenh_mo(l):
    ma, k, E, pub, rieng = mo_thiep(l)
    print(json.dumps({'pub': pub, 'rieng': rieng, 'hien_thi': xem_day_du(pub, rieng)}, ensure_ascii=False, indent=1))


def lenh_sua(l, duong):
    ma, k, E, pub, rieng = mo_thiep(l)
    the_cu, rieng_cu = the_the(pub), copy.deepcopy(rieng)
    moi = json.load(open(duong, encoding='utf-8'))
    for kk, v in moi.items():
        if kk == 'le':
            for k2, x in (v or {}).items():
                if k2 not in ('vu_quy', 'thanh_hon', 'tiec'):
                    raise C.Loi(f'lễ "{k2}" không có')
                rieng['le'][k2] = sach_le(dict(rieng['le'].get(k2) or {}, **(x or {})), k2)
        elif kk in PUB_TEN:
            pub[kk] = C.sach_ten(v, kk)
        elif kk in ('bia_pos', 'poster_pos'):
            pub[kk] = C.sach_pos(v, kk)
        elif kk == 'pos':
            pub['pos'] = {str(n): C.sach_pos(p, f'canh khung {n}') for n, p in (v or {}).items()}
        elif kk in ('bia', 'anh_cr', 'anh_cd', 'poster'):
            pub[kk] = f'{int(v):02d}' if v not in ('', None) else ''
        elif kk == 'anh_ds':
            pub['anh_ds'] = ','.join(f'{int(x):02d}' for x in (v.split(',') if isinstance(v, str) else v) if str(x).strip())
        elif kk == 'nhac':
            pub['nhac'] = sach_nhac(v, '')
        elif kk == 'mau':
            M = C.mau_trong_template().get(v)
            if not M:
                raise C.Loi(f'không có mẫu "{v}"')
            pub.update({'mau': v, 'theme': M.get('theme', ''), 'style': M.get('style', '')})
        elif kk in ('sdt_cd', 'sdt_cr'):
            rieng[kk] = sach_sdt(v, kk)
        elif kk == 'youtube_id':
            rieng[kk] = youtube(v)
        elif kk in RIENG:
            rieng[kk] = chu(v, 600)
        else:
            raise C.Loi(f'trường "{kk}" không sửa được bằng lệnh này')
    pub['ngay'] = ngay_cua(rieng.get('le'))
    ghi_thiep(ma, k, pub, rieng if rieng != rieng_cu else None, E_cu=E, chup_the=the_the(pub) != the_cu)
    print('Đã sửa. Link giữ nguyên: ' + link(ma, k))


def lenh_them_anh(l, tep):
    ma, k, E, pub, _ = mo_thiep(l)
    so = [int(x['n']) for x in pub['anh_co']]
    ds = [x for x in (pub.get('anh_ds') or '').split(',') if x]
    for f in tep:
        n = f'{max(so) + 1:02d}'
        so.append(int(n))
        pub['anh_co'].append({'n': n, 'r': xu_ly_anh(f, C.duong_dan(ma), n)})
        ds.append(n)
    pub['anh_ds'] = ','.join(ds)
    ghi_thiep(ma, k, pub, None, E_cu=E, chup_the=False)
    print(f'Đã thêm {len(tep)} ảnh. Link giữ nguyên: ' + link(ma, k))


def lenh_lam_lai(ds):
    if ds == ['--tat-ca']:
        ds = sorted(x for x in os.listdir(C.THU_MUC) if os.path.isfile(os.path.join(C.THU_MUC, x, 'index.html'))) if os.path.isdir(C.THU_MUC) else []
    for ma in ds:
        s, E = C.doc_trang(ma)
        open(C.duong_dan(ma, 'index.html'), 'w', encoding='utf-8').write(dung_trang(E, C.v_anh_hien_tai(s)))
        print('dựng lại', ma)


def lenh_kiem(l):
    ma, k, E, pub, rieng = mo_thiep(l)
    kiem_du_lieu(ma, pub, rieng)
    print(f"OK {ma}: {pub['ten_cd']} & {pub['ten_cr']} · cưới {pub.get('ngay')} · {len(pub['anh_co'])} ảnh · mẫu {pub.get('mau')}")


if __name__ == '__main__':
    a = sys.argv[1:]
    try:
        if a[:1] == ['tao'] and len(a) == 2:
            lenh_tao(a[1])
        elif a[:1] == ['mo'] and len(a) == 2:
            lenh_mo(a[1])
        elif a[:1] == ['sua'] and len(a) == 3:
            lenh_sua(a[1], a[2])
        elif a[:1] == ['them-anh'] and len(a) >= 3:
            lenh_them_anh(a[1], a[2:])
        elif a[:1] == ['lam-lai'] and len(a) >= 2:
            lenh_lam_lai(a[1:])
        elif a[:1] == ['kiem'] and len(a) == 2:
            lenh_kiem(a[1])
        else:
            print(__doc__)
            sys.exit(2)
    except C.Loi as er:
        print('LỖI: ' + str(er), file=sys.stderr)
        sys.exit(1)
