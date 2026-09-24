#!/usr/bin/env python3
"""Áp dụng yêu cầu sửa thiệp mẫu gửi từ bảng sửa ẩn (js/sua-thiep.js) qua GitHub issue.

Chạy trong GitHub Actions (.github/workflows/sua-thiep.yml):
  ap_dung.py ap-dung <event.json> <ket-qua.json>   kiểm dữ liệu + sửa thiep-mau.html (+ tên ở trang bán)
  ap_dung.py cho-web <ket-qua.json>                đợi web thật đổi (tải lại thiep-mau.html), quá lâu thì nhờ Pages build lại
  ap_dung.py bao <ket-qua.json> <ap> <day> <dai> <web>   in nội dung comment trả lời issue (markdown)

Chỉ đọc dữ liệu trong khối ```json cuối cùng của issue; mọi giá trị được kiểm chặt (mẫu có thật, ảnh có thật
trong images/, canh khung đúng dạng "x% y%", tên không có ký tự lạ, không ảnh nào bị dùng 2 lần).
Chạy thử ở máy: ap_dung.py ap-dung event-thu.json kq.json (event-thu.json = {"issue": {"number": 1, "body": "..."}}).
"""
import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.request

GOC = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
THIEP = os.path.join(GOC, 'thiep-mau.html')
TRANG_BAN = os.path.join(GOC, 'thiep-cuoi-online.html')
WEB = 'https://phamducstudio.vn/'
FIELDS = ['album', 'ten_cr', 'ten_cd', 'bia', 'bia_pos', 'anh_cr', 'anh_cd', 'anh_ds', 'poster', 'poster_pos', 'pos']
TIEN_TO = '  var MAU = '
RE_SO = re.compile(r'^\d{1,3}$')
RE_POS = re.compile(r'^(\d{1,3})% (\d{1,3})%$')
RE_ALBUM = re.compile(r'^(studio|ngoai-canh)-\d{1,3}$')
KY_TU_CAM = set('<>{}[]`"\\|')


class Loi(Exception):
    pass


def doc_mau(noi_dung):
    dong = [l for l in noi_dung.split('\n') if l.startswith(TIEN_TO)]
    if len(dong) != 1:
        raise Loi('không tìm thấy dữ liệu mẫu trong thiep-mau.html')
    d = dong[0]
    return json.loads(d[d.index('['):d.rindex(']') + 1]), d


def ghi_mau(noi_dung, dong_cu, mau):
    moi = TIEN_TO + json.dumps(mau, ensure_ascii=False).replace('</', '<\\/') + ';'
    return noi_dung.replace(dong_cu, moi, 1)


def lay_payload(body):
    khoi = re.findall(r'```json\s*(\{.*?\})\s*```', body or '', re.S)
    if not khoi:
        raise Loi('không thấy khối dữ liệu ```json trong issue (issue phải tạo từ nút Lưu của bảng sửa)')
    try:
        return json.loads(khoi[-1])
    except ValueError:
        raise Loi('khối dữ liệu json bị hỏng')


def co_anh(album, n):
    return all(os.path.isfile(os.path.join(GOC, 'images', f'album-{album}-{n}{s}.jpg')) for s in ('', '-800'))


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


def sach_so(v, ten_truong, album, cho_trong=False):
    v = '' if v is None else str(v).strip()
    if not v:
        if cho_trong:
            return ''
        raise Loi(f'{ten_truong} đang trống')
    if not RE_SO.match(v):
        raise Loi(f'{ten_truong}: số ảnh "{v}" không hợp lệ')
    if not co_anh(album, v):
        raise Loi(f'{ten_truong}: không có ảnh {v} trong bộ {album}')
    return v


