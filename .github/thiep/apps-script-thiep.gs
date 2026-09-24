/* =============================================================================================
   KHO LỜI CHÚC / XÁC NHẬN / THẢ TIM cho THIỆP RIÊNG — Phạm Đức Studio  (CHƯA BẬT — chờ Google hết đầy bộ nhớ)

   Cách bật (Claude làm, khi tài khoản phamduc.studio@gmail.com còn chỗ trống):
   1. Mở project Apps Script của form web (id 1EY7SWLe8nrBXMt1Yue12nqcDBzKvIUF-3TXzZ7FvQOGGd6-o7EBX3JFE, file Code.gs).
   2. Dán TOÀN BỘ file này xuống cuối Code.gs.
   3. Dòng ĐẦU TIÊN bên trong function doGet(e) {  thêm:   var t = thiepGet(e); if (t) return t;
      Dòng ĐẦU TIÊN bên trong function doPost(e) { thêm:   var t = thiepPost(e); if (t) return t;
      (không có doGet thì tạo: function doGet(e){ var t = thiepGet(e); if (t) return t; return ContentService.createTextOutput('ok'); })
   4. Triển khai → Quản lý triển khai → sửa bản đang chạy → Phiên bản mới (GIỮ NGUYÊN URL /exec).
   5. Thử: mở 1 thiệp riêng → gửi 1 lời chúc → tab Thiep_LoiChuc có dòng mới; mở lại thiệp thấy lời chúc hiện lên.
   Thiệp tự nhận ra kho đã bật (GET ?action=thiep_loichuc trả {ok:true, action:"thiep_loichuc"}) — không cần sửa web.

   Dữ liệu (Sheet "Lead website Phạm Đức Studio", 3 tab tự tạo nếu chưa có):
   - Thiep_RSVP     thời gian · mã thiệp · tên khách · tham dự (Co/Khong) · số người · lời nhắn   ← studio đọc để gửi dâu rể
   - Thiep_LoiChuc  thời gian · mã thiệp · lời chúc (ĐÃ MÃ HOÁ bằng khoá trong link thiệp — chỉ người có link đọc được)
   - Thiep_Tim      mã thiệp · số tim
   ============================================================================================= */
var THIEP_SHEET_ID = '1bUZjpgTbIZxPf2zGe2Hl3z6A3okkeERODy1uXo1Ld8w';
var THIEP_RE_MA = /^[a-z0-9]+(?:-[a-z0-9]+){1,8}$/;

function thiepJson_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function thiepTab_(ten, cot) {
  var ss = SpreadsheetApp.openById(THIEP_SHEET_ID), sh = ss.getSheetByName(ten);
  if (!sh) { sh = ss.insertSheet(ten); sh.appendRow(cot); sh.setFrozenRows(1); }
  return sh;
}
function thiepChu_(v, dai) {
  v = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B-\u001F]/g, '').trim().slice(0, dai);
  return /^[=+\-@]/.test(v) ? "'" + v : v;          /* chặn công thức trong Sheet */
}

function thiepGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action !== 'thiep_loichuc') return null;
  var ma = String(p.c || '');
  if (!THIEP_RE_MA.test(ma)) return thiepJson_({ ok: false, action: 'thiep_loichuc', loi: 'ma' });
  var ds = [], tim = 0;
  var lc = thiepTab_('Thiep_LoiChuc', ['Thời gian', 'Mã thiệp', 'Lời chúc (mã hoá)']);
  var v = lc.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (v[i][1] === ma && v[i][2]) ds.push({ t: v[i][0] instanceof Date ? v[i][0].getTime() : 0, e: String(v[i][2]) });
  if (ds.length > 300) ds = ds.slice(ds.length - 300);
  var tm = thiepTab_('Thiep_Tim', ['Mã thiệp', 'Số tim']).getDataRange().getValues();
  for (var j = 1; j < tm.length; j++) if (tm[j][0] === ma) tim = Number(tm[j][1]) || 0;
  return thiepJson_({ ok: true, action: 'thiep_loichuc', wishes: ds, hearts: tim });
}

function thiepPost(e) {
  var p = (e && e.parameter) || {};
  var a = String(p.action || '');
  if (a.indexOf('thiep_') !== 0) return null;
  var ma = String(p.c || '');
  if (!THIEP_RE_MA.test(ma)) return thiepJson_({ ok: false, action: a, loi: 'ma' });
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    if (a === 'thiep_rsvp') {
      if (!String(p.ten || '').trim()) return thiepJson_({ ok: false, action: a, loi: 'ten' });
      thiepTab_('Thiep_RSVP', ['Thời gian', 'Mã thiệp', 'Tên khách', 'Tham dự', 'Số người', 'Lời nhắn'])
        .appendRow([new Date(), ma, thiepChu_(p.ten, 80), p.thamdu === 'Co' ? 'Co' : 'Khong', thiepChu_(p.songuoi, 3), thiepChu_(p.loinhan, 500)]);
      return thiepJson_({ ok: true, action: a });
    }
    if (a === 'thiep_wish') {
      var enc = String(p.e || '');
      if (!/^[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{24,3000}$/.test(enc)) return thiepJson_({ ok: false, action: a, loi: 'e' });
      thiepTab_('Thiep_LoiChuc', ['Thời gian', 'Mã thiệp', 'Lời chúc (mã hoá)']).appendRow([new Date(), ma, enc]);
      return thiepJson_({ ok: true, action: a });
    }
    if (a === 'thiep_heart') {
      var sh = thiepTab_('Thiep_Tim', ['Mã thiệp', 'Số tim']), v = sh.getDataRange().getValues();
      for (var i = 1; i < v.length; i++) if (v[i][0] === ma) { var n = (Number(v[i][1]) || 0) + 1; sh.getRange(i + 1, 2).setValue(n); return thiepJson_({ ok: true, action: a, hearts: n }); }
      sh.appendRow([ma, 1]);
      return thiepJson_({ ok: true, action: a, hearts: 1 });
    }
    return thiepJson_({ ok: false, action: a, loi: 'action' });
  } catch (er) {
    return thiepJson_({ ok: false, action: a, loi: 'kho' });   /* thiệp tự chuyển sang gửi qua Zalo */
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}
