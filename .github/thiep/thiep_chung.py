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
PHIEN_BAN_SUA = '20260927a'          # ?v= của js/sua-thiep.js trong trang thiệp riêng (đổi cùng lúc với thiep-mau.html)

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
PUB_SUA = ['ten_cd', 'ten_cr', 'bia', 'bia_pos', 'anh_cr', 'anh_cd', 'anh_ds', 'poster', 'poster_pos', 'pos', 'ngay', 'nhac', 'tuy']
CHUP_LAI = ('ten_cd', 'ten_cr', 'ngay', 'bia', 'bia_pos', 'theme', 'style')   # đổi mấy trường này thì chụp lại share.jpg

# ---- Hiệu ứng & phần (tab "Hiệu ứng & phần" của bảng sửa ẩn; thiệp vẽ theo renderTuy() trong thiep-mau.html) ----
# tuy = {"tat": [khoá tắt], "bat": ["phong_bi"], "td": {khoá: tiêu đề}} — công khai (thiệp mẫu: trong MAU · thiệp riêng: trong pub)
# tho = {"1".."4": thơ} + ghi_them (lưu ý cho khách) — thiệp mẫu: trong MAU · thiệp riêng: trong phần MÃ HOÁ
TEN_TUY = {'hoa': 'Cánh hoa rơi', 'hien': 'Hiện dần khi cuộn', 'kb': 'Ảnh bìa phóng chậm', 'phong_bi': 'Phong bì mở thiệp',
           'bay': 'Lời chúc bay lên', 'loi_ngo': 'Lời ngỏ', 'cau_chuyen': 'Câu chuyện', 'tho1': 'Thơ khối 3 ảnh ghép',
           'tho2': 'Thơ dưới ảnh tràn khung', 'tho3': 'Câu trích khối 2 ảnh nổi', 'lich': 'Lịch tháng cưới', 'dem': 'Đồng hồ đếm ngược',
           'luu_lich': 'Nút lưu ngày cưới vào lịch', 'ban_do': 'Bản đồ', 'tho4': 'Thơ khối cặp ảnh cuối', 'rsvp': 'Xác nhận tham dự',
           'qr': 'Mừng cưới QR', 'chuc': 'Lời chúc', 'thanh': 'Thanh nút dưới đáy', 'quang_cao': 'Dòng giới thiệu studio cuối thiệp'}
TUY_TAT = tuple(TEN_TUY)
TUY_BAT = ('phong_bi',)
TEN_TD = {'story': 'Our Story', 'love1': 'love you (khối 3 ảnh)', 'film': 'Our Film', 'time': 'Wedding Time', 'address': 'Address',
          'love2': 'love you (cặp ảnh cuối)', 'album': 'Khoảnh khắc của chúng mình', 'rsvp': 'RSVP', 'withlove': 'With Love',
          'welcome': 'Welcome', 'thanks': 'Thank you', 'ghi': 'Lưu ý cho khách'}
TEN_THO = {'1': 'Thơ khối 3 ảnh ghép', '2': 'Thơ dưới ảnh tràn khung', '3': 'Câu trích khối 2 ảnh nổi', '4': 'Thơ khối cặp ảnh cuối'}
RE_DIEU_KHIEN = re.compile(r'[\x00-\x08\x0b-\x1f\x7f-\x9f]')
RE_CAM_CHU = re.compile(r'[<>{}\[\]`\\|]')


def sach_chu(v, ten_truong, dai, nhieu_dong=False):
    """Chữ tự do (tiêu đề, thơ, lưu ý) — làm y như sachChu() của bảng sửa (bỏ ký tự điều khiển/ký tự cấm, gọn khoảng trắng)."""
    if v is None:
        return ''
    if not isinstance(v, str):
        raise Loi(f'{ten_truong} phải là chữ')
    s = RE_CAM_CHU.sub('', RE_DIEU_KHIEN.sub('', v))
    s = re.sub(r'\n{3,}', '\n\n', re.sub(r'[ \t]+', ' ', s)).strip() if nhieu_dong else re.sub(r'\s+', ' ', s).strip()
    if len(s) > dai:
        raise Loi(f'{ten_truong} dài quá {dai} chữ')
    return s