def dong_thay_doi(a, b):
    """Tóm tắt thay đổi bằng tiếng Việt (giống bảng sửa)."""
    L = []
    if a['ten_cr'] != b['ten_cr']:
        L.append(f"Tên chú rể: {a['ten_cr']} → {b['ten_cr']}")
    if a['ten_cd'] != b['ten_cd']:
        L.append(f"Tên cô dâu: {a['ten_cd']} → {b['ten_cd']}")
    if a['album'] != b['album']:                      # đổi cả bộ: số ảnh 2 bộ không so với nhau được
        L.insert(0, f"Bộ ảnh: {a['album']} → {b['album']}")
        L.append(f"Ảnh chọn lại theo bộ mới — bìa {b['bia'] or 'gốc'} · rể {b['anh_cr']} · dâu {b['anh_cd']} · "
                 f"câu chuyện {b['anh_ds'].replace(',', ' ')} · clip {b['poster']}")
        return L
    if a['bia'] != b['bia'] and (a['bia'] or b['bia']):
        L.append(f"Ảnh bìa: {a['bia'] or 'bìa gốc'} → {b['bia'] or 'bìa gốc'}")
    elif a['bia_pos'] != b['bia_pos'] and a['album'] == b['album']:
        L.append('Canh khung ảnh bìa')
    for k, t in (('anh_cr', 'Ảnh chú rể'), ('anh_cd', 'Ảnh cô dâu')):
        if a[k] != b[k]:
            L.append(f'{t}: {a[k]} → {b[k]}')
    if a['anh_ds'] != b['anh_ds']:
        L.append(f"Ảnh câu chuyện: {a['anh_ds'].replace(',', ' ') or '—'} → {b['anh_ds'].replace(',', ' ') or '—'}")
    if a['poster'] != b['poster']:
        L.append(f"Ảnh khung clip: {a['poster']} → {b['poster']}")
    elif a['poster_pos'] != b['poster_pos'] and a['album'] == b['album']:
        L.append('Canh khung ảnh clip')
    if a['album'] == b['album']:
        pa, pb = a.get('pos') or {}, b.get('pos') or {}
        doi = sorted(n for n in set(pa) | set(pb) if pa.get(n, '') != pb.get(n, '') and n in pb)
        if doi:
            L.append('Canh khung: ảnh ' + ', '.join(doi))
    return L


def ban_sua_duoc(e):
    return {
        'album': e.get('album', ''), 'ten_cr': e.get('ten_cr', ''), 'ten_cd': e.get('ten_cd', ''),
        'bia': e.get('bia', '') or '', 'bia_pos': e.get('bia_pos', '') or '',
        'anh_cr': e.get('anh_cr', ''), 'anh_cd': e.get('anh_cd', ''), 'anh_ds': e.get('anh_ds', ''),
        'poster': e.get('poster', ''), 'poster_pos': e.get('poster_pos', '') or '',
        'pos': dict(sorted((e.get('pos') or {}).items())),
    }


def kiem_va_ghep(truoc, set_):
    """truoc = các trường sửa được hiện tại; set_ = phần đổi. Trả về bản mới đã kiểm."""
    if not isinstance(set_, dict) or not set_:
        raise Loi('không có thay đổi nào')
    la = [k for k in set_ if k not in FIELDS]
    if la:
        raise Loi('trường không được sửa: ' + ', '.join(la))
    m = dict(truoc)
    m.update(set_)
    album = str(m['album']).strip()
    if not RE_ALBUM.match(album):
        raise Loi(f'bộ ảnh "{album}" không hợp lệ (chỉ studio / ngoại cảnh)')
    if not os.path.isfile(os.path.join(GOC, f'album-{album}.html')) or not os.path.isfile(os.path.join(GOC, 'images', f'album-{album}-bia.jpg')):
        raise Loi(f'không có bộ ảnh {album} trên web')
    moi = {'album': album}
    moi['ten_cr'] = sach_ten(m['ten_cr'], 'Tên chú rể')
    moi['ten_cd'] = sach_ten(m['ten_cd'], 'Tên cô dâu')
    moi['bia'] = sach_so(m['bia'], 'Ảnh bìa', album, cho_trong=True)
    moi['bia_pos'] = sach_pos(m['bia_pos'], 'Canh khung ảnh bìa')
    moi['anh_cr'] = sach_so(m['anh_cr'], 'Ảnh chú rể', album)
    moi['anh_cd'] = sach_so(m['anh_cd'], 'Ảnh cô dâu', album)
    ds = m['anh_ds']
    ds = ds.split(',') if isinstance(ds, str) else (ds if isinstance(ds, list) else None)
    if ds is None:
        raise Loi('Ảnh câu chuyện phải là danh sách số ảnh')
    ds = [sach_so(x, 'Ảnh câu chuyện', album) for x in [str(x).strip() for x in ds] if x]
    if not ds or len(ds) > 16:
        raise Loi('Ảnh câu chuyện cần 1–16 ảnh')
    moi['anh_ds'] = ','.join(ds)
    moi['poster'] = sach_so(m['poster'], 'Ảnh khung clip', album)
    moi['poster_pos'] = sach_pos(m['poster_pos'], 'Canh khung ảnh clip')
    dung = [moi['anh_cr'], moi['anh_cd']] + ds + [moi['poster']] + ([moi['bia']] if moi['bia'] else [])
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
    return moi


