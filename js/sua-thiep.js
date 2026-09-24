/* =============================================================================
   BẢNG SỬA ẢNH ẨN — thiệp mẫu Phạm Đức Studio (chỉ tải khi mở thiep-mau.html?m=<mẫu>&sua=1,
   hoặc chạm logo cuối thiệp 5 lần liền). Khách xem thiệp bình thường không tải file này.

   Làm được: chạm ảnh bất kỳ (bìa · ảnh dâu rể · ảnh câu chuyện · ảnh clip) → chọn ảnh khác trong bộ
   (ảnh đang dùng ở ô khác thì tự đổi chỗ, không bao giờ lặp ảnh) · kéo ảnh để canh khung · đổi thứ tự /
   bỏ / thêm ảnh câu chuyện · sửa tên dâu rể · đổi cả bộ ảnh · hoàn tác · xem thử như khách · về bản gốc.
   Nháp tự giữ trong trình duyệt (localStorage) — đóng trang mở lại vẫn còn.

   Lưu lên web: mở trang GitHub "New issue" điền sẵn → anh bấm Create → GitHub Actions
   (.github/workflows/sua-thiep.yml + .github/sua-thiep/ap_dung.py, chup_dai_anh.py) kiểm tra dữ liệu, sửa thiep-mau.html, chụp lại
   dải ảnh ở trang bán, commit → web tự đổi sau 1–3 phút. Chỉ issue của tài khoản chủ repo mới được áp dụng.
   Trang này tự theo dõi (GitHub API công khai + tải lại thiệp) và báo khi web đã đổi.

   THIỆP RIÊNG từng cặp (thiep/<mã>/?k=…&sua=1, xem .github/thiep/tao_thiep.py): cùng bảng này + tab "Thông tin" (tên, lịch
   lễ, địa điểm, cha mẹ, SĐT, tài khoản mừng cưới, clip, lời ngỏ, nhạc). Khi lưu: phần công khai (tên, ngày, bố cục ảnh, nhạc)
   gửi dạng thường để GitHub kiểm; phần riêng MÃ HOÁ ngay trên máy bằng khoá trong link → issue GitHub (công khai) chỉ thấy
   chuỗi mã hoá. Bot kiểm "base" (mã băm bản đang chạy) để không ghi đè lần sửa mới hơn.

   Tab "Hiệu ứng & phần" (cả thiệp mẫu lẫn thiệp riêng): bật/tắt hiệu ứng (hoa rơi, hiện dần, phóng ảnh bìa, phong bì, lời chúc
   bay), ẩn/hiện từng phần (lời ngỏ, thơ, lịch, đếm ngược, bản đồ, RSVP, QR, lời chúc, thanh dưới, dòng giới thiệu studio), sửa
   tiêu đề từng khối, 4 bài thơ, "Lưu ý cho khách". Dữ liệu: tuy {tat, bat, td} (công khai) · tho {1..4} + ghi_them (thiệp riêng:
   nằm trong phần mã hoá). Thiệp vẽ theo renderTuy() trong thiep-mau.html; bot kiểm bằng thiep_chung.sach_tuy/sach_tho.

   Nhạc nền (thiệp riêng: tab Thông tin · thiệp mẫu: tab Tên & bộ ảnh): 3 bài có sẵn + kho nhạc studio (list.json của repo
   nhac-thiep), Nghe thử, "Thêm bài mới" → trang tải lên GitHub của kho (thiệp riêng → tai-len/rieng, thiệp mẫu → tai-len) →
   bảng sửa theo dõi list.json, bài mới vào kho là tự chọn cho thiệp. Mã bài kho: d:<mã>.
   ========================================================================== */