def sach_tuy(v):
    """→ dạng gọn chuẩn {"tat": […a→z], "bat": […], "td": {…a→z}}, bỏ phần rỗng ({} = mặc định). Giống gonTuy() của bảng sửa."""
    if v in (None, '', {}):
        return {}
    if not isinstance(v, dict):
        raise Loi('Hiệu ứng & phần (tuy) sai dạng')
    la = [k for k in v if k not in ('tat', 'bat', 'td')]
    if la:
        raise Loi('Hiệu ứng & phần: mục lạ ' + ', '.join(map(str, la)))
    o = {}
    ds = {}
    for k, cho, viec in (('tat', TUY_TAT, 'tắt'), ('bat', TUY_BAT, 'bật')):
        x = v.get(k) or []
        if not isinstance(x, list) or not all(isinstance(y, str) for y in x):
            raise Loi(f'Hiệu ứng & phần: danh sách {viec} sai dạng')
        sai = [y for y in x if y not in cho]
        if sai:
            raise Loi(f'Hiệu ứng & phần: không có mục "{sai[0]}" để {viec}')
        ds[k] = sorted(set(x))
    if 'phong_bi' in ds['tat']:
        ds['bat'] = [y for y in ds['bat'] if y != 'phong_bi']
    for k in ('tat', 'bat'):
        if ds[k]:
            o[k] = ds[k]
    td = v.get('td') or {}
    if not isinstance(td, dict):
        raise Loi('Hiệu ứng & phần: tiêu đề sai dạng')
    td2 = {}
    for k in sorted(td):
        if k not in TEN_TD:
            raise Loi(f'Hiệu ứng & phần: không có tiêu đề "{k}"')
        s = sach_chu(td[k], f'Tiêu đề “{TEN_TD[k]}”', 40)
        if s:
            td2[k] = s
    if td2:
        o['td'] = td2
    return o


def sach_tho(v):
    """{"1".."4": thơ ≤200 chữ} — bỏ bài trống (trống = câu mặc định của mẫu)."""
    if v in (None, '', {}):
        return {}
    if not isinstance(v, dict):
        raise Loi('Thơ (tho) sai dạng')
    o = {}
    for k in sorted(v, key=str):
        if str(k) not in TEN_THO:
            raise Loi(f'Thơ: không có khối "{k}"')
        s = sach_chu(v[k], TEN_THO[str(k)], 200, nhieu_dong=True)
        if s:
            o[str(k)] = s
    return o


def sach_ghi(v):
    return sach_chu(v, 'Lưu ý cho khách', 300, nhieu_dong=True)


def dong_tuy(a, b, style=''):
    """Tóm tắt thay đổi Hiệu ứng & phần (công khai được): tắt/bật gì, đổi tiêu đề nào."""
    a, b = a or {}, b or {}

    def bat(t, k):
        if k == 'phong_bi':
            return (style == 'song-hy' and k not in (t.get('tat') or [])) or k in (t.get('bat') or [])
        return k not in (t.get('tat') or [])
    tat_, bat_ = [], []
    for k in TUY_TAT:
        x, y = bat(a, k), bat(b, k)
        if x and not y:
            tat_.append(TEN_TUY[k])
        elif y and not x:
            bat_.append(TEN_TUY[k])
    L = []
    if tat_:
        L.append('Tắt: ' + ' · '.join(tat_))
    if bat_:
        L.append('Bật: ' + ' · '.join(bat_))
    ta, tb = a.get('td') or {}, b.get('td') or {}
    for k in TEN_TD:
        if ta.get(k, '') != tb.get(k, ''):
            L.append(f"Tiêu đề “{TEN_TD[k]}”: {ta.get(k) or 'mặc định'} → {tb.get(k) or 'mặc định'}")
    return L


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
    tuy = sach_tuy(m.get('tuy'))
    if tuy:
        moi['tuy'] = tuy
    else:
        moi.pop('tuy', None)                        # mặc định: không ghi trường rỗng
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