def ghi_output(**kv):
    p = os.environ.get('GITHUB_OUTPUT')
    if p:
        with open(p, 'a', encoding='utf-8') as f:
            for k, v in kv.items():
                f.write(f'{k}={v}\n')


def ap_dung(event_path, kq_path):
    kq = {'ok': False, 'key': '', 'ten': '', 'dong': [], 'loi': '', 'so': 0, 'set': {}}
    try:
        ev = json.load(open(event_path, encoding='utf-8'))
        issue = ev.get('issue') or {}
        kq['so'] = int(issue.get('number') or 0)
        pl = lay_payload(issue.get('body') or '')
        if pl.get('v') != 1:
            raise Loi('phiên bản dữ liệu không đúng')
        noi_dung = open(THIEP, encoding='utf-8').read()
        mau, dong_cu = doc_mau(noi_dung)
        key = str(pl.get('key') or '')
        e = next((x for x in mau if x.get('key') == key), None)
        if not e:
            raise Loi(f'không có mẫu "{key}"')
        kq['key'], kq['ten'] = key, e.get('ten', key)
        truoc = ban_sua_duoc(e)
        moi = kiem_va_ghep(truoc, pl.get('set'))
        kq['dong'] = dong_thay_doi(truoc, moi)
        if moi == truoc:
            kq['ok'], kq['khong_doi'] = True, True
            kq['dong'] = ['Không có gì khác bản trên web — không cần sửa.']
        else:
            if 'goc' not in e:
                e['goc'] = truoc                      # bản studio dựng ban đầu — nút "Về bản gốc"
            for k in FIELDS:
                if k in ('bia', 'bia_pos') and not moi[k]:
                    e.pop(k, None)                    # bìa mặc định: không ghi trường rỗng
                else:
                    e[k] = moi[k]
            if 'goc' in e:                            # goc luôn nằm cuối cho dễ đọc
                e['goc'] = e.pop('goc')
            open(THIEP, 'w', encoding='utf-8').write(ghi_mau(noi_dung, dong_cu, mau))
            if (truoc['ten_cr'], truoc['ten_cd']) != (moi['ten_cr'], moi['ten_cd']):
                doi_ten_trang_ban(key, moi['ten_cd'], moi['ten_cr'])
            if truoc['album'] != moi['album']:
                kq['luu_y'] = 'Mô tả ngắn của mẫu này ở trang bán thiệp vẫn giữ như cũ — nếu bộ ảnh mới khác kiểu (studio ↔ ngoại cảnh), nhắn Claude sửa câu mô tả.'
            kq['ok'] = True
        kq['set'] = {k: moi[k] for k in FIELDS}
    except Loi as er:
        kq['loi'] = str(er)
    except Exception as er:                            # lỗi lạ: vẫn trả lời issue cho anh biết
        kq['loi'] = 'lỗi không mong muốn: ' + type(er).__name__
    json.dump(kq, open(kq_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ghi_output(doi='1' if kq['ok'] and not kq.get('khong_doi') else '0', ok='1' if kq['ok'] else '0',
               key=kq['key'] if re.match(r'^[a-z0-9-]{1,40}$', kq['key'] or '') else '')
    print(json.dumps(kq, ensure_ascii=False, indent=1))


def doi_ten_trang_ban(key, ten_cd, ten_cr):
    if not os.path.isfile(TRANG_BAN):
        return
    s = open(TRANG_BAN, encoding='utf-8').read()
    # thẻ mẫu trong danh sách: <article class="tc-card"> … data-xem="<key>" … <p class="cp">Dâu & Rể</p>
    re_the = re.compile(r'(<article class="tc-card">(?:(?!</article>).)*?data-xem="' + re.escape(key) + r'"(?:(?!</article>).)*?<p class="cp">)([^<]*)(</p>)', re.S)
    s2, n = re_the.subn(lambda m: m.group(1) + html.escape(ten_cd, quote=False) + ' &amp; ' + html.escape(ten_cr, quote=False) + m.group(3), s, count=1)
    if n:
        open(TRANG_BAN, 'w', encoding='utf-8').write(s2)


def tai_web():
    req = urllib.request.Request(WEB + 'thiep-mau.html?cb=' + str(int(time.time() * 1000)),
                                 headers={'User-Agent': 'sua-thiep-bot', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode('utf-8', 'replace')


def cho_web(kq_path):
    kq = json.load(open(kq_path, encoding='utf-8'))
    muc = kq.get('set') or {}
    bat_dau, da_nho = time.time(), False
    kq['web'] = False
    while time.time() - bat_dau < 480:
        try:
            mau, _ = doc_mau(tai_web())
            e = next((x for x in mau if x.get('key') == kq['key']), None)
            if e and ban_sua_duoc(e) == muc:
                kq['web'] = True
                break
        except Exception:
            pass
        if not da_nho and time.time() - bat_dau > 180:
            da_nho = True                              # Pages chưa build → nhờ build lại (không sao nếu đang build)
            try:
                subprocess.run(['gh', 'api', '-X', 'POST', f"repos/{os.environ.get('GITHUB_REPOSITORY', '')}/pages/builds"],
                               check=False, capture_output=True, timeout=30)
            except Exception:
                pass
        time.sleep(10)
    kq['giay'] = int(time.time() - bat_dau)
    json.dump(kq, open(kq_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('web khớp' if kq['web'] else 'web CHƯA khớp sau ' + str(kq['giay']) + 's')


def bao(kq_path, ap, day, dai, web):
    try:
        kq = json.load(open(kq_path, encoding='utf-8'))
    except Exception:
        kq = {'ok': False, 'loi': 'không đọc được yêu cầu'}
    ten, key = kq.get('ten') or 'thiệp mẫu', kq.get('key') or ''
    link = WEB + 'thiep-mau.html?m=' + key if key else WEB + 'thiep-cuoi-online.html'
    dong = '\n'.join('- ' + d for d in kq.get('dong') or [])
    if not kq.get('ok'):
        print(f"❌ Chưa lưu được thiệp mẫu **{ten}**: {kq.get('loi') or 'lỗi kiểm tra dữ liệu'}.\n\n"
              'Thiệp trên web **chưa thay đổi**. Anh mở lại bảng sửa, chỉnh lại rồi bấm Lưu lần nữa — hoặc nhắn Claude kiểm tra giúp.')
        return
    if kq.get('khong_doi'):
        print(f'✅ Thiệp mẫu **{ten}** đã giống hệt yêu cầu — không cần sửa gì.\n\nXem: {link}')
        return
    if day != 'success':
        print(f'❌ Đã kiểm xong nhưng **chưa đẩy được lên web** (lỗi lúc lưu vào kho). Anh bấm Lưu lại sau ít phút — hoặc nhắn Claude.\n\n{dong}')
        return
    dai_txt = {'success': 'Ảnh mẫu ở trang bán thiệp: đã chụp lại theo bản mới.',
               'skipped': 'Ảnh mẫu ở trang bán thiệp: không cần chụp lại.'}.get(dai, 'Ảnh mẫu ở trang bán thiệp: chưa chụp lại được (thiệp vẫn đã đổi) — nhắn Claude chụp lại giúp.')
    web_txt = 'Web đã đổi.' if kq.get('web') or web == 'true' else 'Đã lưu — GitHub Pages đang cập nhật, vài phút nữa mở lại sẽ thấy.'
    luu_y = ('\n\n⚠️ ' + kq['luu_y']) if kq.get('luu_y') else ''
    print(f'✅ Đã cập nhật thiệp mẫu **{ten}**. {web_txt}\n\n{dong}\n\nXem: {link}\n\n{dai_txt}{luu_y}\n\n'
          '_(Điện thoại đang mở sẵn thiệp thì tải lại trang.)_')


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['ap-dung'] and len(a) == 3:
        ap_dung(a[1], a[2])
    elif a[:1] == ['cho-web'] and len(a) == 2:
        cho_web(a[1])
    elif a[:1] == ['bao'] and len(a) == 6:
        bao(*a[1:])
    else:
        print(__doc__)
        sys.exit(2)