(function(){
  'use strict';
  var SUA = window.__SUA__;
  if (!SUA || window.__SUA_ON__) return;
  window.__SUA_ON__ = true;

  var REPO = 'phamducstudio-creator/phamducstudio-web', OWNER = 'phamducstudio-creator';
  var THIEP = !!SUA.thiep;                              /* thiệp riêng từng cặp */
  var MA = window.__THIEP_MA__ || null;                 /* mã hoá (hàm trong thiep-mau.html) */
  var MAU = SUA.mau || [], M = null, KEY = '', LS_KEY = '';
  var E = null, DAY = null, RIENG0 = null, KHOA = null, K_LINK = '', HASH = '';   /* THIEP: khối trên web · dữ liệu đầy đủ · phần riêng · khoá · băm bản đang chạy */
  var ANH_F = ['bia', 'bia_pos', 'anh_cr', 'anh_cd', 'anh_ds', 'poster', 'poster_pos', 'pos'];
  var RIENG = ['sdt_cd', 'sdt_cr', 'cha_cr', 'me_cr', 'cha_cd', 'me_cd', 'ban_do', 'vietqr_bank', 'vietqr_stk', 'vietqr_ten', 'youtube_id', 'loi_ngo', 'cau_chuyen'];
  var PUB_SUA = ['ten_cr', 'ten_cd'].concat(ANH_F, ['nhac', 'tuy']);          /* THIEP: phần công khai bot kiểm */
  var RIENG_THEM = ['tho', 'ghi_them'];                                         /* THIEP: thơ + lưu ý cho khách — mã hoá cùng phần riêng */
  var FIELDS = THIEP ? PUB_SUA.concat(RIENG, ['le'], RIENG_THEM) : ['album', 'ten_cr', 'ten_cd'].concat(ANH_F, ['tuy'], RIENG_THEM, ['nhac']);
  var FIELDS_GOC = THIEP ? ['ten_cr', 'ten_cd'].concat(ANH_F) : ['album', 'ten_cr', 'ten_cd'].concat(ANH_F);   /* "Về bản gốc": chỉ tên + ảnh */
  var LE = [['vu_quy', 'Lễ Vu Quy'], ['thanh_hon', 'Lễ Thành Hôn'], ['tiec', 'Tiệc cưới']];
  /* Hiệu ứng & phần — khoá giống renderTuy() (thiep-mau.html) và thiep_chung.TUY_* (bot); xếp theo thứ tự trên thiệp */
  var HIEU_UNG = [['hoa', 'Cánh hoa rơi'], ['hien', 'Hiện dần khi cuộn'], ['kb', 'Ảnh bìa phóng chậm'], ['phong_bi', 'Phong bì — chạm để mở thiệp'], ['bay', 'Lời chúc bay lên màn hình']];
  var PHAN = [['loi_ngo', 'Lời ngỏ (dưới tên dâu rể)'], ['cau_chuyen', 'Câu chuyện (trên ảnh dâu rể)'], ['tho1', 'Thơ ở khối 3 ảnh ghép'],
    ['tho2', 'Thơ dưới ảnh tràn khung'], ['tho3', 'Câu trích ở khối 2 ảnh nổi'], ['lich', 'Lịch tháng cưới'], ['dem', 'Đồng hồ đếm ngược'],
    ['luu_lich', 'Nút “Lưu ngày cưới vào lịch”'], ['ban_do', 'Bản đồ Google Maps'], ['tho4', 'Thơ ở khối cặp ảnh cuối'], ['rsvp', 'Xác nhận tham dự (RSVP)'],
    ['qr', 'Mừng cưới qua mã QR'], ['chuc', 'Lời chúc (khối + nút gửi)'], ['thanh', 'Thanh nút dưới đáy (lời chúc · tim · mừng cưới)'],
    ['quang_cao', 'Dòng giới thiệu studio cuối thiệp']];
  var CONG_TAC = HIEU_UNG.concat(PHAN);
  var TAT_OK = CONG_TAC.map(function(x){ return x[0]; }), BAT_OK = ['phong_bi'];
  var TIEU_DE = [['story', 'Khối ảnh dâu rể', 'Our Story'], ['love1', 'Khối 3 ảnh ghép', 'love you'], ['film', 'Khối clip', 'Our Film'],
    ['time', 'Khối ngày cưới', 'Wedding Time'], ['address', 'Khối địa điểm', 'Address'], ['love2', 'Khối cặp ảnh cuối', 'love you'],
    ['album', 'Khối lưới album', 'Khoảnh khắc của chúng mình'], ['rsvp', 'Khối xác nhận', 'RSVP'], ['withlove', 'Khối mừng cưới', 'With Love'],
    ['welcome', 'Khối lời chúc', 'Welcome'], ['thanks', 'Cuối thiệp', 'Thank you'], ['ghi', 'Khung lưu ý', 'Lưu ý cho khách']];
  var TD_OK = {}; TIEU_DE.forEach(function(x){ TD_OK[x[0]] = x; });
  var THO = [['1', 'Thơ khối 3 ảnh ghép'], ['2', 'Thơ dưới ảnh tràn khung'], ['3', 'Câu trích khối 2 ảnh nổi'], ['4', 'Thơ khối cặp ảnh cuối']];
  var KHOI_THO = { 1: 'col3Sec', 2: 'bleedSec', 3: 'ovSec', 4: 'off2Sec' };
  /* ảnh gốc của bìa từng bộ (album-<x>-bia.jpg cắt từ ảnh này) — ô bìa mặc định mang số này, không đưa lại vào thân thiệp */
  var BIA_GOC = {
    'ngoai-canh-13': '01', 'ngoai-canh-14': '07', 'ngoai-canh-15': '07', 'ngoai-canh-16': '07', 'ngoai-canh-17': '07',
    'ngoai-canh-18': '07', 'ngoai-canh-19': '06', 'ngoai-canh-20': '02', 'ngoai-canh-21': '08', 'ngoai-canh-22': '02',
    'ngoai-canh-23': '07', 'ngoai-canh-24': '09', 'ngoai-canh-25': '09', 'ngoai-canh-26': '04', 'ngoai-canh-27': '09',
    'ngoai-canh-28': '07', 'ngoai-canh-29': '06', 'ngoai-canh-30': '03', 'ngoai-canh-31': '03', 'ngoai-canh-32': '04',
    'studio-13': '06', 'studio-14': '05', 'studio-15': '05', 'studio-16': '10', 'studio-17': '04', 'studio-18': '07',
    'studio-19': '08', 'studio-20': '08', 'studio-21': '02'
  };

  /* ---------------- tiện ích ---------------- */
  var $ = function(s, r){ return (r || document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o){ return JSON.parse(JSON.stringify(o)); }
  function jeq(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  function lsGet(){ try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { return null; } }
  function lsSet(v){ try { if (v) localStorage.setItem(LS_KEY, JSON.stringify(v)); else localStorage.removeItem(LS_KEY); } catch (e) {} }
  function rong(){ return window.matchMedia && matchMedia('(min-width:1000px)').matches; }
  function anh(album, n, nho){ return (THIEP ? '/thiep/' + KEY + '/' : '/images/album-' + album + '-') + n + (nho ? '-800' : '') + '.jpg'; }

  /* các trường sửa được, dạng làm việc (anh_ds là mảng). prune = bỏ canh khung của ảnh không còn dùng */
  function norm(x, prune){
    x = x || {};
    var o = {
      album: String(x.album || ''), ten_cr: String(x.ten_cr || ''), ten_cd: String(x.ten_cd || ''),
      bia: String(x.bia || ''), bia_pos: String(x.bia_pos || ''),
      anh_cr: String(x.anh_cr || ''), anh_cd: String(x.anh_cd || ''),
      anh_ds: (Array.isArray(x.anh_ds) ? x.anh_ds : String(x.anh_ds || '').split(',')).map(function(s){ return String(s).trim(); }).filter(Boolean),
      poster: String(x.poster || ''), poster_pos: String(x.poster_pos || ''), pos: {}
    };
    var dung = {}; [o.anh_cr, o.anh_cd].concat(o.anh_ds).forEach(function(n){ if (n) dung[n] = 1; });
    Object.keys(x.pos || {}).sort().forEach(function(n){ if (x.pos[n] && (!prune || dung[n])) o.pos[n] = String(x.pos[n]); });
    o.tuy = gonTuy(x.tuy); o.tho = gonTho(x.tho); o.ghi_them = String(x.ghi_them == null ? '' : x.ghi_them);
    o.nhac = String(x.nhac || '').trim();
    if (THIEP) {
      RIENG.forEach(function(k){ o[k] = String(x[k] == null ? '' : x[k]); });
      o.le = normLe(x.le);
    }
    return o;
  }
  /* dạng gọn chuẩn của "Hiệu ứng & phần" — GIỐNG HỆT thiep_chung.sach_tuy() của bot (bỏ phần rỗng, xếp a→z) để so khớp được */
  function locKhoa(ds, cho){ var s = {}; (Array.isArray(ds) ? ds : []).forEach(function(k){ if (cho.indexOf(k) >= 0) s[k] = 1; }); return Object.keys(s).sort(); }
  function gonTuy(t){
    t = (t && typeof t === 'object' && !Array.isArray(t)) ? t : {};
    var o = {}, tat = locKhoa(t.tat, TAT_OK), bat = locKhoa(t.bat, BAT_OK), td = {}, n = 0;
    if (tat.indexOf('phong_bi') >= 0) bat = bat.filter(function(k){ return k !== 'phong_bi'; });
    var src = (t.td && typeof t.td === 'object') ? t.td : {};
    Object.keys(src).sort().forEach(function(k){ var v = sachChu(src[k], false, 40); if (v && TD_OK[k]) { td[k] = v; n++; } });
    if (tat.length) o.tat = tat;
    if (bat.length) o.bat = bat;
    if (n) o.td = td;
    return o;
  }
  function gonTho(t){
    t = (t && typeof t === 'object' && !Array.isArray(t)) ? t : {};
    var o = {};
    THO.forEach(function(x){ var v = sachChu(t[x[0]], true, 200); if (v) o[x[0]] = v; });
    return o;
  }
  function co(ds, k){ return (ds || []).indexOf(k) >= 0; }
  function kieuThiep(){
    var st = String((THIEP ? (DAY && DAY.phong_cach) : (M && M.style)) || '').trim();
    return st === 'sang-trong' ? 'thanh-lich' : st;
  }
  function phongBiMacDinh(){ return kieuThiep() === 'song-hy' || String(((THIEP ? DAY : M) || {}).phong_bi || '').trim() === '1'; }
  /* công tắc k có BẬT không (phong bì: mặc định theo kiểu thiệp, bật/tắt thêm; còn lại: mặc định bật) */
  function batGoc(o, k){
    var t = (o && o.tuy) || {};
    if (k === 'phong_bi') return (phongBiMacDinh() && !co(t.tat, k)) || co(t.bat, k);
    return !co(t.tat, k);
  }
  function datCongTac(o, k, bat){
    var t = clone(o.tuy || {});
    t.tat = (t.tat || []).filter(function(x){ return x !== k; });
    t.bat = (t.bat || []).filter(function(x){ return x !== k; });
    if (k === 'phong_bi') { var md = phongBiMacDinh(); if (bat && !md) t.bat.push(k); if (!bat && md) t.tat.push(k); }
    else if (!bat) t.tat.push(k);
    o.tuy = gonTuy(t);
  }
  function normLe(le){
    le = le || {}; var o = {};
    LE.forEach(function(x){ var e = le[x[0]] || {}; o[x[0]] = { ngay: String(e.ngay || ''), gio: String(e.gio || ''), noi: String(e.noi || ''), ghi: String(e.ghi || '') }; });
    return o;
  }
  function ngayCuoi(le){ le = le || {}; return (le.tiec && le.tiec.ngay) || (le.thanh_hon && le.thanh_hon.ngay) || (le.vu_quy && le.vu_quy.ngay) || ''; }
  /* dạng lưu trong thiep-mau.html (anh_ds là chuỗi "08,09,…") */
  function toData(o){
    var p = norm(o, true);
    var d = { album: p.album, ten_cr: p.ten_cr, ten_cd: p.ten_cd, bia: p.bia, bia_pos: p.bia_pos, anh_cr: p.anh_cr, anh_cd: p.anh_cd,
      anh_ds: p.anh_ds.join(','), poster: p.poster, poster_pos: p.poster_pos, pos: p.pos, tuy: p.tuy, tho: p.tho, ghi_them: p.ghi_them, nhac: p.nhac };
    if (THIEP) { RIENG.forEach(function(k){ d[k] = p[k]; }); d.le = p.le; }
    return d;
  }
  function thayDoi(a, b){   /* các trường khác nhau giữa 2 bản (theo dạng lưu) */
    var A = toData(a), B = toData(b), s = {};
    FIELDS.forEach(function(k){ if (!jeq(A[k], B[k])) s[k] = B[k]; });
    return s;
  }
  /* nháp làm trên bản cũ mà web vừa đổi (Claude hoặc máy khác sửa): giữ phần anh sửa, phần còn lại theo bản mới */
  function rebase(base, nhap, moi){
    var B = norm(base), N = norm(nhap), L = norm(moi), o = clone(L);
    FIELDS.forEach(function(k){
      if (k === 'pos') return;
      if (!jeq(B[k], N[k])) o[k] = clone(N[k]);
    });
    var ks = {}; [B.pos, N.pos, L.pos].forEach(function(p){ Object.keys(p).forEach(function(n){ ks[n] = 1; }); });
    o.pos = {};
    Object.keys(ks).forEach(function(n){
      var v = (B.pos[n] !== N.pos[n]) ? N.pos[n] : L.pos[n];
      if (v) o.pos[n] = v;
    });
    return o;
  }

  /* ---------------- trạng thái (khởi tạo khi thiệp đã vẽ xong — thiệp riêng phải giải mã trước) ---------------- */
  var live = null;                                     /* bản đang chạy trên web (lúc mở trang) */
  var goc = null;                                      /* bản studio dựng ban đầu (nút "Về bản gốc") */
  var draft = null;
  var undoStack = [];
  var pending = null;                                  /* {id, t, set, url} (+ ct, moi ở thiệp riêng) — lần lưu đang chờ web đổi */
  var cheDo = 'sua';                                   /* 'sua' | 'xem' (xem như khách) */
  var sheetId = '', sheetSlot = '', tab = 'doi', tabInfo = 'chinh', ghNgung = false, ghDem = 0;
  var albumCache = {}, dsBo = null, vuaXong = false;

  function khoiTao(){
    if (THIEP) {
      E = window.__THIEP_ENC__; DAY = window.__THIEP_GOC__; RIENG0 = window.__THIEP_RIENG__ || {};
      var kk = window.__THIEP_KHOA__ || {}; KHOA = kk.key || null; K_LINK = kk.k || '';
      KEY = E.id; M = DAY; LS_KEY = 'pds-sua-thiep:t:' + KEY;
      bam(E.ct).then(function(h){ HASH = h; }).catch(function(){});
    } else {
      M = MAU[SUA.i]; KEY = M.key; LS_KEY = 'pds-sua-thiep:' + KEY;
    }
    live = norm(M); goc = M.goc ? norm(M.goc) : null; draft = clone(live);
    napNhap();
  }
  function napNhap(){
    var s = lsGet();
    if (!s || s.v !== 1) return;
    if (s.pending && (s.pending.set || s.pending.ct)) {
      var xong = khopWeb(THIEP ? E : M, s.pending);
      if (xong) setTimeout(function(){ toast('✅ Lần lưu trước đã lên web'); }, 600);
      else if (Date.now() - s.pending.t < 30 * 60e3) pending = s.pending;
    }
    if (s.draft) {
      var baseCu = s.base ? norm(s.base) : live;
      draft = jeq(toData(baseCu), toData(live)) ? norm(s.draft) : rebase(baseCu, s.draft, live);
    }
  }
  function luuNhap(){
    var coDoi = Object.keys(thayDoi(live, draft)).length > 0;
    lsSet((coDoi || pending) ? { v: 1, base: toData(live), draft: draft, t: Date.now(), pending: pending } : null);
  }
  /* web đã có lần lưu p chưa: thiệp mẫu so các trường đã gửi; thiệp riêng so phần công khai + chuỗi mã hoá */
  function khopWeb(rec, p){
    var set = p.set || {};
    if (THIEP) {
      var pub = (rec && rec.pub) || {};
      return Object.keys(set).every(function(k){ return jeq(chuanPub(k, pub[k]), chuanPub(k, set[k])); }) && (!p.ct || rec.ct === p.ct);
    }
    var L = toData(norm(rec));
    return Object.keys(set).every(function(k){ return jeq(L[k], set[k]); });
  }
  function chuanPub(k, v){ return k === 'tuy' ? gonTuy(v) : (v == null ? '' : v); }   /* bot bỏ hẳn "tuy" khi rỗng */
  function bam(s){   /* 16 ký tự hex đầu của SHA-256 (giống bot: hashlib.sha256(ct).hexdigest()[:16]) */
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s))).then(function(b){
      var u = new Uint8Array(b), h = ''; for (var i = 0; i < 8; i++) h += ('0' + u[i].toString(16)).slice(-2); return h;
    });
  }
  function veGoc(o){ var g = clone(o); FIELDS_GOC.forEach(function(k){ g[k] = clone(goc[k]); }); return g; }

  /* ---------------- ô ảnh ---------------- */
  function biaGoc(album){ return THIEP ? '' : (BIA_GOC[album] || ''); }
  function soO(o, id){
    if (id === 'bia') return o.bia || biaGoc(o.album);
    if (id === 'cr') return o.anh_cr;
    if (id === 'cd') return o.anh_cd;
    if (id === 'poster') return o.poster;
    if (id.indexOf('ds:') === 0) return o.anh_ds[+id.slice(3)] || '';
    return '';
  }
  function datO(o, id, n){
    if (id === 'bia') {
      var moi = (n === biaGoc(o.album)) ? '' : n;
      if (moi !== o.bia) { o.bia = moi; o.bia_pos = (moi === live.bia && o.album === live.album) ? live.bia_pos : ''; }
    }
    else if (id === 'cr') o.anh_cr = n;
    else if (id === 'cd') o.anh_cd = n;
    else if (id === 'poster') {
      if (n !== o.poster) { o.poster = n; o.poster_pos = (n === live.poster && o.album === live.album) ? live.poster_pos : ''; }
    }
    else if (id.indexOf('ds:') === 0) o.anh_ds[+id.slice(3)] = n;
  }
  function cacO(o){ var s = ['bia', 'cr', 'cd']; o.anh_ds.forEach(function(_, k){ s.push('ds:' + k); }); s.push('poster'); return s; }
  function aiDung(o, n, tru){ return cacO(o).filter(function(id){ return id !== tru && n && soO(o, id) === n; }); }
  function nhanDs(N){
    var L = [], k = 0;
    if (N - k >= 3) { L.push('Ghép 3 ảnh · ảnh dọc lớn', 'Ghép 3 ảnh · ảnh ngang', 'Ghép 3 ảnh · ảnh dọc'); k += 3; }
    if (N - k >= 1) { L.push('Ảnh tràn khung'); k += 1; }
    if (N - k >= 2) { L.push('2 ảnh nổi · ảnh 1', '2 ảnh nổi · ảnh 2'); k += 2; }
    if (N - k >= 2) { L.push('Cặp ảnh cuối · ảnh 1', 'Cặp ảnh cuối · ảnh 2'); k += 2; }
    else if (N - k === 1) { L.push('Ảnh cuối (love you)'); k += 1; }
    var g = 1; while (k < N) { L.push('Lưới album · ảnh ' + (g++)); k++; }
    return L;
  }
  function tenO(id, o){
    o = o || draft;
    if (id === 'bia') return 'Ảnh bìa';
    if (id === 'cr') return 'Ảnh chú rể';
    if (id === 'cd') return 'Ảnh cô dâu';
    if (id === 'poster') return 'Ảnh khung clip';
    if (id.indexOf('ds:') === 0) return nhanDs(o.anh_ds.length)[+id.slice(3)] || 'Ảnh câu chuyện';
    return id;
  }
  function tenNgan(id){
    if (id === 'bia') return 'Bìa';
    if (id === 'cr') return 'Rể';
    if (id === 'cd') return 'Dâu';
    if (id === 'poster') return 'Clip';
    if (id.indexOf('ds:') === 0) return 'Ô ' + (+id.slice(3) + 1);
    return id;
  }
  function slotEl(id){
    if (id === 'bia') return $('.cover');
    if (id === 'poster') return $('#videoBox');
    return $('.ph[data-slot="' + id + '"]');
  }
  function slotImg(id){
    if (id === 'bia') return $('#coverImg');
    if (id === 'poster') return $('#videoBox img');
    var e = slotEl(id); return e ? e.querySelector('img') : null;
  }
  function posCua(o, id){
    if (id === 'bia') return o.bia_pos;
    if (id === 'poster') return o.poster_pos;
    return o.pos[soO(o, id)] || '';
  }
  function datPos(o, id, v){
    if (id === 'bia') o.bia_pos = v;
    else if (id === 'poster') o.poster_pos = v;
    else { var n = soO(o, id); if (!n) return; if (v) o.pos[n] = v; else delete o.pos[n]; }
  }
  function srcO(o, id){
    var n = soO(o, id);
    if (id === 'bia') return o.bia ? anh(o.album, o.bia) : '/images/album-' + o.album + '-bia.jpg';
    return n ? anh(o.album, n, true) : '';
  }

  /* ---------------- vẽ lại thiệp theo nháp ---------------- */
  /* THIEP: toàn bộ dữ liệu thiệp sau khi áp nháp (để vẽ lại và để mã hoá khi lưu) */
  function duLieuDay(){
    var d = clone(DAY), x = toData(draft);
    FIELDS.forEach(function(k){ d[k] = clone(x[k]); });
    return MA.tinhToan(d);
  }
  function duLieuTrang(){
    var T = window.__THIEP__, d = {}, k;
    for (k in T.d) d[k] = T.d[k];
    var x = norm(draft);
    d.album = x.album; d.ten_cr = x.ten_cr; d.ten_cd = x.ten_cd; d.bia = x.bia; d.bia_pos = x.bia_pos;
    d.anh_cr = x.anh_cr; d.anh_cd = x.anh_cd; d.anh_ds = x.anh_ds.join(','); d.poster = x.poster; d.poster_pos = x.poster_pos; d.pos = x.pos;
    d.tuy = x.tuy; d.tho = x.tho; d.ghi_them = x.ghi_them;
    return d;
  }
  function duLieuHienTai(){ var T = window.__THIEP__ || {}, h = THIEP ? duLieuDay() : duLieuTrang(); if (THIEP && T.d && T.d.guest) h.guest = T.d.guest; return h; }
  function veLai(){
    var T = window.__THIEP__; if (!T) return;
    if (THIEP) {
      var h = duLieuDay(); h.nhac = 'khong'; h.slug = KEY; if (T.d && T.d.guest) h.guest = T.d.guest;
      if (T.datD) T.datD(h);
      T.ngay(h); T.giaDinh(h); T.goi(h); T.suKien(h); T.qr(h); T.video(h);
      T.bia(h); T.ten(h); T.anh(h); T.clip(h);
      if (T.tuy) T.tuy(h);
    } else {
      var d = duLieuTrang();
      T.bia(d); T.ten(d); T.anh(d); T.clip(d);
      if (T.tuy) T.tuy(d);
    }
    $$('.rv').forEach(function(e){ e.classList.add('in'); });
    danhDau();
    capNhatThanh();
  }
  function danhDau(){
    $$('.sua-dang').forEach(function(e){ e.classList.remove('sua-dang'); });
    if (sheetId === 'o' && sheetSlot) { var e = slotEl(sheetSlot); if (e) e.classList.add('sua-dang'); }
  }
  function doi(fn, giuSheet){
    undoStack.push(JSON.stringify(draft)); if (undoStack.length > 60) undoStack.shift();
    fn(draft);
    luuNhap(); veLai();
    if (!giuSheet && sheetId) veSheet();
  }
  function hoanTac(){
    if (!undoStack.length) { toast('Chưa có gì để hoàn tác'); return; }
    draft = JSON.parse(undoStack.pop());
    luuNhap(); veLai();
    if (sheetId === 'o' && sheetSlot && !slotEl(sheetSlot)) dongSheet(); else if (sheetId) veSheet();
    toast('Đã hoàn tác');
  }

  /* ---------------- dữ liệu bộ ảnh (đọc từ trang album) ---------------- */
  function taiBo(album){
    if (THIEP) return Promise.resolve({ album: '', ds: (DAY.anh_co || []).map(function(x){ return { n: String(x.n), r: +x.r || 0 }; }), ten: 'Ảnh của hai bạn', cap: '' });
    if (albumCache[album]) return Promise.resolve(albumCache[album]);
    return fetch('/album-' + album + '.html', { cache: 'no-cache' }).then(function(r){ if (!r.ok) throw new Error('http ' + r.status); return r.text(); }).then(function(t){
      var doc = new DOMParser().parseFromString(t, 'text/html');
      var re = new RegExp('album-' + album.replace(/[-]/g, '\\-') + '-(\\d+)\\.jpg$'), ds = [], co = {};
      $$('a.pj[href]', doc).forEach(function(a){
        var m = re.exec(a.getAttribute('href') || ''); if (!m || co[m[1]]) return;
        co[m[1]] = 1; ds.push({ n: m[1], r: parseFloat(a.getAttribute('data-r')) || 0 });
      });
      var h1 = $('h1', doc), p = h1 && h1.parentElement ? $('p', h1.parentElement) : null;
      var cap = p ? p.textContent.split('—')[0].trim() : '';
      var info = { album: album, ds: ds, ten: h1 ? h1.textContent.trim() : album, cap: cap };
      albumCache[album] = info; return info;
    });
  }
  function taiDanhSachBo(){
    if (dsBo) return Promise.resolve(dsBo);
    if (THIEP) return Promise.resolve([]);
    return Promise.all(['/album-studio.html', '/album-ngoai-canh.html'].map(function(u){
      return fetch(u, { cache: 'no-cache' }).then(function(r){ return r.ok ? r.text() : ''; }).catch(function(){ return ''; });
    })).then(function(ts){
      var out = [];
      ts.forEach(function(t, gi){
        if (!t) return;
        var doc = new DOMParser().parseFromString(t, 'text/html');
        $$('a.prod-card[href]', doc).forEach(function(a){
          var m = /^album-((?:studio|ngoai-canh)-\d+)\.html$/.exec(a.getAttribute('href') || ''); if (!m) return;
          var tag = $('.tag', a), h4 = $('h4', a), c = $('.am-count', a);
          out.push({ album: m[1], nhom: gi ? 'Ngoại cảnh' : 'Studio', tag: tag ? tag.textContent.trim() : m[1], cap: h4 ? h4.textContent.trim() : '', so: c ? c.textContent.trim() : '' });
        });
      });
      dsBo = out; return out;
    });
  }
  function maBo(album){
    var m = /^(studio|ngoai-canh)-(\d+)$/.exec(album || '');
    return m ? ((m[1] === 'studio' ? 'ST' : 'NC') + m[2]) : album;
  }
  function tenBo(album){
    if (THIEP) return 'Bộ ảnh của ' + (draft ? draft.ten_cd + ' & ' + draft.ten_cr : 'hai bạn') + ' · ' + ((DAY && DAY.anh_co) || []).length + ' ảnh';
    var b = albumCache[album];
    if (b) return maBo(album) + ' · ' + b.ten + (b.cap ? ' (' + b.cap + ')' : '');
    if (dsBo) { var x = dsBo.filter(function(y){ return y.album === album; })[0]; if (x) return maBo(album) + ' · ' + x.tag + (x.cap ? ' (' + x.cap + ')' : ''); }
    return maBo(album);
  }

  /* ---------------- tóm tắt thay đổi ---------------- */
  var NHAN_RIENG = { sdt_cr: 'Số điện thoại chú rể', sdt_cd: 'Số điện thoại cô dâu', cha_cr: 'Tên cha chú rể', me_cr: 'Tên mẹ chú rể',
    cha_cd: 'Tên cha cô dâu', me_cd: 'Tên mẹ cô dâu', ban_do: 'Địa chỉ bản đồ', vietqr_bank: 'Ngân hàng mừng cưới', vietqr_stk: 'Số tài khoản mừng cưới',
    vietqr_ten: 'Chủ tài khoản mừng cưới', youtube_id: 'Clip YouTube', loi_ngo: 'Lời ngỏ', cau_chuyen: 'Câu chuyện' };
  function ngan(s){ s = String(s || '').replace(/\s+/g, ' ').trim(); return s ? (s.length > 42 ? s.slice(0, 40) + '…' : s) : '—'; }
  /* Hiệu ứng & phần: công tắc + tiêu đề (công khai) · thơ + lưu ý (thiệp riêng: chỉ ghi chung chung ở issue công khai) */
  function dongTuy(A, B, congKhai){
    var L = [], tat = [], bat = [];
    if (!jeq(A.tuy, B.tuy)) {
      CONG_TAC.forEach(function(x){ var a = batGoc(A, x[0]), b = batGoc(B, x[0]); if (a && !b) tat.push(x[1]); else if (!a && b) bat.push(x[1]); });
      if (tat.length) L.push('Tắt: ' + tat.join(' · '));
      if (bat.length) L.push('Bật: ' + bat.join(' · '));
      var ta = A.tuy.td || {}, tb = B.tuy.td || {};
      TIEU_DE.forEach(function(x){
        var p = ta[x[0]] || '', q = tb[x[0]] || '';
        if (p !== q) L.push('Tiêu đề ' + x[1].toLowerCase() + ': ' + (p || x[2]) + ' → ' + (q || x[2] + ' (mặc định)'));
      });
    }
    THO.forEach(function(x){
      var p = A.tho[x[0]] || '', q = B.tho[x[0]] || '';
      if (p !== q) L.push(congKhai ? ('Sửa ' + x[1].toLowerCase()) : (x[1] + ': ' + ngan(p || 'câu mặc định') + ' → ' + ngan(q || 'câu mặc định')));
    });
    if (A.ghi_them !== B.ghi_them) L.push(congKhai ? 'Sửa lưu ý cho khách' : ('Lưu ý cho khách: ' + ngan(A.ghi_them) + ' → ' + ngan(B.ghi_them)));
    return L;
  }
  function dongThayDoi(a, b, congKhai){
    var A = norm(a, true), B = norm(b, true), L = [];
    if (A.ten_cr !== B.ten_cr) L.push('Tên chú rể: ' + A.ten_cr + ' → ' + B.ten_cr);
    if (A.ten_cd !== B.ten_cd) L.push('Tên cô dâu: ' + A.ten_cd + ' → ' + B.ten_cd);
    if (A.album !== B.album) {   /* đổi cả bộ: số ảnh 2 bộ không so với nhau được */
      L.unshift('Bộ ảnh: ' + tenBo(A.album) + ' → ' + tenBo(B.album));
      L.push('Ảnh chọn lại theo bộ mới — bìa ' + (B.bia || 'gốc') + ' · rể ' + B.anh_cr + ' · dâu ' + B.anh_cd + ' · câu chuyện ' + (B.anh_ds.join(' ') || '—') + ' · clip ' + B.poster);
      if (A.nhac !== B.nhac) L.push('Nhạc nền: ' + tenNhac(A.nhac) + ' → ' + tenNhac(B.nhac));
      return L.concat(dongTuy(A, B, congKhai));
    }
    var bA = A.bia || ('bìa gốc'), bB = B.bia || ('bìa gốc');
    if (A.bia !== B.bia || A.album !== B.album) { if (A.bia || B.bia) L.push('Ảnh bìa: ' + bA + ' → ' + bB); }
    if (A.bia_pos !== B.bia_pos && A.bia === B.bia && A.album === B.album) L.push('Canh khung ảnh bìa');
    if (A.anh_cr !== B.anh_cr) L.push('Ảnh chú rể: ' + A.anh_cr + ' → ' + B.anh_cr);
    if (A.anh_cd !== B.anh_cd) L.push('Ảnh cô dâu: ' + A.anh_cd + ' → ' + B.anh_cd);
    if (A.anh_ds.join(',') !== B.anh_ds.join(',')) L.push('Ảnh câu chuyện: ' + (A.anh_ds.join(' ') || '—') + ' → ' + (B.anh_ds.join(' ') || '—'));
    if (A.poster !== B.poster) L.push('Ảnh khung clip: ' + A.poster + ' → ' + B.poster);
    if (A.poster_pos !== B.poster_pos && A.poster === B.poster && A.album === B.album) L.push('Canh khung ảnh clip');
    var ks = {}, doiPos = [];
    Object.keys(A.pos).concat(Object.keys(B.pos)).forEach(function(n){ ks[n] = 1; });
    var trongB = {}; [B.anh_cr, B.anh_cd].concat(B.anh_ds).forEach(function(n){ if (n) trongB[n] = 1; });
    Object.keys(ks).sort().forEach(function(n){ if (trongB[n] && (A.pos[n] || '') !== (B.pos[n] || '') && B.album === A.album) doiPos.push(n); });
    if (doiPos.length) L.push('Canh khung: ảnh ' + doiPos.join(', '));
    if (A.nhac !== B.nhac) L.push('Nhạc nền: ' + tenNhac(A.nhac) + ' → ' + tenNhac(B.nhac));
    if (THIEP) {
      LE.forEach(function(x){
        var p = A.le[x[0]], q = B.le[x[0]];
        if (jeq(p, q)) return;
        L.push(congKhai ? ('Sửa lịch ' + x[1]) : (x[1] + ': ' + ngan(MA.fmtLe(p) + (p.noi ? ' · ' + p.noi : '')) + ' → ' + ngan(MA.fmtLe(q) + (q.noi ? ' · ' + q.noi : ''))));
      });
      RIENG.forEach(function(k){
        if (A[k] === B[k]) return;
        L.push(congKhai ? ('Sửa ' + NHAN_RIENG[k].charAt(0).toLowerCase() + NHAN_RIENG[k].slice(1)) : (NHAN_RIENG[k] + ': ' + ngan(A[k]) + ' → ' + ngan(B[k])));
      });
    }
    return L.concat(dongTuy(A, B, congKhai));
  }

  /* ---------------- giao diện ---------------- */
  var ICON = {
    undo: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
    eye: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    save: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
    pen: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>'
  };
  var PEN_URL = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 20h9'/%3E%3Cpath d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'/%3E%3C/svg%3E\")";
  var CSS = [
    '.sua-ui{font-family:"Be Vietnam Pro",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;line-height:1.4;font-size:14px;text-align:left}',
    '.sua-ui *{box-sizing:border-box}',
    '.sua-ui button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.sua-ui button:focus-visible,.sua-ui input:focus-visible{outline:2px solid #E4C583;outline-offset:2px}',
    'html.sua-trang .rv{opacity:1!important;transform:none!important;transition:none!important}',
    'html.sua-trang .wfloat,html.sua-trang .music,html.sua-trang .music-hint,html.sua .bar{display:none!important}',
    'html.sua-trang .card{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px))}',
    /* ô ảnh sửa được: bút chì trên-giữa, số ảnh dưới-giữa (trên-giữa không bị cắt ở khung tròn/vòm) */
    'html.sua .ph[data-slot],html.sua .cover,html.sua #videoBox{cursor:pointer}',
    'html.sua .ph[data-slot]::after{content:"";position:absolute;left:50%;top:8px;width:30px;height:30px;margin-left:-15px;border-radius:50%;background:rgba(18,16,16,.72) ' + PEN_URL + ' center/15px no-repeat;box-shadow:0 2px 10px rgba(0,0,0,.35);border:1px solid rgba(228,197,131,.7);pointer-events:none;z-index:3}',
    'html.sua .ph[data-slot]::before{content:attr(data-n);position:absolute;left:50%;bottom:8px;transform:translateX(-50%);font:600 11px/1 "Be Vietnam Pro",system-ui,sans-serif;letter-spacing:.04em;color:#fff;background:rgba(18,16,16,.66);padding:4px 7px;border-radius:6px;pointer-events:none;z-index:3}',
    'html.sua .cover::after,html.sua #videoBox::after{position:absolute;right:12px;top:12px;z-index:6;font:600 12px/1 "Be Vietnam Pro",system-ui,sans-serif;color:#fff;background:rgba(18,16,16,.74) ' + PEN_URL + ' 10px center/14px no-repeat;padding:9px 12px 9px 30px;border-radius:999px;border:1px solid rgba(228,197,131,.7);box-shadow:0 2px 10px rgba(0,0,0,.35);pointer-events:none}',
    'html.sua .cover::after{content:"Đổi ảnh bìa"}',
    'html.sua #videoBox::after{content:"Đổi ảnh clip"}',
    'html.sua .ph[data-slot]:hover,html.sua #videoBox:hover{outline:2px dashed #C79A44;outline-offset:2px}',
    'html.sua .sua-dang{outline:3px solid #E4C583!important;outline-offset:3px}',
    'html.sua .cover.sua-dang{outline-offset:-3px}',
    /* thanh dưới */
    '.sua-bar{position:fixed;left:0;right:0;bottom:0;z-index:120;padding:8px 10px calc(8px + env(safe-area-inset-bottom,0px));display:flex;justify-content:center;pointer-events:none}',
    '.sua-bar .in{pointer-events:auto;width:100%;max-width:520px;display:flex;gap:4px;align-items:center;background:rgba(18,16,16,.92);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(228,197,131,.32);border-radius:999px;padding:5px;box-shadow:0 10px 30px rgba(0,0,0,.3)}',
    '.sua-bar button{height:44px;border:0;border-radius:999px;background:none;font-size:13.5px;font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 10px;white-space:nowrap;min-width:0}',
    '.sua-bar button:hover{background:rgba(255,255,255,.07)}',
    '.sua-bar .u{flex:0 0 44px;padding:0}',
    '.sua-bar .u[disabled]{opacity:.35;cursor:default;background:none}',
    '.sua-bar .i,.sua-bar .x{flex:1 1 auto}',
    '.sua-bar .l{flex:0 0 auto;background:#C79A44!important;color:#1a1a1a;font-weight:700;padding:0 16px}',
    '.sua-bar .l.het{background:rgba(255,255,255,.1)!important;color:rgba(255,255,255,.6);font-weight:500}',
    '.sua-bar .l.cho{background:#3a3226!important;color:#E4C583}',
    '.sua-bar .l b{display:inline-flex;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#1a1a1a;color:#E4C583;font-size:11.5px;align-items:center;justify-content:center}',
    '@media (max-width:370px){.sua-bar button{font-size:12.5px;padding:0 8px;gap:4px}.sua-bar .i svg,.sua-bar .x svg{display:none}.sua-bar .l{padding:0 12px}}',
    '.sua-quay{position:fixed;right:12px;bottom:calc(74px + env(safe-area-inset-bottom,0px));z-index:120;height:44px;border:1px solid rgba(228,197,131,.6);border-radius:999px;background:rgba(18,16,16,.9);color:#fff;padding:0 16px;display:none;align-items:center;gap:8px;font-size:13.5px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.3)}',
    'html.sua-xem .sua-quay{display:inline-flex}',
    'html.sua-xem .sua-bar{display:none}',
    /* bảng trượt */
    '.sua-dim{position:fixed;inset:0;z-index:150;background:rgba(0,0,0,.25);opacity:0;visibility:hidden;transition:opacity .2s,visibility 0s .2s}',
    '.sua-dim.mo{opacity:1;visibility:visible;transition:opacity .2s}',
    '.sua-sheet{position:fixed;left:0;right:0;bottom:0;z-index:160;margin:0 auto;max-width:560px;max-height:min(80vh,680px);display:flex;flex-direction:column;background:rgba(24,20,20,.97);border:1px solid rgba(228,197,131,.28);border-bottom:0;border-radius:18px 18px 0 0;box-shadow:0 -18px 44px rgba(0,0,0,.35);transform:translateY(105%);visibility:hidden;transition:transform .26s cubic-bezier(.2,.8,.2,1),visibility 0s .26s;padding-bottom:env(safe-area-inset-bottom,0px)}',
    '.sua-sheet.mo{transform:none;visibility:visible;transition:transform .26s cubic-bezier(.2,.8,.2,1)}',
    '@media (min-width:1000px){.sua-sheet{left:auto;right:16px;top:calc(60px + env(safe-area-inset-top,0px));bottom:16px;width:410px;max-width:none;max-height:none;border-radius:18px;border-bottom:1px solid rgba(228,197,131,.28);transform:translateX(112%)}.sua-sheet.mo{transform:none}.sua-dim{display:none}html.sua-trang .card{margin-left:max(16px,calc((100% - 966px)/2));margin-right:auto}html.sua-trang .mau-bar .in{margin-left:max(8px,calc((100% - 966px)/2))}.sua-bar{justify-content:flex-start;padding-left:max(16px,calc((100% - 966px)/2))}}',
    '.sua-hd{display:flex;align-items:center;gap:10px;padding:12px 10px 10px 16px;border-bottom:1px solid rgba(255,255,255,.1);flex:0 0 auto}',
    '.sua-hd .t{flex:1;min-width:0}',
    '.sua-hd b{display:block;font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.sua-hd small{display:block;font-size:12px;color:rgba(255,255,255,.62);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.sua-x{flex:0 0 42px;width:42px;height:42px;border:0;border-radius:50%;background:rgba(255,255,255,.08);font-size:24px;line-height:1;display:flex;align-items:center;justify-content:center}',
    '.sua-tabs{display:flex;gap:6px;padding:10px 12px 0;flex:0 0 auto}',
    '.sua-tab{flex:1;height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:none;font-size:13.5px;font-weight:500;color:rgba(255,255,255,.82)}',
    '.sua-tab.on{background:#C79A44;border-color:#C79A44;color:#1a1a1a;font-weight:600}',
    '.sua-bd{overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:12px 12px 18px;flex:1 1 auto;min-height:0}',
    '.sua-lbl{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.58);margin:0 0 8px}',
    '.sua-lbl.mt{margin-top:18px}',
    '.sua-p{font-size:12.5px;color:rgba(255,255,255,.7);margin:8px 0 0;line-height:1.5}',
    '.sua-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}',
    '@media (min-width:1000px){.sua-grid{grid-template-columns:repeat(3,1fr)}}',
    '.sua-th{position:relative;aspect-ratio:1;border:0;padding:0;border-radius:9px;overflow:hidden;background:#2c2626;display:block;width:100%}',
    '.sua-th img{width:100%;height:100%;object-fit:cover;display:block}',
    '.sua-th .so{position:absolute;left:4px;bottom:4px;font-size:10.5px;font-weight:600;background:rgba(0,0,0,.62);padding:2px 5px;border-radius:5px;line-height:1.3}',
    '.sua-th .huong{position:absolute;right:5px;bottom:6px;width:17px;height:11px;border:1.5px solid #fff;border-radius:2px;background:rgba(0,0,0,.45);box-shadow:0 0 0 1px rgba(0,0,0,.35)}',
    '.sua-th .dung{position:absolute;left:4px;top:4px;font-size:10px;font-weight:700;background:rgba(228,197,131,.95);color:#1a1a1a;padding:2px 5px;border-radius:5px;line-height:1.3;max-width:calc(100% - 8px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.sua-th.cur{box-shadow:inset 0 0 0 3px #E4C583}',
    '.sua-th.cur .dung{background:#1a1a1a;color:#E4C583}',
    '.sua-th.mo img{opacity:.45}',
    '.sua-khung{position:relative;margin:2px auto 0;border-radius:10px;overflow:hidden;background:#000;touch-action:none;cursor:grab;-webkit-user-select:none;user-select:none;max-width:100%}',
    '.sua-khung img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;-webkit-user-drag:none}',
    '.sua-khung .luoi{position:absolute;inset:0;pointer-events:none;opacity:.55;background:linear-gradient(to right,transparent calc(33.33% - .5px),rgba(255,255,255,.7) calc(33.33% - .5px),rgba(255,255,255,.7) calc(33.33% + .5px),transparent calc(33.33% + .5px),transparent calc(66.66% - .5px),rgba(255,255,255,.7) calc(66.66% - .5px),rgba(255,255,255,.7) calc(66.66% + .5px),transparent calc(66.66% + .5px)),linear-gradient(to bottom,transparent calc(33.33% - .5px),rgba(255,255,255,.7) calc(33.33% - .5px),rgba(255,255,255,.7) calc(33.33% + .5px),transparent calc(33.33% + .5px),transparent calc(66.66% - .5px),rgba(255,255,255,.7) calc(66.66% - .5px),rgba(255,255,255,.7) calc(66.66% + .5px),transparent calc(66.66% + .5px))}',
    '.sua-khung.keo{cursor:grabbing}',
    '.sua-row{display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap}',
    '.sua-btn{min-height:42px;padding:0 15px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);font-size:13.5px;font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:6px;text-decoration:none;color:#fff}',
    '.sua-btn:hover{background:rgba(255,255,255,.12)}',
    '.sua-btn.vang{background:#C79A44;border-color:#C79A44;color:#1a1a1a;font-weight:700}',
    '.sua-btn.vang:hover{background:#D4A954}',
    '.sua-btn.do{border-color:rgba(255,140,120,.5);color:#FFC2B8}',
    '.sua-btn.rong{width:100%}',
    '.sua-btn[disabled]{opacity:.38;cursor:default}',
    '.sua-note{margin:0 0 10px;padding:10px 12px;border-radius:10px;background:rgba(228,197,131,.12);border:1px solid rgba(228,197,131,.35);font-size:13px;line-height:1.45}',
    '.sua-note .sua-row{justify-content:flex-start;margin-top:8px}',
    '.sua-f{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:end}',
    '.sua-f label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:5px}',
    '.sua-f input{width:100%;height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.07);color:#fff;padding:0 12px;font:inherit;font-size:16px}',
    '.sua-sw{width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.22);background:none;font-size:18px}',
    '.sua-bo{display:flex;gap:12px;align-items:center;width:100%;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);border-radius:12px;padding:8px;text-align:left}',
    'button.sua-bo:hover{background:rgba(255,255,255,.1)}',
    '.sua-bo img{width:52px;height:65px;object-fit:cover;border-radius:7px;flex:0 0 52px;background:#2c2626}',
    '.sua-bo .tx{flex:1;min-width:0}',
    '.sua-bo b{display:block;font-size:14px;font-weight:600}',
    '.sua-bo small{display:block;font-size:12px;color:rgba(255,255,255,.62);margin-top:2px}',
    '.sua-bo .tag{display:inline-block;margin-top:4px;font-size:10.5px;font-weight:700;background:rgba(228,197,131,.9);color:#1a1a1a;padding:2px 6px;border-radius:5px}',
    '.sua-bo.cur{border-color:#E4C583}',
    '.sua-bos{display:flex;flex-direction:column;gap:8px}',
    '.sua-hang{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;-webkit-overflow-scrolling:touch}',
    '.sua-mini{flex:0 0 62px;border:0;padding:0;background:none;text-align:center}',
    '.sua-mini img{width:62px;height:62px;object-fit:cover;border-radius:9px;display:block;background:#2c2626}',
    '.sua-mini span{display:block;font-size:10.5px;color:rgba(255,255,255,.72);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.sua-mini.them{display:flex;flex-direction:column;align-items:center}',
    '.sua-mini.them i{width:62px;height:62px;border-radius:9px;border:1.5px dashed rgba(228,197,131,.7);display:flex;align-items:center;justify-content:center;font-style:normal;font-size:26px;color:#E4C583}',
    '.sua-list{margin:0;padding:0 0 0 18px;font-size:13.5px;line-height:1.55}',
    '.sua-list li{margin:3px 0}',
    '.sua-buoc{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:10px}',
    '.sua-buoc li{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;line-height:1.45}',
    '.sua-buoc i{flex:0 0 24px;height:24px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-style:normal;font-size:12px;font-weight:700}',
    '.sua-buoc li.ok i{background:#5FB27A;color:#0d1a12}',
    '.sua-buoc li.dang i{background:#C79A44;color:#1a1a1a;animation:suaNhip 1.2s ease-in-out infinite}',
    '.sua-buoc li.loi i{background:#E07A6A;color:#1a0d0b}',
    '@keyframes suaNhip{50%{opacity:.45}}',
    '.sua-msg{margin:12px 0 0;padding:10px 12px;border-radius:10px;font-size:13px;line-height:1.5;white-space:pre-line}',
    '.sua-msg.ok{background:rgba(95,178,122,.16);border:1px solid rgba(95,178,122,.5)}',
    '.sua-msg.loi{background:rgba(224,122,106,.14);border:1px solid rgba(224,122,106,.5)}',
    '.sua-link{background:none;border:0;padding:6px 0;color:#E4C583;text-decoration:underline;text-underline-offset:3px;font-size:13px}',
    '.sua-toast{position:fixed;left:50%;top:calc(58px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:220;background:rgba(18,16,16,.95);border:1px solid rgba(228,197,131,.45);color:#fff;padding:10px 16px;border-radius:999px;font:500 13px/1.4 "Be Vietnam Pro",system-ui,sans-serif;max-width:92vw;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.3);pointer-events:none}',
    '.mau-bar .go.sua-thoat{background:none;border:1px solid rgba(255,255,255,.45);color:#fff}',
    /* thiệp riêng: nút thoát góc trên + ô nhập của bảng Thông tin (chữ 16px để iPhone không tự phóng to) */
    '.sua-thoat-noi{position:fixed;left:10px;top:calc(10px + env(safe-area-inset-top,0px));z-index:125;height:38px;padding:0 14px;border-radius:999px;background:rgba(18,16,16,.9);border:1px solid rgba(228,197,131,.55);color:#fff!important;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:7px;text-decoration:none;box-shadow:0 6px 20px rgba(0,0,0,.28)}',
    '.sua-thoat-noi u{color:#E4C583;text-underline-offset:3px}',
    'html.sua-xem .sua-thoat-noi{display:none}',
    '.sua-g2{display:grid;grid-template-columns:1fr 1fr;gap:0 8px}',
    '.sua-o{display:block;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.6);margin:0 0 10px}',
    '.sua-o input,.sua-o textarea,.sua-o select{display:block;width:100%;margin-top:5px;min-height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.07);color:#fff;padding:0 12px;font:inherit;font-size:16px;letter-spacing:0;text-transform:none}',
    '.sua-o textarea{padding:10px 12px;min-height:84px;resize:vertical;line-height:1.45}',
    '.sua-o input[type=date],.sua-o input[type=time]{color-scheme:dark}',
    '.sua-o select{color-scheme:dark}',
    '.sua-o input::placeholder,.sua-o textarea::placeholder{color:rgba(255,255,255,.38)}',
    /* Hiệu ứng & phần: công tắc bật/tắt */
    '.sua-cts{border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.03);padding:0 12px}',
    '.sua-ct{display:flex;align-items:center;gap:12px;min-height:50px;padding:7px 0;border-top:1px solid rgba(255,255,255,.08);cursor:pointer;position:relative;text-transform:none;letter-spacing:0}',
    '.sua-ct:first-child{border-top:0}',
    '.sua-ct .tx{flex:1;min-width:0}',
    '.sua-ct b{display:block;font-size:14px;font-weight:500;line-height:1.35}',
    '.sua-ct small{display:block;font-size:12px;color:rgba(255,255,255,.58);margin-top:2px;line-height:1.4}',
    '.sua-ct input{position:absolute;opacity:0;width:1px;height:1px;margin:0;pointer-events:none}',
    '.sua-ct i{flex:0 0 46px;height:28px;border-radius:999px;background:rgba(255,255,255,.2);position:relative;transition:background .15s}',
    '.sua-ct i::after{content:"";position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .15s}',
    '.sua-ct input:checked+i{background:#C79A44}',
    '.sua-ct input:checked+i::after{transform:translateX(18px)}',
    '.sua-ct input:focus-visible+i{outline:2px solid #E4C583;outline-offset:2px}',
    '.sua-ct.mo b{color:rgba(255,255,255,.55)}',
    '.sua-ct.mo input:checked+i{background:rgba(199,154,68,.45)}',
    '@media (prefers-reduced-motion:reduce){.sua-ct i,.sua-ct i::after{transition:none}}',
    '@media (prefers-reduced-motion:reduce){.sua-sheet,.sua-dim{transition:none}.sua-buoc li.dang i{animation:none}}'
  ].join('\n');

  var bar, sheet, dim, quay;
  function toast(msg, ms){
    var t = $('.sua-toast');
    if (!t) { t = document.createElement('div'); t.className = 'sua-toast sua-ui'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function(){ t.hidden = true; }, ms || 2600);
  }

  function dungGiaoDien(){
    var st = document.createElement('style'); st.id = 'sua-css'; st.textContent = CSS; document.head.appendChild(st);
    document.documentElement.classList.add('sua', 'sua-trang');

    /* thanh chọn mẫu phía trên: giữ chế độ sửa khi ‹ ›, nút "Đặt mẫu này" → "Thoát" */
    var N = window.__MAU_NAV__;
    if (N) {
      var idx = $('#mauIdx'); if (idx) idx.textContent = '✎ Sửa ảnh · Mẫu ' + (N.i + 1) + '/' + N.list.length;
      ['#mauPrev', '#mauNext'].forEach(function(s){ var a = $(s); if (a && a.href.indexOf('sua=1') < 0) a.href += '&sua=1'; });
      var go = $('#mauGo');
      if (go) {
        go.textContent = 'Thoát'; go.classList.add('sua-thoat'); go.href = '?m=' + encodeURIComponent(KEY);
        go.addEventListener('click', function(e){
          if (!soThayDoi()) return;
          e.preventDefault(); moThoat();
        });
      }
    }

    bar = document.createElement('div'); bar.className = 'sua-bar sua-ui';
    bar.innerHTML = '<div class="in" role="toolbar" aria-label="Bảng sửa ảnh thiệp">' +
      '<button type="button" class="u" id="suaUndo" aria-label="Hoàn tác" title="Hoàn tác (Ctrl+Z)">' + ICON.undo + '</button>' +
      '<button type="button" class="i" id="suaInfo">' + ICON.info + (THIEP ? 'Thông tin' : 'Tên &amp; bộ ảnh') + '</button>' +
      '<button type="button" class="x" id="suaXem">' + ICON.eye + 'Xem thử</button>' +
      '<button type="button" class="l" id="suaLuu"></button></div>';
    document.body.appendChild(bar);
    quay = document.createElement('button'); quay.type = 'button'; quay.className = 'sua-quay sua-ui'; quay.innerHTML = ICON.pen + 'Quay lại sửa';
    document.body.appendChild(quay);
    if (THIEP) {   /* thiệp riêng không có thanh chọn mẫu → nút thoát riêng góc trên */
      var th = document.createElement('a'); th.className = 'sua-thoat-noi sua-ui'; th.href = linkThoat();
      th.innerHTML = ICON.pen + 'Đang sửa thiệp · <u>Thoát</u>';
      th.addEventListener('click', function(e){ if (!soThayDoi()) return; e.preventDefault(); moThoat(); });
      document.body.appendChild(th);
    }
    dim = document.createElement('div'); dim.className = 'sua-dim sua-ui';
    document.body.appendChild(dim);
    sheet = document.createElement('div'); sheet.className = 'sua-sheet sua-ui'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'false');
    document.body.appendChild(sheet);

    $('#suaUndo').addEventListener('click', hoanTac);
    $('#suaInfo').addEventListener('click', function(){ moSheet('info'); });
    $('#suaXem').addEventListener('click', function(){ datCheDo('xem'); });
    $('#suaLuu').addEventListener('click', function(){ moSheet('luu'); });
    quay.addEventListener('click', function(){ datCheDo('sua'); });
    dim.addEventListener('click', dongSheet);
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && sheetId) { dongSheet(); return; }
      var tag = (e.target && e.target.tagName) || '';
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z') && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); hoanTac(); }
    });
    /* chạm ảnh trên thiệp → mở bảng sửa ô đó (chặn lightbox) */
    document.addEventListener('click', function(e){
      if (cheDo !== 'sua') return;
      var t = e.target; if (!t || !t.closest || t.closest('.sua-ui') || t.closest('.mau-bar')) return;
      var el = t.closest('.ph[data-slot]'), id = el ? el.getAttribute('data-slot') : (t.closest('.cover') ? 'bia' : (t.closest('#videoBox') ? 'poster' : ''));
      if (!id) return;
      e.preventDefault(); e.stopPropagation();
      moO(id);
    }, true);
  }

  function linkThoat(){ return location.pathname + (THIEP ? '?k=' + encodeURIComponent(K_LINK) : '?m=' + encodeURIComponent(KEY)); }
  function datCheDo(m){
    cheDo = m;
    document.documentElement.classList.toggle('sua', m === 'sua');
    document.documentElement.classList.toggle('sua-xem', m === 'xem');
    var env = document.getElementById('env'); if (env && env.parentNode) env.parentNode.removeChild(env);
    document.body.classList.remove('env-lock');
    if (m === 'xem') {
      dongSheet();
      var T = window.__THIEP__, d = duLieuHienTai();   /* phong bì bật → xem thử cũng mở bằng phong bì như khách */
      if (T && T.phongBi && T.coPhongBi && T.coPhongBi(d)) { window.scrollTo(0, 0); T.phongBi(d); }
      toast('Đang xem như khách — bấm “Quay lại sửa” để tiếp tục');
    }
  }

  function moc(){   /* bản web sẽ có sau lần lưu đang chờ (hoặc bản web hiện tại) */
    if (pending && pending.moi) return norm(pending.moi);
    if (!pending || !pending.set) return live;
    var d = toData(live); Object.keys(pending.set).forEach(function(k){ d[k] = pending.set[k]; });
    return norm(d);
  }
  function soThayDoi(){ return dongThayDoi(moc(), draft).length; }
  function capNhatThanh(){
    var n = soThayDoi(), l = $('#suaLuu'); if (!l) return;
    l.classList.remove('het', 'cho');
    if (pending) { l.classList.add('cho'); l.innerHTML = '⏳ Đang lên web'; }
    else if (n) { l.innerHTML = ICON.save + 'Lưu <b>' + n + '</b>'; }
    else { l.classList.add('het'); l.innerHTML = 'Đã lưu'; }
    $('#suaUndo').disabled = !undoStack.length;
  }

  /* ---------------- bảng trượt ---------------- */
  function moSheet(id, slot){
    var doiO = sheetId !== id || sheetSlot !== (slot || '');
    sheetId = id; sheetSlot = slot || '';
    if (doiO && id === 'o') tab = 'doi';
    veSheet();
    sheet.classList.add('mo'); if (!rong()) dim.classList.add('mo');
    danhDau();
    var x = $('.sua-x', sheet); if (x && doiO) try { x.focus({ preventScroll: true }); } catch (e) {}
    if (id === 'o') requestAnimationFrame(function(){ requestAnimationFrame(function(){ hienO(sheetSlot); }); });
  }
  function dongSheet(){
    dungNghe();
    sheetId = ''; sheetSlot = ''; vuaXong = false;
    sheet.classList.remove('mo'); dim.classList.remove('mo');
    danhDau();
  }
  function hienO(id){
    var el = slotEl(id); if (!el) return;
    var r = el.getBoundingClientRect(), top = 58, bottom = window.innerHeight - 12;
    if (!rong() && sheet.classList.contains('mo')) bottom -= sheet.getBoundingClientRect().height;
    var avail = bottom - top, dy;
    if (r.height <= avail) dy = r.top - top - (avail - r.height) / 2; else dy = r.top - top;
    if (Math.abs(dy) > 6) window.scrollBy({ top: dy, behavior: 'smooth' });
  }
  function dauSheet(tieuDe, phu){
    return '<div class="sua-hd"><div class="t"><b>' + esc(tieuDe) + '</b>' + (phu ? '<small>' + esc(phu) + '</small>' : '') + '</div>' +
      '<button type="button" class="sua-x" aria-label="Đóng">×</button></div>';
  }
  function veSheet(){
    var h = '', tuy = sheetId === 'info' && tabInfo === 'tuy';
    if (sheetId === 'o') h = veO();
    else if (sheetId === 'info') h = tuy ? veTuy() : (THIEP ? veThongTin() : veInfo());
    else if (sheetId === 'bo') h = veBo();
    else if (sheetId === 'luu') h = veLuu();
    else if (sheetId === 'thoat') h = veThoat();
    else if (sheetId === 'them') h = veThem();
    var cu = $('.sua-bd', sheet), cuon = cu ? cu.scrollTop : 0;
    sheet.innerHTML = h;
    var bd = $('.sua-bd', sheet); if (bd && cuon) bd.scrollTop = cuon;
    $('.sua-x', sheet) && $('.sua-x', sheet).addEventListener('click', dongSheet);
    $$('[data-ti]', sheet).forEach(function(b){ b.addEventListener('click', function(){
      var t = b.getAttribute('data-ti'); if (t === tabInfo) return;
      tabInfo = t; veSheet();
      var b2 = $('.sua-bd', sheet); if (b2) b2.scrollTop = 0;
    }); });
    if (sheetId === 'o') ganO();
    else if (sheetId === 'info') { if (tuy) ganTuy(); else if (THIEP) ganThongTin(); else ganInfo(); }
    else if (sheetId === 'bo') ganBo();
    else if (sheetId === 'luu') ganLuu();
    else if (sheetId === 'thoat') ganThoat();
    else if (sheetId === 'them') ganThem();
    sheet.setAttribute('aria-label', ($('.sua-hd b', sheet) || {}).textContent || 'Bảng sửa');
  }

  /* ---------------- bảng 1 ô ảnh ---------------- */
  var xacNhan = null;   /* {n, other} — đổi chỗ với ảnh bìa cần bấm xác nhận */
  function moO(id){ xacNhan = null; moSheet('o', id); }
  function veO(){
    var id = sheetSlot, n = soO(draft, id), laDs = id.indexOf('ds:') === 0, k = laDs ? +id.slice(3) : -1;
    var phu = n ? ('Đang dùng ảnh số ' + n + (id === 'bia' && !draft.bia ? ' (bìa cắt sẵn)' : '')) : (id === 'poster' ? 'Đang dùng ảnh bìa của clip YouTube' : 'Chưa có ảnh');
    var h = dauSheet(tenO(id), phu);
    h += '<div class="sua-tabs" role="tablist">' +
      '<button type="button" class="sua-tab' + (tab === 'doi' ? ' on' : '') + '" data-tab="doi" role="tab">Đổi ảnh</button>' +
      '<button type="button" class="sua-tab' + (tab === 'khung' ? ' on' : '') + '" data-tab="khung" role="tab">Canh khung</button>' +
      (laDs ? '<button type="button" class="sua-tab' + (tab === 'vitri' ? ' on' : '') + '" data-tab="vitri" role="tab">Thứ tự</button>' : '') +
      '</div><div class="sua-bd">';
    if (tab === 'doi') {
      if (xacNhan) {
        h += '<div class="sua-note">Ảnh ' + esc(xacNhan.n) + ' đang là <b>' + esc(tenO(xacNhan.other).toLowerCase()) + '</b>. Đổi chỗ 2 ảnh này cho nhau?' +
          '<div class="sua-row"><button type="button" class="sua-btn vang" id="suaXnCo">Đổi chỗ</button><button type="button" class="sua-btn" id="suaXnKhong">Thôi</button></div></div>';
      }
      h += '<p class="sua-lbl">' + esc(tenBo(draft.album)) + '</p><div class="sua-grid" id="suaGrid"><p class="sua-p">Đang tải ảnh của bộ…</p></div>';
      h += '<p class="sua-p">' + esc(goiY(id)) + '</p>';
    } else if (tab === 'khung') {
      h += '<div class="sua-khung" id="suaKhung"><img alt="" draggable="false"><div class="luoi"></div></div>' +
        '<p class="sua-p" id="suaKhungTip" style="text-align:center">Kéo ảnh trong khung để canh — thiệp đổi theo ngay.</p>' +
        '<div class="sua-row"><button type="button" class="sua-btn" id="suaGiua">Canh giữa</button><button type="button" class="sua-btn" id="suaTren">Ưu tiên phía trên</button><button type="button" class="sua-btn" id="suaNhuCu">Như lúc đầu</button></div>';
    } else if (tab === 'vitri') {
      var N = draft.anh_ds.length;
      h += '<p class="sua-p" style="margin-top:0">Ảnh câu chuyện xếp theo thứ tự: 3 ảnh ghép → 1 ảnh tràn → 2 ảnh nổi → cặp ảnh cuối → lưới album. Đổi thứ tự là ảnh chạy sang khung khác.</p>' +
        '<div class="sua-row"><button type="button" class="sua-btn" id="suaLen"' + (k <= 0 ? ' disabled' : '') + '>↑ Lên trước</button>' +
        '<button type="button" class="sua-btn" id="suaXuong"' + (k >= N - 1 ? ' disabled' : '') + '>↓ Xuống sau</button></div>' +
        '<div class="sua-row"><button type="button" class="sua-btn do" id="suaBo"' + (N <= 1 ? ' disabled' : '') + '>Bỏ ảnh này khỏi thiệp</button></div>' +
        '<p class="sua-p">Đang có ' + N + ' ảnh câu chuyện. Ít ảnh thì thiệp tự ẩn bớt khối (vd dưới 3 ảnh thì không có khối ghép 3). Thêm ảnh: nút “Tên &amp; bộ ảnh”.</p>';
    }
    return h + '</div>';
  }
  function goiY(id){
    if (id === 'bia') return 'Nên chọn ảnh dọc, mặt ở nửa trên (tên dâu rể nằm nửa dưới). Ảnh bìa cũng là ảnh phong bì và nền lịch. Ảnh đang ở ô khác sẽ đổi chỗ.';
    if (id === 'poster') return 'Nên chọn ảnh ngang, mặt ở nửa trên (nút “Xem clip” ở góc dưới trái). Ảnh đang ở ô khác sẽ đổi chỗ.';
    if (id === 'cr' || id === 'cd') return 'Khung dọc 3:4 — nên chọn ảnh dọc. Ảnh đang ở ô khác sẽ tự đổi chỗ, không bị lặp.';
    return 'Ảnh đang ở ô khác sẽ tự đổi chỗ, không bị lặp. Cắt chưa đẹp thì qua “Canh khung”.';
  }
  function ganO(){
    $$('.sua-tab', sheet).forEach(function(b){ b.addEventListener('click', function(){ tab = b.getAttribute('data-tab'); xacNhan = null; veSheet(); }); });
    var id = sheetSlot;
    if (tab === 'doi') {
      if (xacNhan) {
        $('#suaXnCo').addEventListener('click', function(){ var x = xacNhan; xacNhan = null; datAnh(id, x.n, true); });
        $('#suaXnKhong').addEventListener('click', function(){ xacNhan = null; veSheet(); });
      }
      taiBo(draft.album).then(function(b){
        var g = $('#suaGrid'); if (!g || sheetSlot !== id) return;
        g.innerHTML = b.ds.map(function(p){ return nutAnh(p, id); }).join('') || '<p class="sua-p">Bộ này chưa có ảnh.</p>';
        $$('.sua-th', g).forEach(function(btn){ btn.addEventListener('click', function(){ chonAnh(id, btn.getAttribute('data-n')); }); });
      }).catch(function(){ var g = $('#suaGrid'); if (g) g.innerHTML = '<p class="sua-p">Không tải được danh sách ảnh — kiểm tra mạng rồi mở lại.</p>'; });
    } else if (tab === 'khung') ganKhung(id);
    else if (tab === 'vitri') {
      var k = +id.slice(3);
      $('#suaLen').addEventListener('click', function(){ doiThuTu(k, k - 1); });
      $('#suaXuong').addEventListener('click', function(){ doiThuTu(k, k + 1); });
      $('#suaBo').addEventListener('click', function(){
        var n = draft.anh_ds[k];
        doi(function(o){ o.anh_ds.splice(k, 1); }, true);
        dongSheet(); toast('Đã bỏ ảnh ' + n + ' khỏi thiệp — bấm ↶ nếu muốn lấy lại');
      });
    }
  }
  function nutAnh(p, id){
    var ai = aiDung(draft, p.n, ''), cur = soO(draft, id) === p.n;
    var nhan = ai.length ? ai.map(tenNgan).join(' · ') : '';
    return '<button type="button" class="sua-th' + (cur ? ' cur' : '') + '" data-n="' + esc(p.n) + '" aria-label="Ảnh ' + esc(p.n) + (nhan ? ' — đang dùng: ' + esc(nhan) : '') + '">' +
      '<img src="' + esc(anh(draft.album, p.n, true)) + '" alt="" loading="lazy">' +
      (nhan ? '<span class="dung">' + esc(cur ? '✓ ' + nhan : nhan) + '</span>' : '') +
      '<span class="so">' + esc(p.n) + '</span>' + (p.r > 1.05 ? '<span class="huong" title="Ảnh ngang"></span>' : '') + '</button>';
  }
  function chonAnh(id, n){
    var cur = soO(draft, id);
    if (n === cur) { toast('Ô này đang dùng ảnh ' + n); return; }
    var other = aiDung(draft, n, id)[0];
    if (other && (other === 'bia' || id === 'bia')) { xacNhan = { n: n, other: other }; veSheet(); return; }
    datAnh(id, n, false);
  }
  function datAnh(id, n, xn){
    var cur = soO(draft, id), other = aiDung(draft, n, id)[0];
    if (other && !cur) { toast('Ảnh ' + n + ' đang dùng ở ' + tenO(other).toLowerCase() + ' — chọn ảnh khác'); return; }
    doi(function(o){ if (other) datO(o, other, cur); datO(o, id, n); });
    toast(other ? ('Đã đổi chỗ: ' + tenO(id) + ' ⇄ ' + tenO(other).toLowerCase()) : ('Đã đổi sang ảnh ' + n));
  }
  function doiThuTu(k, j){
    if (j < 0 || j >= draft.anh_ds.length) return;
    doi(function(o){ var t = o.anh_ds[k]; o.anh_ds[k] = o.anh_ds[j]; o.anh_ds[j] = t; }, true);
    sheetSlot = 'ds:' + j; veSheet(); danhDau();
    requestAnimationFrame(function(){ hienO(sheetSlot); });
    toast('Ảnh đã chuyển sang: ' + tenO(sheetSlot).toLowerCase());
  }

  /* kéo để canh khung: object-position x% y% — kéo ảnh sang phải thì x giảm */
  function posGoc(id){   /* khung "như lúc đầu" (bản trên web) của ảnh đang nằm ở ô này */
    if (draft.album !== live.album) return '';
    if (id === 'bia') return draft.bia === live.bia ? live.bia_pos : '';
    if (id === 'poster') return draft.poster === live.poster ? live.poster_pos : '';
    return live.pos[soO(draft, id)] || '';
  }
  function ganKhung(id){
    var k = $('#suaKhung'), im = $('img', k), real = slotImg(id);
    if (!real) { $('#suaKhungTip').textContent = 'Không thấy ô ảnh này trên thiệp.'; return; }
    var rr = real.getBoundingClientRect(), ar = (rr.width && rr.height) ? rr.width / rr.height : 1;
    var maxW = Math.min(k.parentElement.clientWidth, 460), maxH = rong() ? 330 : Math.max(170, Math.min(260, window.innerHeight * 0.3));
    var w = maxW, h = w / ar; if (h > maxH) { h = maxH; w = h * ar; }
    k.style.width = Math.round(w) + 'px'; k.style.height = Math.round(h) + 'px';
    im.src = real.currentSrc || real.src;
    var xy = docPos(posCua(draft, id) || window.getComputedStyle(real).objectPosition || '50% 50%'), bat = null;
    function tran(){
      var nw = im.naturalWidth, nh = im.naturalHeight, fw = k.clientWidth, fh = k.clientHeight;
      if (!nw || !nh) return [0, 0];
      var sc = Math.max(fw / nw, fh / nh);
      return [nw * sc - fw, nh * sc - fh];
    }
    function tip(){
      var t = tran(), el = $('#suaKhungTip'); if (!el) return;
      if (t[0] < 1 && t[1] < 1) el.textContent = 'Ảnh vừa khít khung — không cần canh.';
      else if (t[0] < 1) el.textContent = 'Kéo lên / xuống để canh (ảnh vừa khít chiều ngang).';
      else if (t[1] < 1) el.textContent = 'Kéo sang trái / phải để canh (ảnh vừa khít chiều dọc).';
      else el.textContent = 'Kéo ảnh trong khung để canh — thiệp đổi theo ngay.';
    }
    if (im.complete) tip(); else im.addEventListener('load', tip);
    function xem(x, y){
      xy = [Math.max(0, Math.min(100, Math.round(x))), Math.max(0, Math.min(100, Math.round(y)))];
      im.style.objectPosition = xy[0] + '% ' + xy[1] + '%';
    }
    function ap(x, y){
      xem(x, y); var v = xy[0] + '% ' + xy[1] + '%';
      real.style.objectPosition = v;
      if (id === 'bia') { var lt = $('#env .letter img'); if (lt) lt.style.objectPosition = v; }
    }
    function chot(){ var v = xy[0] + '% ' + xy[1] + '%'; if (v === posCua(draft, id)) return; doi(function(o){ datPos(o, id, v); }, true); }
    xem(xy[0], xy[1]);
    k.addEventListener('pointerdown', function(e){
      if (e.button !== undefined && e.button !== 0) return;
      bat = { x: e.clientX, y: e.clientY, xy: xy.slice(), t: tran(), keo: false };
      k.classList.add('keo'); try { k.setPointerCapture(e.pointerId); } catch (er) {}
      e.preventDefault();
    });
    k.addEventListener('pointermove', function(e){
      if (!bat) return;
      var dx = e.clientX - bat.x, dy = e.clientY - bat.y;
      if (!bat.keo && Math.abs(dx) + Math.abs(dy) < 3) return;
      bat.keo = true;
      ap(bat.t[0] >= 1 ? bat.xy[0] - dx / bat.t[0] * 100 : bat.xy[0], bat.t[1] >= 1 ? bat.xy[1] - dy / bat.t[1] * 100 : bat.xy[1]);
    });
    function tha(){ if (!bat) return; var keo = bat.keo; bat = null; k.classList.remove('keo'); if (keo) chot(); }
    k.addEventListener('pointerup', tha); k.addEventListener('pointercancel', tha); k.addEventListener('lostpointercapture', tha);
    k.tabIndex = 0; k.setAttribute('role', 'slider'); k.setAttribute('aria-label', 'Canh khung ảnh — dùng phím mũi tên');
    k.addEventListener('keydown', function(e){
      var st = e.shiftKey ? 10 : 2, m = { ArrowLeft: [st, 0], ArrowRight: [-st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] }[e.key];
      if (!m) return; e.preventDefault(); ap(xy[0] + m[0], xy[1] + m[1]); chot();
    });
    $('#suaGiua').addEventListener('click', function(){ ap(50, 50); chot(); toast('Đã canh giữa'); });
    $('#suaTren').addEventListener('click', function(){ ap(50, 15); chot(); toast('Đã ưu tiên phía trên (mặt người)'); });
    $('#suaNhuCu').addEventListener('click', function(){
      var g = posGoc(id);
      if (g !== posCua(draft, id)) doi(function(o){ datPos(o, id, g); }, true);
      real.style.objectPosition = g;
      if (id === 'bia') { var lt = $('#env .letter img'); if (lt) lt.style.objectPosition = g; }
      var v = docPos(g || window.getComputedStyle(real).objectPosition); xem(v[0], v[1]);
      toast('Đã về khung như lúc đầu');
    });
  }
  function docPos(s){
    var p = String(s || '').trim().split(/\s+/), kw = { left: 0, top: 0, center: 50, right: 100, bottom: 100 };
    function v(t, d){ if (t == null) return d; if (t in kw) return kw[t]; var n = parseFloat(t); return isNaN(n) ? d : n; }
    if (p.length === 1) { if (p[0] === 'top' || p[0] === 'bottom') return [50, v(p[0], 50)]; return [v(p[0], 50), 50]; }
    if (p[0] === 'top' || p[0] === 'bottom' || p[1] === 'left' || p[1] === 'right') return [v(p[1], 50), v(p[0], 50)];
    return [v(p[0], 50), v(p[1], 50)];
  }

  /* ---------------- tên & bộ ảnh ---------------- */
  function veInfo(){
    var h = dauSheet('Tên & bộ ảnh', 'Mẫu ' + M.ten + ' · ' + M.mau);
    h += tabsInfo() + '<div class="sua-bd">';
    h += '<div class="sua-f"><div><label for="suaCr">Chú rể</label><input id="suaCr" maxlength="30" autocomplete="off" value="' + esc(draft.ten_cr) + '"></div>' +
      '<button type="button" class="sua-sw" id="suaSw" aria-label="Đổi chỗ tên cô dâu và chú rể" title="Đổi chỗ">⇄</button>' +
      '<div><label for="suaCd">Cô dâu</label><input id="suaCd" maxlength="30" autocomplete="off" value="' + esc(draft.ten_cd) + '"></div></div>';
    h += '<p class="sua-p">Tên hiện ở bìa, phần giới thiệu và dưới ảnh dâu rể. Giữ đúng tên như trong album.</p>';
    h += '<p class="sua-lbl mt">Bộ ảnh</p><button type="button" class="sua-bo" id="suaDoiBo"><img src="' + esc('/images/album-' + draft.album + '-bia.jpg') + '" alt=""><span class="tx"><b>' + esc(tenBo(draft.album)) + '</b><small>Bấm để đổi sang bộ ảnh khác (studio / ngoại cảnh)</small></span></button>';
    h += '<p class="sua-lbl mt">Nhạc nền của mẫu</p>' + oChonNhac(draft.nhac);
    h += '<p class="sua-lbl mt">Ảnh trong thiệp (' + cacO(draft).length + ' ô)</p><div class="sua-hang">';
    cacO(draft).forEach(function(id){
      var src = srcO(draft, id);
      h += '<button type="button" class="sua-mini" data-o="' + esc(id) + '"><img src="' + esc(src) + '" alt="" loading="lazy"><span>' + esc(tenNgan(id)) + ' · ' + esc(soO(draft, id) || '—') + '</span></button>';
    });
    h += '<button type="button" class="sua-mini them" id="suaThem"><i>+</i><span>Thêm ảnh</span></button></div>';
    var coNhap = soThayDoi() > 0, khacGoc = goc && dongThayDoi(veGoc(draft), draft).length > 0;
    h += '<div class="sua-row" style="justify-content:flex-start;margin-top:18px">';
    if (coNhap) h += '<button type="button" class="sua-btn" id="suaBoNhap">Bỏ các thay đổi chưa lưu</button>';
    if (khacGoc) h += '<button type="button" class="sua-btn" id="suaVeGoc">Về bản gốc studio dựng</button>';
    h += '</div>';
    h += '<p class="sua-p" style="margin-top:16px">Mẹo: chạm thẳng vào ảnh bất kỳ trên thiệp để đổi ảnh / canh khung. Nháp tự giữ trên máy này; bấm <b>Lưu</b> để đưa lên web.</p>';
    return h + '</div>';
  }
  function ganInfo(){
    var hen = null;
    function capTen(){
      clearTimeout(hen);
      hen = setTimeout(function(){
        var cr = sachTen($('#suaCr').value), cd = sachTen($('#suaCd').value);
        if (!cr || !cd || (cr === draft.ten_cr && cd === draft.ten_cd)) return;
        doi(function(o){ o.ten_cr = cr; o.ten_cd = cd; }, true);
      }, 350);
    }
    $('#suaCr').addEventListener('input', capTen); $('#suaCd').addEventListener('input', capTen);
    $('#suaSw').addEventListener('click', function(){
      doi(function(o){ var t = o.ten_cr; o.ten_cr = o.ten_cd; o.ten_cd = t; });
      toast('Đã đổi chỗ tên cô dâu ⇄ chú rể');
    });
    $('#suaDoiBo').addEventListener('click', function(){ moSheet('bo'); });
    $$('.sua-mini[data-o]', sheet).forEach(function(b){ b.addEventListener('click', function(){ moO(b.getAttribute('data-o')); }); });
    $('#suaThem').addEventListener('click', function(){ moSheet('them'); });
    var bn = $('#suaBoNhap');
    if (bn) bn.addEventListener('click', function(){ doi(function(o){ var l = clone(live); FIELDS.forEach(function(k){ o[k] = l[k]; }); }); toast('Đã bỏ thay đổi — thiệp về như trên web'); });
    var vg = $('#suaVeGoc');
    if (vg) vg.addEventListener('click', function(){ doi(function(o){ var g = clone(goc); FIELDS_GOC.forEach(function(k){ o[k] = g[k]; }); }); toast('Đã về bản gốc — bấm Lưu để đưa lên web'); });
    ganChonNhac();
  }
  function sachTen(s){ return String(s || '').replace(/[<>{}\[\]`"\\|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30); }
  /* giống thiep_chung.sach_chu() của bot: bỏ ký tự điều khiển + ký tự cấm, gọn khoảng trắng, cắt theo số chữ (không cắt đôi emoji) */
  function sachChu(s, nhieuDong, dai){
    s = String(s || '').replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '').replace(/[<>{}\[\]`\\|]/g, '');
    s = nhieuDong ? s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() : s.replace(/\s+/g, ' ').trim();
    var a = Array.from(s), n = dai || 160;
    return a.length > n ? a.slice(0, n).join('').trim() : s;
  }
  function ytId(v){
    v = String(v || '').trim(); if (!v) return '';
    var m = /(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/.exec(v) || /^([\w-]{11})$/.exec(v);
    return m ? m[1] : null;
  }

  /* ---------------- THIỆP RIÊNG: tên, lịch lễ, gia đình, SĐT, mừng cưới, clip, lời, nhạc ---------------- */
  function oNhap(nhan, attr, gt, loai){
    return '<label class="sua-o">' + esc(nhan) + '<input ' + attr + ' type="' + (loai || 'text') + '" value="' + esc(gt) + '" autocomplete="off"></label>';
  }
  function oVung(nhan, k, gt, goiY){
    return '<label class="sua-o">' + esc(nhan) + '<textarea data-k="' + k + '" rows="3" maxlength="600"' + (goiY ? ' placeholder="' + esc(goiY) + '"' : '') + '>' + esc(gt) + '</textarea></label>';
  }
  /* ---------------- NHẠC NỀN: 3 bài có sẵn + kho nhạc studio (repo nhac-thiep: tải thẳng lên GitHub hoặc qua Drive) ---------------- */
  var NHAC_KHO = 'https://phamducstudio-creator.github.io/nhac-thiep/';
  var KHO_GH = 'https://github.com/phamducstudio-creator/nhac-thiep';
  var NHAC_SAN = [['canon-in-d', 'Canon in D', 'piano & dây, trang trọng', '/images/nhac-canon-in-d.mp3'],
    ['minuet-in-g', 'Minuet in G', 'piano & hộp nhạc, trong trẻo', '/images/nhac-minuet-in-g.mp3'],
    ['gymnopedie', 'Gymnopédie số 1', 'piano, nhẹ nhàng', '/images/nhac-gymnopedie.mp3']];
  var kho = null, khoLoi = [], khoHua = null, nghe = null, choBai = null;
  function taiKho(){   /* list.json của kho (bỏ qua bộ nhớ đệm) → cập nhật ô chọn nhạc nếu đang mở */
    if (khoHua) return khoHua;
    khoHua = fetch(NHAC_KHO + 'list.json?cb=' + Date.now(), { cache: 'no-store' }).then(function(r){ if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function(j){
        kho = ((j && j.bai) || []).filter(function(b){ return b && b.id && b.file; }); khoLoi = (j && j.loi) || [];
        khoHua = null; capNhatNhac(); return kho;
      }).catch(function(){ khoHua = null; return kho || []; });
    return khoHua;
  }
  function baiKho(v){ var m = /^d:([-\w]{10,})$/.exec(v || ''); return (m && kho) ? (kho.filter(function(b){ return b.id === m[1]; })[0] || null) : null; }
  function nhacTat(v){ return /^(khong|không|0|off|tat|tắt)$/i.test(String(v || '').trim()); }
  function tenNhac(v){
    v = String(v || '').trim();
    if (!v) return 'mặc định (Canon in D)';
    if (nhacTat(v)) return 'không có nhạc';
    var s = NHAC_SAN.filter(function(x){ return x[0] === v; })[0]; if (s) return s[1];
    var b = baiKho(v); if (b) return b.ten;
    if (/^d:/.test(v)) return 'bài trong kho';
    return v.indexOf(',') > 0 ? 'danh sách bài riêng' : 'bài riêng';
  }
  function urlNhac(v){
    v = String(v || '').split(',')[0].trim() || 'canon-in-d';
    var s = NHAC_SAN.filter(function(x){ return x[0] === v; })[0]; if (s) return s[3];
    var m = /^d:([-\w]{10,})$/.exec(v); if (m) return NHAC_KHO + 'n/' + m[1] + '.mp3';
    if (/^(https:\/\/|\/?images\/|\/thiep\/)\S+\.(mp3|m4a|aac|ogg|oga|wav)(\?\S*)?$/i.test(v)) return /^images\//.test(v) ? '/' + v : v;
    return '';
  }
  function mmss(g){ g = Math.round(+g || 0); return g > 0 ? (Math.floor(g / 60) + ':' + ('0' + g % 60).slice(-2)) : ''; }
  function tuyChonNhac(v){   /* các lựa chọn của ô Nhạc nền (thiệp mẫu chỉ liệt kê kho chung — thiệp mẫu là trang công khai) */
    var o = [], co = false;
    function op(val, nhan){ if (val === v) co = true; o.push('<option value="' + esc(val) + '"' + (val === v ? ' selected' : '') + '>' + esc(nhan) + '</option>'); }
    if (!v) op('', 'Mặc định (Canon in D)');
    NHAC_SAN.forEach(function(x){ op(x[0], x[1] + ' — ' + x[2]); });
    var chung = (kho || []).filter(function(b){ return !b.rieng; }), rieng = (kho || []).filter(function(b){ return b.rieng; });
    var nhom = [['Kho nhạc chung', chung]]; if (THIEP) nhom.push(['Kho nhạc riêng (chỉ thiệp chọn mới phát)', rieng]);
    nhom.forEach(function(g){
      if (!g[1].length) return;
      o.push('<optgroup label="' + esc(g[0]) + '">');
      g[1].forEach(function(b){ op('d:' + b.id, b.ten + (b.giay ? ' · ' + mmss(b.giay) : '')); });
      o.push('</optgroup>');
    });
    op('khong', 'Không có nhạc');
    if (v && !co) {
      var b = baiKho(v);
      o.unshift('<option value="' + esc(v) + '" selected>' + esc(b ? (b.ten + ' (kho riêng)') : (/^d:/.test(v) ? (kho ? 'Bài trong kho (không còn trong danh sách)' : 'Bài trong kho (đang tải danh sách…)') : 'Bài riêng của cặp đôi (đang dùng)')) + '</option>');
    }
    return o.join('');
  }
  function ttNhac(){
    if (choBai) return '⏳ Đang chờ bài mới vào kho — khoảng 1–3 phút sau khi bấm “Commit changes” trên GitHub. Bài vào kho là tự chọn cho thiệp này.';
    if (!kho) return 'Đang tải danh sách kho nhạc…';
    var n = THIEP ? kho.length : kho.filter(function(b){ return !b.rieng; }).length;
    return (n ? (THIEP ? 'Kho đang có ' : 'Kho chung đang có ') + n + ' bài. ' : (THIEP ? 'Kho chưa có bài nào. ' : 'Kho chung chưa có bài nào. ')) + (THIEP
      ? '“Thêm bài mới” = tải file nhạc lên kho RIÊNG: chỉ thiệp chọn bài đó mới phát, không hiện công khai (hợp với bài hát có bản quyền).'
      : '“Thêm bài mới” = tải file nhạc lên kho CHUNG: thiệp mẫu và khách đặt thiệp đều chọn được — nên dùng nhạc không lời được phép dùng.');
  }
  function oChonNhac(v){
    return '<label class="sua-o">Bài phát khi khách mở thiệp<select data-nhac="1">' + tuyChonNhac(v) + '</select></label>' +
      '<div class="sua-row" style="justify-content:flex-start;margin-top:-2px">' +
      '<button type="button" class="sua-btn" id="suaNghe">' + ((nghe && !nghe.paused) ? '⏸ Dừng nghe' : '▶ Nghe thử') + '</button>' +
      '<button type="button" class="sua-btn" id="suaThemNhac">＋ Thêm bài mới</button></div>' +
      '<p class="sua-p" id="suaNhacTT">' + esc(ttNhac()) + '</p>';
  }
  function capNhatNhac(){   /* cập nhật ô chọn tại chỗ — không vẽ lại cả bảng (khỏi mất chữ đang gõ ở ô khác) */
    var sel = sheet ? $('select[data-nhac]', sheet) : null; if (sel && draft) sel.innerHTML = tuyChonNhac(draft.nhac);
    var tt = sheet ? $('#suaNhacTT', sheet) : null; if (tt) tt.textContent = ttNhac();
  }
  function dungNghe(){
    if (nghe) { try { nghe.pause(); } catch (e) {} }
    var b = sheet ? $('#suaNghe', sheet) : null; if (b) b.textContent = '▶ Nghe thử';
  }
  function ganChonNhac(){
    var sel = $('select[data-nhac]', sheet); if (!sel) return;
    sel.addEventListener('change', function(){
      var v = sel.value; dungNghe();
      if (v !== draft.nhac) doi(function(o){ o.nhac = v; }, true);
      toast('Nhạc nền: ' + tenNhac(v));
    });
    $('#suaNghe', sheet).addEventListener('click', function(){
      if (nghe && !nghe.paused) { dungNghe(); return; }
      var v = sel.value; if (nhacTat(v)) { toast('Đang chọn “Không có nhạc”'); return; }
      var u = urlNhac(v); if (!u) { toast('Bài này chưa nghe thử được ở đây'); return; }
      if (!nghe) {
        nghe = new Audio();
        nghe.addEventListener('ended', dungNghe); nghe.addEventListener('pause', dungNghe);
        nghe.addEventListener('error', function(){ dungNghe(); toast('Bài này chưa phát được (bài vừa tải lên thì đợi 1–2 phút)'); });
      }
      if (nghe.getAttribute('src') !== u) nghe.src = u;
      nghe.volume = 0.8;
      var pr = nghe.play(); if (pr && pr.catch) pr.catch(function(){ dungNghe(); });
      this.textContent = '⏸ Dừng nghe';
    });
    $('#suaThemNhac', sheet).addEventListener('click', function(){
      var w = window.open(KHO_GH + '/upload/main/tai-len' + (THIEP ? '/rieng' : ''), '_blank');
      if (w) { try { w.opener = null; } catch (e) {} } else toast('Trình duyệt chặn mở tab — cho phép cửa sổ bật lên rồi bấm lại', 4500);
      choBaiMoi();
    });
  }
  /* bấm "Thêm bài mới" → theo dõi list.json (15 giây/lần, tối đa 15 phút): bài mới vào kho thì tự chọn cho thiệp; file lỗi thì báo */
  function choBaiMoi(){
    var ids = {}, loiCu = {};
    (kho || []).forEach(function(b){ ids[b.id] = 1; });
    khoLoi.forEach(function(x){ loiCu[x.id + '|' + x.luc] = 1; });
    if (choBai) clearTimeout(choBai.hen);
    var cb = choBai = { t0: Date.now(), ids: ids, loi: loiCu, hen: null };
    capNhatNhac();
    function vong(){
      if (choBai !== cb) return;
      if (Date.now() - cb.t0 > 15 * 60e3) { choBai = null; capNhatNhac(); return; }
      cb.hen = setTimeout(function(){
        if (choBai !== cb) return;
        if (document.hidden) { vong(); return; }
        taiKho().then(function(){
          if (choBai !== cb) return;
          var moi = (kho || []).filter(function(b){ return !cb.ids[b.id]; });
          var loiMoi = khoLoi.filter(function(x){ return x.nguon === 'tai' && !cb.loi[x.id + '|' + x.luc]; });
          loiMoi.forEach(function(x){ cb.loi[x.id + '|' + x.luc] = 1; });
          if (loiMoi.length) toast('File “' + loiMoi[0].ten + '” chưa dùng được: ' + loiMoi[0].ly_do, 6000);
          if (moi.length) {
            var b = moi[0]; choBai = null;
            doi(function(o){ o.nhac = 'd:' + b.id; }, true);
            capNhatNhac();
            toast('Bài “' + b.ten + '” đã vào kho — đã chọn cho thiệp này. Bấm Lưu để đưa lên web.', 6000);
            return;
          }
          vong();
        });
      }, 15000);
    }
    vong();
  }
  function veThongTin(){
    var d = draft, le = d.le;
    var h = dauSheet('Thông tin thiệp', d.ten_cd + ' & ' + d.ten_cr + ' — sửa ô nào thiệp đổi ngay ô đó');
    h += tabsInfo() + '<div class="sua-bd">';
    h += '<div class="sua-f"><div><label for="suaCr">Chú rể</label><input id="suaCr" maxlength="30" autocomplete="off" value="' + esc(d.ten_cr) + '"></div>' +
      '<button type="button" class="sua-sw" id="suaSw" aria-label="Đổi chỗ tên cô dâu và chú rể" title="Đổi chỗ">⇄</button>' +
      '<div><label for="suaCd">Cô dâu</label><input id="suaCd" maxlength="30" autocomplete="off" value="' + esc(d.ten_cd) + '"></div></div>';
    LE.forEach(function(x){
      var e = le[x[0]];
      h += '<p class="sua-lbl mt">' + esc(x[1]) + (x[0] === 'vu_quy' ? ' (bỏ trống nếu không có)' : '') + '</p><div class="sua-g2">' +
        oNhap('Ngày', 'data-le="' + x[0] + '.ngay"', e.ngay, 'date') + oNhap('Giờ', 'data-le="' + x[0] + '.gio"', e.gio, 'time') + '</div>' +
        oNhap('Nơi tổ chức', 'data-le="' + x[0] + '.noi" maxlength="160" placeholder="vd: Tư gia nhà gái · 12 Trần Hưng Đạo, Ninh Kiều"', e.noi) +
        (x[0] === 'tiec' ? oNhap('Ghi chú sau giờ (không bắt buộc)', 'data-le="tiec.ghi" maxlength="80" placeholder="vd: đón khách trước 30 phút"', e.ghi) : '');
    });
    h += oNhap('Địa chỉ cho bản đồ (bỏ trống = nơi tiệc)', 'data-k="ban_do" maxlength="160"', d.ban_do);
    h += '<p class="sua-lbl mt">Gia đình (hiện dưới tên dâu rể)</p><div class="sua-g2">' +
      oNhap('Cha chú rể', 'data-k="cha_cr" maxlength="60"', d.cha_cr) + oNhap('Mẹ chú rể', 'data-k="me_cr" maxlength="60"', d.me_cr) +
      oNhap('Cha cô dâu', 'data-k="cha_cd" maxlength="60"', d.cha_cd) + oNhap('Mẹ cô dâu', 'data-k="me_cd" maxlength="60"', d.me_cd) + '</div>';
    h += '<p class="sua-lbl mt">Số điện thoại — nút Gọi + nhận xác nhận qua Zalo</p><div class="sua-g2">' +
      oNhap('Chú rể', 'data-k="sdt_cr" inputmode="tel" maxlength="15"', d.sdt_cr, 'tel') + oNhap('Cô dâu', 'data-k="sdt_cd" inputmode="tel" maxlength="15"', d.sdt_cd, 'tel') + '</div>';
    h += '<p class="sua-lbl mt">Mừng cưới qua QR (bỏ trống = ẩn khối)</p><div class="sua-g2">' +
      oNhap('Ngân hàng', 'data-k="vietqr_bank" maxlength="40" placeholder="vd: Vietcombank"', d.vietqr_bank) +
      oNhap('Số tài khoản', 'data-k="vietqr_stk" maxlength="30" inputmode="numeric"', d.vietqr_stk) + '</div>' +
      oNhap('Tên chủ tài khoản', 'data-k="vietqr_ten" maxlength="60" placeholder="VIẾT HOA KHÔNG DẤU"', d.vietqr_ten);
    h += '<p class="sua-lbl mt">Clip pre-wedding</p>' + oNhap('Link YouTube (bỏ trống = ẩn khối clip)', 'data-k="youtube_id" maxlength="120" placeholder="https://youtu.be/…"', d.youtube_id);
    h += '<p class="sua-lbl mt">Lời trên thiệp (bỏ trống = câu mặc định)</p>' +
      oVung('Lời ngỏ (dưới tên dâu rể)', 'loi_ngo', d.loi_ngo, 'Có những khoảnh khắc chỉ cần một ánh nhìn…') +
      oVung('Câu chuyện (trên ảnh dâu rể)', 'cau_chuyen', d.cau_chuyen, 'Với cả thế giới, bạn có thể chỉ là một người…');
    h += '<p class="sua-lbl mt">Nhạc nền</p>' + oChonNhac(d.nhac);
    h += '<p class="sua-lbl mt">Ảnh trong thiệp (' + cacO(draft).length + ' ô)</p><div class="sua-hang">';
    cacO(draft).forEach(function(id){
      if (id === 'poster' && !draft.youtube_id) return;
      h += '<button type="button" class="sua-mini" data-o="' + esc(id) + '"><img src="' + esc(srcO(draft, id) || '') + '" alt="" loading="lazy"><span>' + esc(tenNgan(id)) + ' · ' + esc(soO(draft, id) || '—') + '</span></button>';
    });
    h += '<button type="button" class="sua-mini them" id="suaThem"><i>+</i><span>Thêm ảnh</span></button></div>';
    h += '<p class="sua-p">Chỉ chọn được ảnh đã có trong bộ ảnh của thiệp. Muốn thêm ảnh mới: gửi ảnh cho Claude.</p>';
    var coNhap = soThayDoi() > 0, khacGoc = goc && dongThayDoi(veGoc(draft), draft).length > 0;
    h += '<div class="sua-row" style="justify-content:flex-start;margin-top:18px">';
    if (coNhap) h += '<button type="button" class="sua-btn" id="suaBoNhap">Bỏ các thay đổi chưa lưu</button>';
    if (khacGoc) h += '<button type="button" class="sua-btn" id="suaVeGoc">Ảnh &amp; tên về như lúc giao thiệp</button>';
    h += '</div><p class="sua-p" style="margin-top:14px">Nháp tự giữ trên máy này; bấm <b>Lưu</b> để đưa lên web. Chữ riêng (SĐT, địa chỉ, tài khoản…) được mã hoá trước khi gửi.</p>';
    return h + '</div>';
  }
  function ganThongTin(){
    var henTen = null, hen = null;
    function capTen(){
      clearTimeout(henTen);
      henTen = setTimeout(function(){
        var cr = sachTen($('#suaCr').value), cd = sachTen($('#suaCd').value);
        if (!cr || !cd || (cr === draft.ten_cr && cd === draft.ten_cd)) return;
        doi(function(o){ o.ten_cr = cr; o.ten_cd = cd; }, true);
      }, 350);
    }
    $('#suaCr').addEventListener('input', capTen); $('#suaCd').addEventListener('input', capTen);
    $('#suaSw').addEventListener('click', function(){ doi(function(o){ var t = o.ten_cr; o.ten_cr = o.ten_cd; o.ten_cd = t; }); toast('Đã đổi chỗ tên cô dâu ⇄ chú rể'); });
    function apO(el){
      var v = String(el.value || ''), k = el.getAttribute('data-k'), l = el.getAttribute('data-le');
      if (k) {
        if (k === 'sdt_cr' || k === 'sdt_cd') v = v.replace(/[^\d+]/g, '').slice(0, 13);
        else if (k === 'youtube_id') { var y = ytId(v); v = y === null ? v.trim() : y; }
        else if (k === 'nhac') v = String(v);
        else v = sachChu(v, k === 'loi_ngo' || k === 'cau_chuyen', (k === 'loi_ngo' || k === 'cau_chuyen') ? 600 : (/^(cha|me)_/.test(k) ? 60 : 160));
        if (draft[k] === v) return;
        doi(function(o){ o[k] = v; }, true);
      } else if (l) {
        var p = l.split('.'); v = sachChu(v, false, p[1] === 'ghi' ? 80 : 160);
        if (draft.le[p[0]][p[1]] === v) return;
        doi(function(o){ o.le[p[0]][p[1]] = v; }, true);
      }
    }
    $$('[data-k],[data-le]', sheet).forEach(function(el){
      var tuc = el.tagName === 'SELECT' || el.type === 'date' || el.type === 'time';
      el.addEventListener(tuc ? 'change' : 'input', function(){ clearTimeout(hen); if (tuc) apO(el); else hen = setTimeout(function(){ apO(el); }, 450); });
      if (!tuc) el.addEventListener('change', function(){ clearTimeout(hen); apO(el); });
    });
    $$('.sua-mini[data-o]', sheet).forEach(function(b){ b.addEventListener('click', function(){ moO(b.getAttribute('data-o')); }); });
    $('#suaThem').addEventListener('click', function(){ moSheet('them'); });
    var bn = $('#suaBoNhap');
    if (bn) bn.addEventListener('click', function(){ doi(function(o){ var l = clone(live); FIELDS.forEach(function(k){ o[k] = l[k]; }); }); toast('Đã bỏ thay đổi — thiệp về như trên web'); });
    var vg = $('#suaVeGoc');
    if (vg) vg.addEventListener('click', function(){ doi(function(o){ var g = clone(goc); FIELDS_GOC.forEach(function(k){ o[k] = g[k]; }); }); toast('Ảnh & tên đã về như lúc giao — bấm Lưu để đưa lên web'); });
    ganChonNhac();
  }

  /* ---------------- HIỆU ỨNG & PHẦN (thiệp mẫu + thiệp riêng) ---------------- */
  function tabsInfo(){
    var tuy = tabInfo === 'tuy';
    return '<div class="sua-tabs" role="tablist">' +
      '<button type="button" class="sua-tab' + (tuy ? '' : ' on') + '" data-ti="chinh" role="tab" aria-selected="' + !tuy + '">' + (THIEP ? 'Thông tin' : 'Tên &amp; bộ ảnh') + '</button>' +
      '<button type="button" class="sua-tab' + (tuy ? ' on' : '') + '" data-ti="tuy" role="tab" aria-selected="' + tuy + '">Hiệu ứng &amp; phần</button></div>';
  }
  function tenCT(k){ var x = CONG_TAC.filter(function(y){ return y[0] === k; })[0]; return x ? x[1] : k; }
  function goiYCT(k){
    var st = kieuThiep(), el;
    if (k === 'hoa' && st === 'phim-xua') return 'Kiểu Phim Xưa vốn không có hoa rơi';
    if (k === 'kb' && (st === 'phim-xua' || st === 'han-quoc' || st === 'song-hy')) return 'Kiểu thiệp này vốn không phóng ảnh bìa';
    if (k === 'hien') return 'Khách cuộn tới đâu, khối đó hiện dần lên (lúc sửa luôn hiện sẵn)';
    if (k === 'phong_bi') return (phongBiMacDinh() ? 'Kiểu Song Hỷ mặc định có. ' : 'Mặc định chỉ kiểu Song Hỷ có. ') + 'Lúc sửa không hiện — bấm “Xem thử” để thấy';
    if (k === 'bay') return batGoc(draft, 'chuc') ? 'Lời chúc của khách hiện lơ lửng trên màn hình (lúc sửa ẩn)' : 'Đang tắt theo phần Lời chúc';
    if (/^tho[1-4]$/.test(k)) { el = $('#' + KHOI_THO[k.slice(3)]); return (el && el.hidden) ? 'Khối này đang không hiện (ít ảnh câu chuyện)' : ''; }
    if ((k === 'loi_ngo' || k === 'cau_chuyen') && THIEP) return 'Sửa chữ ở tab Thông tin';
    if (k === 'qr' && THIEP && !(draft.vietqr_bank && draft.vietqr_stk)) return 'Chưa có số tài khoản — điền ở tab Thông tin';
    if (k === 'ban_do' && THIEP && !duLieuDay().map_diadiem) return 'Chưa có địa chỉ — điền ở tab Thông tin';
    if (k === 'quang_cao') return 'Nên giữ: khách dự tiệc sắp cưới bấm vào xem ưu đãi của studio';
    return '';
  }
  function congTac(k, nhan){
    var g = goiYCT(k), mo = k === 'bay' && !batGoc(draft, 'chuc');
    return '<label class="sua-ct' + (mo ? ' mo' : '') + '"><span class="tx"><b>' + esc(nhan) + '</b>' + (g ? '<small>' + esc(g) + '</small>' : '') + '</span>' +
      '<input type="checkbox" role="switch" data-ct="' + k + '"' + (batGoc(draft, k) ? ' checked' : '') + '><i aria-hidden="true"></i></label>';
  }
  function oVungT(nhan, attr, gt, goiY, dai){
    return '<label class="sua-o">' + esc(nhan) + '<textarea ' + attr + ' rows="3" maxlength="' + dai + '"' + (goiY ? ' placeholder="' + esc(goiY) + '"' : '') + '>' + esc(gt) + '</textarea></label>';
  }
  function chuGoc(sel, du){ var e = $(sel); return (e && (e.getAttribute('data-goc') || e.textContent)) || du || ''; }   /* chữ mặc định trên thiệp */
  function veTuy(){
    var d = draft, td = d.tuy.td || {};
    var h = dauSheet('Hiệu ứng & phần', THIEP ? ('Thiệp ' + d.ten_cd + ' & ' + d.ten_cr) : ('Mẫu ' + M.ten + ' · ' + M.mau));
    h += tabsInfo() + '<div class="sua-bd">';
    h += '<p class="sua-lbl">Hiệu ứng</p><div class="sua-cts">' + HIEU_UNG.map(function(x){ return congTac(x[0], x[1]); }).join('') + '</div>';
    h += '<p class="sua-lbl mt">Các phần trên thiệp — tắt là khách không thấy</p><div class="sua-cts">' + PHAN.map(function(x){ return congTac(x[0], x[1]); }).join('') + '</div>';
    h += '<p class="sua-lbl mt">Tiêu đề từng khối (bỏ trống = chữ mặc định)</p><div class="sua-g2">';
    TIEU_DE.forEach(function(x){
      if (x[0] === 'ghi') return;
      h += oNhap(x[1], 'data-tdk="' + x[0] + '" maxlength="40" placeholder="' + esc(chuGoc(':not(input)[data-td="' + x[0] + '"]', x[2])) + '"', td[x[0]] || '');
    });
    h += '</div><p class="sua-p" style="margin-top:0">Chữ uốn lượn (Our Story, RSVP…) mặc định tiếng Anh; gõ tiếng Việt có dấu vẫn được, kiểu chữ tự đổi cho đủ dấu.</p>';
    h += '<p class="sua-lbl mt">Thơ / câu trích (bỏ trống = câu mặc định)</p>';
    THO.forEach(function(x){ h += oVungT(x[1], 'data-tho="' + x[0] + '"', d.tho[x[0]] || '', chuGoc('#tho' + x[0]), 200); });
    h += '<p class="sua-lbl mt">Lưu ý cho khách — hiện dưới phần địa điểm (bỏ trống = không hiện)</p>' +
      oNhap('Tiêu đề khung', 'data-tdk="ghi" maxlength="40" placeholder="Lưu ý cho khách"', td.ghi || '') +
      oVungT('Nội dung', 'data-ghi="1"', d.ghi_them, 'vd: Nhà hàng có chỗ gửi xe máy · Có xe đưa đón từ nhà trai lúc 9:30', 300);
    if (THIEP) h += '<p class="sua-p" style="margin-top:0">Thơ và lưu ý được mã hoá cùng phần riêng — chỉ ai có link mới đọc được.</p>';
    if ((d.tuy.tat || []).length || (d.tuy.bat || []).length) {
      h += '<div class="sua-row" style="justify-content:flex-start;margin-top:18px"><button type="button" class="sua-btn" id="suaBatHet">Bật/tắt về mặc định của mẫu</button></div>';
    }
    h += '<p class="sua-p" style="margin-top:14px">Bật/tắt là thiệp đổi ngay. Bấm <b>Xem thử</b> để xem như khách, <b>Lưu</b> để đưa lên web.</p>';
    return h + '</div>';
  }
  var KHOI_CT = { hoa: '.cover', kb: '.cover', loi_ngo: '#loiNgo', cau_chuyen: '#storySec', tho1: '#col3Sec', tho2: '#bleedSec', tho3: '#ovSec', tho4: '#off2Sec',
    lich: '#timeSec', dem: '#timeSec', luu_lich: '#timeSec', ban_do: '#evSec', rsvp: '#rsvp', qr: '#mungSec', chuc: '#chucSec', quang_cao: '.foot' };
  function denKhoi(k){   /* cuộn thiệp tới khối vừa bật/tắt (khối vừa ẩn → khối ngay trên nó) */
    var el = KHOI_CT[k] ? $(KHOI_CT[k]) : null; if (!el) return;
    if (el.id === 'loiNgo') el = el.closest('.sec') || el;
    while (el && (el.hidden || !el.getClientRects().length)) el = el.previousElementSibling;
    if (!el) return;
    var dy = el.getBoundingClientRect().top - 58;
    if (Math.abs(dy) > 6) window.scrollBy({ top: dy, behavior: 'smooth' });
  }
  function ganTuy(){
    $$('[data-ct]', sheet).forEach(function(el){
      el.addEventListener('change', function(){
        var k = el.getAttribute('data-ct'), bat = el.checked;
        doi(function(o){ datCongTac(o, k, bat); }, true);
        veSheet();
        var el2 = sheet.querySelector('[data-ct="' + k + '"]'); if (el2) try { el2.focus({ preventScroll: true }); } catch (e) {}
        denKhoi(k);
        toast((bat ? 'Đã bật: ' : 'Đã tắt: ') + tenCT(k) + ((k === 'phong_bi' || k === 'hien' || k === 'bay') ? ' — bấm Xem thử để thấy' : ''));
      });
    });
    var hen = null;
    function apChu(el){
      var v, k;
      if ((k = el.getAttribute('data-tdk'))) {
        v = sachChu(el.value, false, 40);
        if (((draft.tuy.td || {})[k] || '') === v) return;
        doi(function(o){ var t = clone(o.tuy); t.td = t.td || {}; if (v) t.td[k] = v; else delete t.td[k]; o.tuy = gonTuy(t); }, true);
      } else if ((k = el.getAttribute('data-tho'))) {
        v = sachChu(el.value, true, 200);
        if ((draft.tho[k] || '') === v) return;
        doi(function(o){ var t = clone(o.tho); if (v) t[k] = v; else delete t[k]; o.tho = gonTho(t); }, true);
      } else if (el.hasAttribute('data-ghi')) {
        v = sachChu(el.value, true, 300);
        if (draft.ghi_them === v) return;
        doi(function(o){ o.ghi_them = v; }, true);
      }
    }
    $$('[data-tdk],[data-tho],[data-ghi]', sheet).forEach(function(el){
      el.addEventListener('input', function(){ clearTimeout(hen); hen = setTimeout(function(){ apChu(el); }, 450); });
      el.addEventListener('change', function(){ clearTimeout(hen); apChu(el); });
    });
    var bh = $('#suaBatHet');
    if (bh) bh.addEventListener('click', function(){
      doi(function(o){ var t = clone(o.tuy); delete t.tat; delete t.bat; o.tuy = gonTuy(t); });
      toast('Hiệu ứng & các phần đã về mặc định của mẫu');
    });
  }

  function veThem(){
    var h = dauSheet('Thêm ảnh vào thiệp', 'Ảnh thêm vào cuối phần câu chuyện');
    h += '<div class="sua-bd"><p class="sua-lbl">' + esc(tenBo(draft.album)) + '</p><div class="sua-grid" id="suaGrid"><p class="sua-p">Đang tải ảnh của bộ…</p></div>' +
      '<p class="sua-p">Ảnh mờ là ảnh đang dùng. Chọn ảnh chưa dùng để thêm; muốn đặt ở khung khác thì mở ảnh đó → tab “Thứ tự”.</p></div>';
    return h;
  }
  function ganThem(){
    taiBo(draft.album).then(function(b){
      var g = $('#suaGrid'); if (!g || sheetId !== 'them') return;
      g.innerHTML = b.ds.map(function(p){
        var ai = aiDung(draft, p.n, '');
        return '<button type="button" class="sua-th' + (ai.length ? ' mo' : '') + '" data-n="' + esc(p.n) + '"><img src="' + esc(anh(draft.album, p.n, true)) + '" alt="" loading="lazy">' +
          (ai.length ? '<span class="dung">' + esc(ai.map(tenNgan).join(' · ')) + '</span>' : '') + '<span class="so">' + esc(p.n) + '</span>' + (p.r > 1.05 ? '<span class="huong" title="Ảnh ngang"></span>' : '') + '</button>';
      }).join('');
      $$('.sua-th', g).forEach(function(btn){ btn.addEventListener('click', function(){
        var n = btn.getAttribute('data-n'), ai = aiDung(draft, n, '');
        if (ai.length) { toast('Ảnh ' + n + ' đang dùng ở ' + tenO(ai[0]).toLowerCase()); return; }
        doi(function(o){ o.anh_ds.push(n); }, true);
        var id = 'ds:' + (draft.anh_ds.length - 1);
        toast('Đã thêm ảnh ' + n + ' → ' + tenO(id).toLowerCase());
        moO(id);
      }); });
    }).catch(function(){ var g = $('#suaGrid'); if (g) g.innerHTML = '<p class="sua-p">Không tải được danh sách ảnh.</p>'; });
  }

  var boChon = null;
  function veBo(){
    var h = dauSheet('Đổi bộ ảnh', 'Chỉ bộ studio & ngoại cảnh (không dùng phóng sự)');
    h += '<div class="sua-bd">';
    if (boChon) {
      h += '<div class="sua-note">Đổi mẫu <b>' + esc(M.ten) + '</b> sang bộ <b>' + esc(boChon.tag) + '</b>' + (boChon.cap ? ' (' + esc(boChon.cap) + ')' : '') + '?<br>' +
        'Ảnh trong thiệp sẽ được chọn lại tự động từ bộ mới, tên dâu rể điền theo album — anh kiểm tra lại ai là cô dâu, ai là chú rể.' +
        '<div class="sua-row"><button type="button" class="sua-btn vang" id="suaBoCo">Đổi sang bộ này</button><button type="button" class="sua-btn" id="suaBoKhong">Thôi</button></div></div>';
    }
    h += '<div class="sua-bos" id="suaBos"><p class="sua-p">Đang tải danh sách bộ ảnh…</p></div></div>';
    return h;
  }
  function ganBo(){
    if (boChon) {
      $('#suaBoCo').addEventListener('click', function(){ var b = boChon; boChon = null; doiBo(b); });
      $('#suaBoKhong').addEventListener('click', function(){ boChon = null; veSheet(); });
    }
    taiDanhSachBo().then(function(ds){
      var box = $('#suaBos'); if (!box || sheetId !== 'bo') return;
      var dungO = {}; MAU.forEach(function(x){ if (x.key !== KEY) dungO[x.album] = x.ten; });
      var h = '', nhom = '';
      ds.forEach(function(b){
        if (b.nhom !== nhom) { nhom = b.nhom; h += '<p class="sua-lbl' + (h ? ' mt' : '') + '">' + esc(nhom) + '</p>'; }
        var cur = b.album === draft.album;
        h += '<button type="button" class="sua-bo' + (cur ? ' cur' : '') + '" data-a="' + esc(b.album) + '"><img src="' + esc('/images/album-' + b.album + '-bia.jpg') + '" alt="" loading="lazy"><span class="tx"><b>' + esc(maBo(b.album) + ' · ' + b.tag) + '</b><small>' + esc([b.cap, b.so].filter(Boolean).join(' · ')) + '</small>' +
          (cur ? '<span class="tag">Đang dùng cho mẫu này</span>' : (dungO[b.album] ? '<span class="tag" style="background:rgba(255,255,255,.85)">Đang dùng ở mẫu ' + esc(dungO[b.album]) + '</span>' : '')) + '</span></button>';
      });
      box.innerHTML = h || '<p class="sua-p">Không đọc được danh sách bộ ảnh.</p>';
      $$('.sua-bo[data-a]', box).forEach(function(btn){ btn.addEventListener('click', function(){
        var a = btn.getAttribute('data-a'); if (a === draft.album) { toast('Mẫu này đang dùng bộ đó'); return; }
        boChon = ds.filter(function(x){ return x.album === a; })[0]; veSheet();
        var bd = $('.sua-bd', sheet); if (bd) bd.scrollTop = 0;
      }); });
    }).catch(function(){ var box = $('#suaBos'); if (box) box.innerHTML = '<p class="sua-p">Không tải được danh sách bộ ảnh — kiểm tra mạng.</p>'; });
  }
  function doiBo(b){
    toast('Đang lấy ảnh của bộ mới…');
    taiBo(b.album).then(function(info){
      var goc0 = biaGoc(b.album);
      var pics = info.ds.filter(function(p){ return p.n !== goc0; });
      if (pics.length < 3) { toast('Bộ này ít ảnh quá, chọn bộ khác'); return; }
      var dung = {};
      function lay(ds){ for (var i = 0; i < ds.length; i++) if (!dung[ds[i].n]) { dung[ds[i].n] = 1; return ds[i].n; } return ''; }
      var doc = pics.filter(function(p){ return p.r && p.r < 0.95; }), ngang = pics.filter(function(p){ return p.r > 1.05; });
      var cr = lay(doc) || lay(pics), cd = lay(doc) || lay(pics), poster = lay(ngang) || lay(pics);
      var ds = pics.filter(function(p){ return !dung[p.n]; }).map(function(p){ return p.n; }).slice(0, 8);
      var ten = (info.cap || b.cap || '').split('&').map(function(s){ return sachTen(s); });
      doi(function(o){
        o.album = b.album; o.bia = ''; o.bia_pos = ''; o.anh_cr = cr; o.anh_cd = cd; o.poster = poster; o.poster_pos = ''; o.anh_ds = ds; o.pos = {};
        if (ten.length === 2 && ten[0] && ten[1]) { o.ten_cr = ten[0]; o.ten_cd = ten[1]; }
      });
      tabInfo = 'chinh'; moSheet('info');
      toast('Đã đổi sang ' + maBo(b.album) + ' — kiểm tra tên dâu rể và từng ảnh', 4200);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(function(){ toast('Không tải được ảnh của bộ này'); });
  }

  /* ---------------- thoát khi còn nháp ---------------- */
  function moThoat(){ moSheet('thoat'); }
  function veThoat(){
    return dauSheet('Thoát chế độ sửa?', soThayDoi() + ' thay đổi chưa lưu lên web') +
      '<div class="sua-bd"><p class="sua-p" style="margin-top:0">Bản nháp vẫn được giữ trên máy này — lần sau mở lại chế độ sửa sẽ thấy lại. Khách chỉ thấy thay đổi sau khi anh bấm <b>Lưu</b>.</p>' +
      '<div class="sua-row" style="justify-content:flex-start"><button type="button" class="sua-btn vang" id="suaTLuu">Lưu lên web trước</button><a class="sua-btn" id="suaTDi" href="' + esc(linkThoat()) + '">Thoát, giữ nháp</a></div></div>';
  }
  function ganThoat(){ $('#suaTLuu').addEventListener('click', function(){ moSheet('luu'); }); }

  /* ---------------- lưu lên web ---------------- */
  function veLuu(){
    var L = dongThayDoi(moc(), draft);
    var h = dauSheet('Lưu lên web', THIEP ? ('Thiệp ' + draft.ten_cd + ' & ' + draft.ten_cr) : ('Mẫu ' + M.ten + ' · ' + tenBo(draft.album)));
    h += '<div class="sua-bd">';
    if (pending) h += veCho();
    if (L.length) {
      if (pending) h += '<p class="sua-lbl mt">Sửa thêm sau lần lưu này (' + L.length + ') — lưu tiếp khi lần trên xong</p>';
      else h += '<p class="sua-lbl">Sẽ lưu ' + L.length + ' thay đổi</p>';
      h += '<ul class="sua-list">' + L.map(function(l){ return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>';
      var loi = kiemTra(draft), cho = false;
      if (THIEP && !loi && !pending) {   /* thiệp riêng: mã hoá sẵn để lúc bấm Lưu mở GitHub ngay (không bị chặn cửa sổ) */
        var y = yeuCauSan();
        if (!y) { cho = true; chuanBi(); }
        else if (y.dai) loi = 'Lần sửa này dài quá mức GitHub nhận trong 1 lần. Lưu làm 2 lần: bấm ↶ bớt vài chỗ sửa chữ, lưu phần còn lại trước — hoặc bấm “Sao chép mã thay đổi” gửi Claude.';
      }
      if (loi) h += '<p class="sua-msg loi">' + esc(loi) + '</p>';
      h += '<div class="sua-row"><button type="button" class="sua-btn vang rong" id="suaGui"' + (loi || pending || cho ? ' disabled' : '') + '>' + ICON.save + (pending ? 'Chờ lần lưu trước xong' : (cho ? 'Đang chuẩn bị…' : 'Lưu lên web')) + '</button></div>';
      if (!pending) {
        h += '<p class="sua-p"><b>Cách lưu:</b> trang GitHub mở ra đã điền sẵn → anh chỉ bấm nút xanh <b>Create</b> (hoặc <b>Submit new issue</b>). Khoảng 2–3 phút sau web tự đổi, trang này sẽ báo.<br>GitHub hỏi đăng nhập thì đăng nhập tài khoản <b>' + esc(OWNER) + '</b>.</p>' +
          '<p class="sua-p">Không mở được GitHub? <button type="button" class="sua-link" id="suaChep">Sao chép mã thay đổi</button> rồi dán cho Claude trong chat.</p>';
      }
    } else if (vuaXong) {
      h += THIEP
        ? '<p class="sua-msg ok">✅ Đã lên web! Khách mở link thiệp sẽ thấy bản mới (máy đang mở sẵn thì tải lại trang). Đổi tên / ngày / ảnh bìa thì ảnh xem trước khi gửi Zalo cũng được chụp lại sau ít phút.</p>'
        : '<p class="sua-msg ok">✅ Đã lên web! Khách mở thiệp mẫu sẽ thấy bản mới (điện thoại đang mở sẵn thì tải lại trang). Ảnh mẫu ở trang bán thiệp cũng được chụp lại sau ít phút.</p>';
    } else if (!pending) {
      h += '<p class="sua-msg ok">Chưa có thay đổi nào — thiệp đang giống hệt bản trên web.</p>';
    }
    return h + '</div>';
  }
  function kiemTra(o){
    var x = norm(o, true);
    if (!x.ten_cr || !x.ten_cd) return 'Thiếu tên cô dâu hoặc chú rể.';
    if (THIEP) {
      if (!x.bia || !x.anh_cr || !x.anh_cd) return 'Còn ô ảnh trống (bìa, chú rể hoặc cô dâu).';
      if (!x.anh_ds.length) return 'Cần ít nhất 1 ảnh câu chuyện.';
      if (!ngayCuoi(x.le)) return 'Chưa có ngày cưới — điền ngày Tiệc cưới hoặc Lễ Thành Hôn.';
      var sai = [['sdt_cr', 'chú rể'], ['sdt_cd', 'cô dâu']].filter(function(p){ return x[p[0]] && !/^\+?\d{9,12}$/.test(x[p[0]]); })[0];
      if (sai) return 'Số điện thoại ' + sai[1] + ' chưa đúng (9–12 số).';
      if (x.youtube_id && !/^[\w-]{11}$/.test(x.youtube_id)) return 'Link YouTube chưa đúng — dán lại link clip (dạng https://youtu.be/…).';
    } else if (!x.anh_cr || !x.anh_cd || !x.poster) return 'Còn ô ảnh trống.';
    var seen = {}, trung = '';
    cacO(x).forEach(function(id){ var n = soO(x, id); if (!n) return; if (seen[n] && !trung) trung = n; seen[n] = 1; });
    if (trung) return 'Ảnh ' + trung + ' đang bị dùng 2 lần — đổi 1 trong 2 ô trước khi lưu.';
    return '';
  }
  function taoYeuCau(){
    var set = thayDoi(live, draft);
    var id = 'yc' + Date.now().toString(36);
    var L = dongThayDoi(live, draft).slice(0, 14);
    var payload = { v: 1, key: KEY, id: id, set: set };
    var title = '[sua-thiep] ' + M.ten + ' (' + KEY + ') · ' + id;
    var body = '**Sửa thiệp mẫu: ' + M.ten + '** — gửi từ bảng sửa ẩn trên web.\n\n' + L.map(function(l){ return '- ' + l; }).join('\n') +
      '\n\n👉 Bấm nút xanh **Create** bên dưới để lưu. Web tự cập nhật sau khoảng 2–3 phút.\n\n' +
      '<!-- Dữ liệu cho máy đọc, không sửa phần dưới -->\n```json\n' + JSON.stringify(payload) + '\n```\n';
    var url = 'https://github.com/' + REPO + '/issues/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
    return { id: id, set: set, url: url, payload: payload };
  }
  /* THIEP: phần công khai đổi → "set" (bot kiểm như thiệp mẫu); phần riêng đổi → mã hoá lại cả phần riêng → "enc" kèm base
     (mã băm bản đang chạy — bot từ chối nếu web đã có bản khác, để không ghi đè). Issue công khai: chỉ ghi "Sửa lịch…",
     "Sửa số điện thoại…", không ghi giá trị. */
  var yc = null;
  function khoaNhap(){ return JSON.stringify(toData(draft)) + '|' + HASH; }
  function yeuCauSan(){ return (yc && yc.khoa === khoaNhap()) ? yc : null; }
  function chuanBi(){
    var kh = khoaNhap(); if (chuanBi.dang === kh) return; chuanBi.dang = kh;
    (HASH ? Promise.resolve(HASH) : bam(E.ct).then(function(h){ HASH = h; return h; })).then(function(){ return taoYeuCauThiep(); }).then(function(y){
      chuanBi.dang = ''; y.khoa = khoaNhap(); yc = y;
      if (sheetId === 'luu') veSheet();
    }).catch(function(){ chuanBi.dang = ''; toast('Không mã hoá được — tải lại trang rồi thử lại', 4000); });
  }
  function taoYeuCauThiep(){
    var A = toData(live), B = toData(draft), set = {}, doiRieng = false;
    PUB_SUA.forEach(function(k){ if (!jeq(A[k], B[k])) set[k] = clone(B[k]); });
    var ng = ngayCuoi(B.le); if (ng !== ((E.pub && E.pub.ngay) || '')) set.ngay = ng;
    RIENG.concat(['le'], RIENG_THEM).forEach(function(k){ if (!jeq(A[k], B[k])) doiRieng = true; });
    var id = 'yc' + Date.now().toString(36);
    var maHoa = doiRieng ? (function(){
      var r = clone(RIENG0 || {}); RIENG.forEach(function(k){ r[k] = B[k]; }); r.le = B.le;
      if (Object.keys(B.tho).length) r.tho = B.tho; else delete r.tho;
      if (B.ghi_them) r.ghi_them = B.ghi_them; else delete r.ghi_them;
      return MA.maHoa(KHOA, JSON.stringify(r));
    })() : Promise.resolve(null);
    return maHoa.then(function(x){
      var payload = { v: 1, loai: 'thiep', id: KEY, yc: id };
      if (Object.keys(set).length) payload.set = set;
      if (x) payload.enc = { base: HASH, iv: x.iv, ct: x.ct };
      var L = dongThayDoi(live, draft, true).slice(0, 14);
      var ten = B.ten_cd + ' & ' + B.ten_cr;
      var title = '[sua-thiep] Thiệp ' + ten + ' (' + KEY + ') · ' + id;
      var duoi = '\n\n👉 Bấm nút xanh **Create** bên dưới để lưu. Web tự cập nhật sau khoảng 2–3 phút.\n\n' +
        '<!-- Dữ liệu cho máy đọc (phần riêng đã mã hoá), không sửa phần dưới -->\n```json\n' + JSON.stringify(payload) + '\n```\n';
      function taoUrl(dong){
        var body = '**Sửa thiệp ' + ten + '** — gửi từ bảng sửa ẩn trên web.' + (dong ? '\n\n' + L.map(function(l){ return '- ' + l; }).join('\n') : '') + duoi;
        return 'https://github.com/' + REPO + '/issues/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
      }
      var url = taoUrl(true); if (url.length > 8000) url = taoUrl(false);
      return { id: id, set: set, ct: x ? x.ct : '', url: url, payload: payload, moi: B, dai: url.length > 8000 };
    });
  }
  function ganLuu(){
    var g = $('#suaGui');
    if (g) g.addEventListener('click', function(){
      if (kiemTra(draft) || pending) return;
      var y = THIEP ? yeuCauSan() : taoYeuCau();
      if (!y || y.dai) return;
      var w = window.open(y.url, '_blank');
      if (w) { try { w.opener = null; } catch (er) {} } else toast('Trình duyệt chặn mở tab — bấm “Mở lại trang lưu” bên dưới', 4500);
      pending = { id: y.id, t: Date.now(), set: y.set, url: y.url, buoc: 1, msg: '' };
      if (THIEP) { pending.ct = y.ct; pending.moi = y.moi; }
      ghNgung = false; ghDem = 0;
      luuNhap(); capNhatThanh(); veSheet(); batDauTheoDoi();
    });
    var c = $('#suaChep');
    if (c) c.addEventListener('click', function(){
      if (THIEP) {
        var yt = yeuCauSan(); if (!yt) { toast('Đang chuẩn bị — bấm lại sau 1 giây'); return; }
        chep('Claude ơi, lưu giúp thiệp ' + KEY + ' theo mã này (phần riêng đã mã hoá): ' + JSON.stringify(yt.payload), 'Đã sao chép — dán cho Claude trong chat');
        return;
      }
      var y = taoYeuCau(), txt = 'Claude ơi, sửa thiệp mẫu ' + M.ten + ' theo mã này: ' + JSON.stringify(y.payload);
      chep(txt, 'Đã sao chép — dán cho Claude trong chat');
    });
    var mo = $('#suaMoLai'); if (mo) mo.addEventListener('click', function(){ if (pending && pending.url) { var w = window.open(pending.url, '_blank'); if (w) { try { w.opener = null; } catch (er) {} } } });
    var bq = $('#suaBoQua'); if (bq) bq.addEventListener('click', function(){ pending = null; luuNhap(); capNhatThanh(); veSheet(); });
  }
  function chep(txt, ok){
    function xong(){ toast(ok); }
    function du(){
      var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); xong(); } catch (e) { toast('Không sao chép được'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(xong, du); else du();
  }
  function veCho(){
    var p = pending, b = p.buoc || 1, lau = Date.now() - p.t > 6 * 60e3;
    function li(so, txt, trangThai){ return '<li class="' + trangThai + '"><i>' + (trangThai === 'ok' ? '✓' : (trangThai === 'loi' ? '!' : so)) + '</i><span>' + txt + '</span></li>'; }
    var h = '<p class="sua-lbl">Đang đưa lên web</p><ul class="sua-buoc">' +
      li(1, 'Bấm nút xanh <b>Create</b> trên trang GitHub vừa mở' + (p.so ? ' — đã nhận (#' + p.so + ')' : ''), b > 1 ? 'ok' : 'dang') +
      li(2, 'GitHub kiểm tra &amp; cập nhật thiệp', p.loi ? 'loi' : (b > 2 ? 'ok' : (b === 2 ? 'dang' : ''))) +
      li(3, 'Web đã đổi — khách mở thiệp thấy ảnh mới', b > 3 ? 'ok' : (b === 3 ? 'dang' : '')) + '</ul>';
    if (p.loi) h += '<p class="sua-msg loi">' + esc(p.loi) + '</p>';
    else if (lau && b < 2) h += '<p class="sua-msg loi">Chưa thấy GitHub nhận yêu cầu. Anh đã bấm “Create” chưa? Nếu tab GitHub đã đóng, bấm “Mở lại trang lưu”.</p>';
    h += '<div class="sua-row" style="justify-content:flex-start"><button type="button" class="sua-btn" id="suaMoLai">Mở lại trang lưu</button>' +
      ((lau || p.loi) ? '<button type="button" class="sua-btn" id="suaBoQua">Bỏ theo dõi lần lưu này</button>' : '') + '</div>';
    return h;
  }

  /* theo dõi: (1) GitHub API công khai — issue đã tạo? máy đã trả lời? (2) tải lại thiep-mau.html xem dữ liệu đã đổi chưa */
  var hen = null;
  function batDauTheoDoi(){ clearTimeout(hen); hen = setTimeout(vong, 4000); }
  function vong(){
    if (!pending) return;
    var p = pending;
    Promise.all([kiemWeb(p), kiemGitHub(p)]).then(function(){
      if (!pending) return;
      if (Date.now() - p.t > 20 * 60e3) { p.loi = p.loi || 'Quá 20 phút chưa thấy web đổi. Anh nhắn Claude kiểm tra giúp.'; }
      luuNhap(); if (sheetId === 'luu') veSheet(); capNhatThanh();
      if (!p.loi) hen = setTimeout(vong, document.hidden ? 30000 : 12000);
    });
  }
  /* dữ liệu mẫu này trên web thật (bỏ qua bộ nhớ đệm) */
  function layWeb(){
    if (THIEP) return fetch('/thiep/' + KEY + '/?cb=' + Date.now(), { cache: 'no-store' }).then(function(r){ return r.ok ? r.text() : ''; }).then(function(t){
      var m = /<script id="thiep-du-lieu" type="application\/json">([\s\S]*?)<\/script>/.exec(t); if (!m) return null;
      var x = JSON.parse(m[1].replace(/<\\\//g, '</'));
      return (x && x.id === KEY && x.pub && x.ct) ? x : null;
    });
    return fetch('/thiep-mau.html?cb=' + Date.now(), { cache: 'no-store' }).then(function(r){ return r.ok ? r.text() : ''; }).then(function(t){
      var dong = t.split('\n').filter(function(l){ return l.indexOf('  var MAU = ') === 0; })[0]; if (!dong) return null;
      var arr = JSON.parse(dong.slice(dong.indexOf('['), dong.lastIndexOf(']') + 1));
      return arr.filter(function(x){ return x.key === KEY; })[0] || null;
    });
  }
  function kiemWeb(p){
    return layWeb().then(function(e){
      if (!e || pending !== p || !khopWeb(e, p)) return;
      return (THIEP ? nhanWeb(e) : Promise.resolve(e)).then(function(rec){ if (pending === p) xongLuu(rec); });
    }).catch(function(){});
  }
  /* THIEP: nhận bản trên web làm mốc mới (giải mã phần riêng nếu đổi) → trả về dữ liệu đầy đủ */
  function nhanWeb(Ew){
    var p = (Ew.ct === E.ct && RIENG0) ? Promise.resolve(RIENG0) : MA.giaiMa(KHOA, Ew.iv, Ew.ct).then(function(t){ return JSON.parse(t); });
    return p.then(function(rieng){
      return bam(Ew.ct).then(function(h){ E = Ew; RIENG0 = rieng; HASH = h; DAY = MA.ghep(Ew.pub, rieng); M = DAY; return DAY; });
    });
  }
  /* trình duyệt có thể mở thiệp từ bộ nhớ đệm (GitHub Pages giữ ~10 phút) → lấy bản mới nhất trên web làm mốc,
     nháp đang làm trên bản cũ thì giữ phần anh sửa, phần còn lại theo bản mới */
  function lamTuoi(){
    return layWeb().then(function(e){
      if (!e) return;
      if (THIEP) {
        if (e.ct === E.ct && jeq(e.pub, E.pub)) return;
        var cu0 = live;
        return nhanWeb(e).then(function(rec){
          var moi0 = norm(rec);
          if (rec.goc) goc = norm(rec.goc);
          if (pending && khopWeb(e, pending)) { draft = rebase(cu0, draft, moi0); xongLuu(rec); }
          else { live = moi0; draft = rebase(cu0, draft, moi0); }
          luuNhap(); veLai(); if (sheetId) veSheet();
        });
      }
      var moi = norm(e), cu = live;
      var doiGoc = !!e.goc && !jeq(e.goc, M.goc || null);
      if (jeq(toData(moi), toData(cu)) && !doiGoc) return;
      if (e.goc) { M.goc = e.goc; goc = norm(e.goc); }
      if (pending && khopWeb(e, pending)) { draft = rebase(cu, draft, moi); xongLuu(e); }
      else { live = moi; draft = rebase(cu, draft, moi); }
      luuNhap(); veLai(); if (sheetId) veSheet();
    }).catch(function(){});
  }
  function kiemGitHub(p){
    if (ghNgung || ghDem > 40) return Promise.resolve();
    ghDem++;
    var api = 'https://api.github.com/repos/' + REPO;
    var tim = p.so ? Promise.resolve({ number: p.so }) :
      fetch(api + '/issues?state=all&creator=' + OWNER + '&sort=created&direction=desc&per_page=10', { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' })
        .then(function(r){ if (r.status === 403 || r.status === 429) { ghNgung = true; return []; } return r.ok ? r.json() : []; })
        .then(function(ds){ return (ds || []).filter(function(x){ return x.title && x.title.indexOf(p.id) >= 0; })[0] || null; });
    return tim.then(function(is){
      if (!is || !pending) return;
      p.so = is.number; if ((p.buoc || 1) < 2) p.buoc = 2;
      ghDem++;
      return fetch(api + '/issues/' + is.number + '/comments?per_page=30', { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' })
        .then(function(r){ if (r.status === 403 || r.status === 429) { ghNgung = true; return []; } return r.ok ? r.json() : []; })
        .then(function(cs){
          var bot = (cs || []).filter(function(c){ return c.user && /\[bot\]$/.test(c.user.login || ''); });
          var cuoi = bot.length ? String(bot[bot.length - 1].body || '') : '';
          if (/^\s*❌/.test(cuoi)) p.loi = cuoi.replace(/[*_`#>]/g, '').trim().slice(0, 600);
          else if (/^\s*✅/.test(cuoi)) { if (p.buoc < 3) p.buoc = 3; }
        });
    }).catch(function(){});
  }
  function xongLuu(e){
    live = norm(e); if (!THIEP) M.goc = e.goc || M.goc; if (e.goc) goc = norm(e.goc);
    pending = null; clearTimeout(hen);
    luuNhap(); capNhatThanh();
    vuaXong = true;
    if (sheetId === 'luu') veSheet();
    toast('✅ Đã lên web', 4000);
  }

  /* ---------------- khởi động ---------------- */
  function batDau(){
    if (!window.__THIEP__) return;
    if (THIEP && !(window.__THIEP_ENC__ && window.__THIEP_GOC__ && MA && window.__THIEP_KHOA__)) return;
    khoiTao();
    dungGiaoDien();
    luuNhap();          /* dọn nháp cũ đã lên web (khỏi báo lại mỗi lần mở) */
    veLai();
    lamTuoi();
    if (pending) batDauTheoDoi();
    document.addEventListener('visibilitychange', function(){ if (!document.hidden && pending) { clearTimeout(hen); vong(); } });
    taiDanhSachBo().catch(function(){});
    taiBo(draft.album).catch(function(){});
    taiKho();
    setTimeout(function(){
      var tt = $('.sua-toast'); if (tt && !tt.hidden) return;   /* đang báo điều khác (vd “Đã lên web”) thì thôi */
      var n = soThayDoi();
      toast(pending ? 'Đang chờ lần lưu trước lên web…' : (n ? ('Đang có ' + n + ' thay đổi chưa lưu (bản nháp trên máy này)') : (THIEP ? 'Chạm ảnh để đổi ảnh · “Thông tin” để sửa chữ, bật/tắt hiệu ứng' : 'Chạm ảnh để đổi ảnh · “Tên & bộ ảnh” để sửa tên, bật/tắt hiệu ứng')), 3600);
    }, 500);
  }
  if (window.__THIEP__) batDau();
  else document.addEventListener('thiep:render', batDau, { once: true });
})();
