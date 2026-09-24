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
   ========================================================================== */
(function(){
  'use strict';
  var SUA = window.__SUA__;
  if (!SUA || window.__SUA_ON__) return;
  window.__SUA_ON__ = true;

  var REPO = 'phamducstudio-creator/phamducstudio-web', OWNER = 'phamducstudio-creator';
  var MAU = SUA.mau, M = MAU[SUA.i], KEY = M.key;
  var LS_KEY = 'pds-sua-thiep:' + KEY;
  var FIELDS = ['album', 'ten_cr', 'ten_cd', 'bia', 'bia_pos', 'anh_cr', 'anh_cd', 'anh_ds', 'poster', 'poster_pos', 'pos'];
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
  function anh(album, n, nho){ return 'images/album-' + album + '-' + n + (nho ? '-800' : '') + '.jpg'; }

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
    return o;
  }
  /* dạng lưu trong thiep-mau.html (anh_ds là chuỗi "08,09,…") */
  function toData(o){
    var p = norm(o, true);
    return { album: p.album, ten_cr: p.ten_cr, ten_cd: p.ten_cd, bia: p.bia, bia_pos: p.bia_pos, anh_cr: p.anh_cr, anh_cd: p.anh_cd,
      anh_ds: p.anh_ds.join(','), poster: p.poster, poster_pos: p.poster_pos, pos: p.pos };
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

  /* ---------------- trạng thái ---------------- */
  var live = norm(M);                                  /* bản đang chạy trên web (lúc mở trang) */
  var goc = M.goc ? norm(M.goc) : null;                /* bản studio dựng ban đầu (workflow ghi ở lần sửa đầu) */
  var draft = clone(live);
  var undoStack = [];
  var pending = null;                                  /* {id, t, set, url} — lần lưu đang chờ web đổi */
  var cheDo = 'sua';                                   /* 'sua' | 'xem' (xem như khách) */
  var sheetId = '', sheetSlot = '', tab = 'doi', ghNgung = false, ghDem = 0;
  var albumCache = {}, dsBo = null, vuaXong = false;

  (function napNhap(){
    var s = lsGet();
    if (!s || s.v !== 1) return;
    if (s.pending && s.pending.set) {
      var xong = khopWeb(M, s.pending.set);
      if (xong) setTimeout(function(){ toast('✅ Lần lưu trước đã lên web'); }, 600);
      else if (Date.now() - s.pending.t < 30 * 60e3) pending = s.pending;
    }
    if (s.draft) {
      var baseCu = s.base ? norm(s.base) : live;
      draft = jeq(toData(baseCu), toData(live)) ? norm(s.draft) : rebase(baseCu, s.draft, live);
    }
  })();
  function luuNhap(){
    var coDoi = Object.keys(thayDoi(live, draft)).length > 0;
    lsSet((coDoi || pending) ? { v: 1, base: toData(live), draft: draft, t: Date.now(), pending: pending } : null);
  }
  function khopWeb(entry, set){
    var L = toData(norm(entry));
    return Object.keys(set).every(function(k){ return jeq(L[k], set[k]); });
  }

  /* ---------------- ô ảnh ---------------- */
  function biaGoc(album){ return BIA_GOC[album] || ''; }
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
    if (id === 'bia') return o.bia ? anh(o.album, o.bia) : 'images/album-' + o.album + '-bia.jpg';
    return n ? anh(o.album, n, true) : '';
  }

  /* ---------------- vẽ lại thiệp theo nháp ---------------- */
  function duLieuTrang(){
    var T = window.__THIEP__, d = {}, k;
    for (k in T.d) d[k] = T.d[k];
    var x = norm(draft);
    d.album = x.album; d.ten_cr = x.ten_cr; d.ten_cd = x.ten_cd; d.bia = x.bia; d.bia_pos = x.bia_pos;
    d.anh_cr = x.anh_cr; d.anh_cd = x.anh_cd; d.anh_ds = x.anh_ds.join(','); d.poster = x.poster; d.poster_pos = x.poster_pos; d.pos = x.pos;
    return d;
  }
  function veLai(){
    var T = window.__THIEP__; if (!T) return;
    var d = duLieuTrang();
    T.bia(d); T.ten(d); T.anh(d); T.clip(d);
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
    if (albumCache[album]) return Promise.resolve(albumCache[album]);
    return fetch('album-' + album + '.html', { cache: 'no-cache' }).then(function(r){ if (!r.ok) throw new Error('http ' + r.status); return r.text(); }).then(function(t){
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
    return Promise.all(['album-studio.html', 'album-ngoai-canh.html'].map(function(u){
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
    var b = albumCache[album];
    if (b) return maBo(album) + ' · ' + b.ten + (b.cap ? ' (' + b.cap + ')' : '');
    if (dsBo) { var x = dsBo.filter(function(y){ return y.album === album; })[0]; if (x) return maBo(album) + ' · ' + x.tag + (x.cap ? ' (' + x.cap + ')' : ''); }
    return maBo(album);
  }

  /* ---------------- tóm tắt thay đổi ---------------- */
  function dongThayDoi(a, b){
    var A = norm(a, true), B = norm(b, true), L = [];
    if (A.ten_cr !== B.ten_cr) L.push('Tên chú rể: ' + A.ten_cr + ' → ' + B.ten_cr);
    if (A.ten_cd !== B.ten_cd) L.push('Tên cô dâu: ' + A.ten_cd + ' → ' + B.ten_cd);
    if (A.album !== B.album) {   /* đổi cả bộ: số ảnh 2 bộ không so với nhau được */
      L.unshift('Bộ ảnh: ' + tenBo(A.album) + ' → ' + tenBo(B.album));
      L.push('Ảnh chọn lại theo bộ mới — bìa ' + (B.bia || 'gốc') + ' · rể ' + B.anh_cr + ' · dâu ' + B.anh_cd + ' · câu chuyện ' + (B.anh_ds.join(' ') || '—') + ' · clip ' + B.poster);
      return L;
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
    return L;
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
    '.sua-f input{width:100%;height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.07);color:#fff;padding:0 12px;font:inherit;font-size:15px}',
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
      '<button type="button" class="i" id="suaInfo">' + ICON.info + 'Tên &amp; bộ ảnh</button>' +
      '<button type="button" class="x" id="suaXem">' + ICON.eye + 'Xem thử</button>' +
      '<button type="button" class="l" id="suaLuu"></button></div>';
    document.body.appendChild(bar);
    quay = document.createElement('button'); quay.type = 'button'; quay.className = 'sua-quay sua-ui'; quay.innerHTML = ICON.pen + 'Quay lại sửa';
    document.body.appendChild(quay);
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

  function datCheDo(m){
    cheDo = m;
    document.documentElement.classList.toggle('sua', m === 'sua');
    document.documentElement.classList.toggle('sua-xem', m === 'xem');
    if (m === 'xem') { dongSheet(); toast('Đang xem như khách — bấm “Quay lại sửa” để tiếp tục'); }
  }

  function moc(){   /* bản web sẽ có sau lần lưu đang chờ (hoặc bản web hiện tại) */
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
    var h = '';
    if (sheetId === 'o') h = veO();
    else if (sheetId === 'info') h = veInfo();
    else if (sheetId === 'bo') h = veBo();
    else if (sheetId === 'luu') h = veLuu();
    else if (sheetId === 'thoat') h = veThoat();
    else if (sheetId === 'them') h = veThem();
    var cu = $('.sua-bd', sheet), cuon = cu ? cu.scrollTop : 0;
    sheet.innerHTML = h;
    var bd = $('.sua-bd', sheet); if (bd && cuon) bd.scrollTop = cuon;
    $('.sua-x', sheet) && $('.sua-x', sheet).addEventListener('click', dongSheet);
    if (sheetId === 'o') ganO();
    else if (sheetId === 'info') ganInfo();
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
    var phu = n ? ('Đang dùng ảnh số ' + n + (id === 'bia' && !draft.bia ? ' (bìa cắt sẵn)' : '')) : 'Chưa có ảnh';
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
    h += '<div class="sua-bd">';
    h += '<div class="sua-f"><div><label for="suaCr">Chú rể</label><input id="suaCr" maxlength="30" autocomplete="off" value="' + esc(draft.ten_cr) + '"></div>' +
      '<button type="button" class="sua-sw" id="suaSw" aria-label="Đổi chỗ tên cô dâu và chú rể" title="Đổi chỗ">⇄</button>' +
      '<div><label for="suaCd">Cô dâu</label><input id="suaCd" maxlength="30" autocomplete="off" value="' + esc(draft.ten_cd) + '"></div></div>';
    h += '<p class="sua-p">Tên hiện ở bìa, phần giới thiệu và dưới ảnh dâu rể. Giữ đúng tên như trong album.</p>';
    h += '<p class="sua-lbl mt">Bộ ảnh</p><button type="button" class="sua-bo" id="suaDoiBo"><img src="' + esc('images/album-' + draft.album + '-bia.jpg') + '" alt=""><span class="tx"><b>' + esc(tenBo(draft.album)) + '</b><small>Bấm để đổi sang bộ ảnh khác (studio / ngoại cảnh)</small></span></button>';
    h += '<p class="sua-lbl mt">Ảnh trong thiệp (' + cacO(draft).length + ' ô)</p><div class="sua-hang">';
    cacO(draft).forEach(function(id){
      var src = srcO(draft, id);
      h += '<button type="button" class="sua-mini" data-o="' + esc(id) + '"><img src="' + esc(src) + '" alt="" loading="lazy"><span>' + esc(tenNgan(id)) + ' · ' + esc(soO(draft, id) || '—') + '</span></button>';
    });
    h += '<button type="button" class="sua-mini them" id="suaThem"><i>+</i><span>Thêm ảnh</span></button></div>';
    var coNhap = soThayDoi() > 0, khacGoc = goc && dongThayDoi(goc, draft).length > 0;
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
    if (vg) vg.addEventListener('click', function(){ doi(function(o){ var g = clone(goc); FIELDS.forEach(function(k){ o[k] = g[k]; }); }); toast('Đã về bản gốc — bấm Lưu để đưa lên web'); });
  }
  function sachTen(s){ return String(s || '').replace(/[<>{}\[\]`"\\|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30); }

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
        h += '<button type="button" class="sua-bo' + (cur ? ' cur' : '') + '" data-a="' + esc(b.album) + '"><img src="' + esc('images/album-' + b.album + '-bia.jpg') + '" alt="" loading="lazy"><span class="tx"><b>' + esc(maBo(b.album) + ' · ' + b.tag) + '</b><small>' + esc([b.cap, b.so].filter(Boolean).join(' · ')) + '</small>' +
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
      moSheet('info');
      toast('Đã đổi sang ' + maBo(b.album) + ' — kiểm tra tên dâu rể và từng ảnh', 4200);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(function(){ toast('Không tải được ảnh của bộ này'); });
  }

  /* ---------------- thoát khi còn nháp ---------------- */
  function moThoat(){ moSheet('thoat'); }
  function veThoat(){
    return dauSheet('Thoát chế độ sửa?', soThayDoi() + ' thay đổi chưa lưu lên web') +
      '<div class="sua-bd"><p class="sua-p" style="margin-top:0">Bản nháp vẫn được giữ trên máy này — lần sau mở lại chế độ sửa sẽ thấy lại. Khách chỉ thấy thay đổi sau khi anh bấm <b>Lưu</b>.</p>' +
      '<div class="sua-row" style="justify-content:flex-start"><button type="button" class="sua-btn vang" id="suaTLuu">Lưu lên web trước</button><a class="sua-btn" id="suaTDi" href="?m=' + esc(encodeURIComponent(KEY)) + '">Thoát, giữ nháp</a></div></div>';
  }
  function ganThoat(){ $('#suaTLuu').addEventListener('click', function(){ moSheet('luu'); }); }

  /* ---------------- lưu lên web ---------------- */
  function veLuu(){
    var L = dongThayDoi(moc(), draft);
    var h = dauSheet('Lưu lên web', 'Mẫu ' + M.ten + ' · ' + tenBo(draft.album));
    h += '<div class="sua-bd">';
    if (pending) h += veCho();
    if (L.length) {
      if (pending) h += '<p class="sua-lbl mt">Sửa thêm sau lần lưu này (' + L.length + ') — lưu tiếp khi lần trên xong</p>';
      else h += '<p class="sua-lbl">Sẽ lưu ' + L.length + ' thay đổi</p>';
      h += '<ul class="sua-list">' + L.map(function(l){ return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>';
      var loi = kiemTra(draft);
      if (loi) h += '<p class="sua-msg loi">' + esc(loi) + '</p>';
      h += '<div class="sua-row"><button type="button" class="sua-btn vang rong" id="suaGui"' + (loi || pending ? ' disabled' : '') + '>' + ICON.save + (pending ? 'Chờ lần lưu trước xong' : 'Lưu lên web') + '</button></div>';
      if (!pending) {
        h += '<p class="sua-p"><b>Cách lưu:</b> trang GitHub mở ra đã điền sẵn → anh chỉ bấm nút xanh <b>Create</b> (hoặc <b>Submit new issue</b>). Khoảng 2–3 phút sau web tự đổi, trang này sẽ báo.<br>GitHub hỏi đăng nhập thì đăng nhập tài khoản <b>' + esc(OWNER) + '</b>.</p>' +
          '<p class="sua-p">Không mở được GitHub? <button type="button" class="sua-link" id="suaChep">Sao chép mã thay đổi</button> rồi dán cho Claude trong chat.</p>';
      }
    } else if (vuaXong) {
      h += '<p class="sua-msg ok">✅ Đã lên web! Khách mở thiệp mẫu sẽ thấy bản mới (điện thoại đang mở sẵn thì tải lại trang). Ảnh mẫu ở trang bán thiệp cũng được chụp lại sau ít phút.</p>';
    } else if (!pending) {
      h += '<p class="sua-msg ok">Chưa có thay đổi nào — thiệp đang giống hệt bản trên web.</p>';
    }
    return h + '</div>';
  }
  function kiemTra(o){
    var x = norm(o, true);
    if (!x.ten_cr || !x.ten_cd) return 'Thiếu tên cô dâu hoặc chú rể.';
    if (!x.anh_cr || !x.anh_cd || !x.poster) return 'Còn ô ảnh trống.';
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
  function ganLuu(){
    var g = $('#suaGui');
    if (g) g.addEventListener('click', function(){
      if (kiemTra(draft) || pending) return;
      var y = taoYeuCau();
      var w = window.open(y.url, '_blank');
      if (w) { try { w.opener = null; } catch (er) {} } else toast('Trình duyệt chặn mở tab — bấm “Mở lại trang lưu” bên dưới', 4500);
      pending = { id: y.id, t: Date.now(), set: y.set, url: y.url, buoc: 1, msg: '' };
      ghNgung = false; ghDem = 0;
      luuNhap(); capNhatThanh(); veSheet(); batDauTheoDoi();
    });
    var c = $('#suaChep');
    if (c) c.addEventListener('click', function(){
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
    return fetch('thiep-mau.html?cb=' + Date.now(), { cache: 'no-store' }).then(function(r){ return r.ok ? r.text() : ''; }).then(function(t){
      var dong = t.split('\n').filter(function(l){ return l.indexOf('  var MAU = ') === 0; })[0]; if (!dong) return null;
      var arr = JSON.parse(dong.slice(dong.indexOf('['), dong.lastIndexOf(']') + 1));
      return arr.filter(function(x){ return x.key === KEY; })[0] || null;
    });
  }
  function kiemWeb(p){
    return layWeb().then(function(e){ if (e && pending === p && khopWeb(e, p.set)) xongLuu(e); }).catch(function(){});
  }
  /* trình duyệt có thể mở thiệp từ bộ nhớ đệm (GitHub Pages giữ ~10 phút) → lấy bản mới nhất trên web làm mốc,
     nháp đang làm trên bản cũ thì giữ phần anh sửa, phần còn lại theo bản mới */
  function lamTuoi(){
    return layWeb().then(function(e){
      if (!e) return;
      var moi = norm(e), cu = live;
      var doiGoc = !!e.goc && !jeq(e.goc, M.goc || null);
      if (jeq(toData(moi), toData(cu)) && !doiGoc) return;
      if (e.goc) { M.goc = e.goc; goc = norm(e.goc); }
      if (pending && khopWeb(e, pending.set)) { draft = rebase(cu, draft, moi); xongLuu(e); }
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
    live = norm(e); M.goc = e.goc || M.goc; if (e.goc) goc = norm(e.goc);
    pending = null; clearTimeout(hen);
    luuNhap(); capNhatThanh();
    vuaXong = true;
    if (sheetId === 'luu') veSheet();
    toast('✅ Đã lên web', 4000);
  }

  /* ---------------- khởi động ---------------- */
  function batDau(){
    if (!window.__THIEP__) return;
    dungGiaoDien();
    luuNhap();          /* dọn nháp cũ đã lên web (khỏi báo lại mỗi lần mở) */
    veLai();
    lamTuoi();
    if (pending) batDauTheoDoi();
    document.addEventListener('visibilitychange', function(){ if (!document.hidden && pending) { clearTimeout(hen); vong(); } });
    taiDanhSachBo().catch(function(){});
    taiBo(draft.album).catch(function(){});
    setTimeout(function(){
      var tt = $('.sua-toast'); if (tt && !tt.hidden) return;   /* đang báo điều khác (vd “Đã lên web”) thì thôi */
      var n = soThayDoi();
      toast(pending ? 'Đang chờ lần lưu trước lên web…' : (n ? ('Đang có ' + n + ' thay đổi chưa lưu (bản nháp trên máy này)') : 'Chạm vào ảnh bất kỳ để đổi ảnh'), 3200);
    }, 500);
  }
  if (window.__THIEP__) batDau();
  else document.addEventListener('thiep:render', batDau, { once: true });
})();
