/* Phạm Đức Studio — Album ảnh (09/2026)
   1. Lưới "justified": mỗi hàng cao bằng nhau, ảnh giữ nguyên tỉ lệ, không cắt, không viền trống,
      đúng thứ tự (quan trọng với album phóng sự xếp theo thời gian). Áp cho .pd-justify > a.pj[data-r].
   2. Lightbox phóng to: vuốt trái/phải để chuyển ảnh, vuốt xuống để đóng, nút Back điện thoại = đóng ảnh
      (không thoát khỏi trang), tải ảnh gốc (data-full) sau khi hiện bản nhỏ, tải trước ảnh kế tiếp.
   Không phụ thuộc thư viện ngoài. Trang album cũ (img.photo-slot không có data-full) vẫn chạy bình thường. */
(function () {
  'use strict';
  var d = document;

  /* ---------- 1. LƯỚI JUSTIFIED ---------- */
  function layout(g) {
    var items = Array.prototype.slice.call(g.querySelectorAll('.pj'));
    if (!items.length) return;
    var W = g.clientWidth;
    if (!W || g._pdw === W) return;
    g._pdw = W;
    var gap = W < 600 ? 6 : 10;
    var T = W < 420 ? 165 : W < 700 ? 200 : W < 1000 ? 240 : 280; /* chiều cao hàng mong muốn */
    var MAXK = W < 700 ? 4 : 7;
    var r = items.map(function (it) {
      var v = parseFloat(it.getAttribute('data-r'));
      return v > 0 ? v : 1.5;
    });
    var n = r.length, best = [0], prev = [0], i, k;
    for (i = 1; i <= n; i++) {
      best[i] = Infinity;
      var sum = 0;
      for (k = 1; k <= MAXK && i - k >= 0; k++) {
        sum += r[i - k];
        var h = (W - gap * (k - 1)) / sum, cost;
        if (i === n && h > T) cost = 0; /* hàng cuối thiếu ảnh: giữ chiều cao chuẩn, không kéo giãn */
        else {
          cost = Math.pow((h - T) / T, 2) * 100;
          if (h > T * 1.7 || h < T * 0.55) cost += 500;
        }
        if (best[i - k] + cost < best[i]) { best[i] = best[i - k] + cost; prev[i] = i - k; }
      }
    }
    var rows = [];
    for (i = n; i > 0; i = prev[i]) rows.unshift([prev[i], i]);
    var y = 0;
    rows.forEach(function (row, ri) {
      var a = row[0], b = row[1], s = 0, j;
      for (j = a; j < b; j++) s += r[j];
      var h = (W - gap * (b - a - 1)) / s, last = ri === rows.length - 1;
      if (last && h > T) h = T;
      var x = 0;
      for (j = a; j < b; j++) {
        var w = r[j] * h;
        if (!last && j === b - 1) w = W - x;
        var st = items[j].style;
        st.left = x + 'px'; st.top = y + 'px'; st.width = w + 'px'; st.height = h + 'px';
        x += w + gap;
      }
      y += h + gap;
    });
    g.style.height = Math.max(0, y - gap) + 'px';
    g.classList.add('is-laid');
  }
  var grids = Array.prototype.slice.call(d.querySelectorAll('.pd-justify'));
  function layoutAll() { grids.forEach(layout); }
  if (grids.length) {
    layoutAll();
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layoutAll, 120); });
    window.addEventListener('load', layoutAll);
  }

  /* ---------- 2. LIGHTBOX ---------- */
  var galleries = d.querySelectorAll('.album-sub-gallery');
  if (!galleries.length) return;

  var ov = d.createElement('div');
  ov.className = 'pd-lightbox';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Xem ảnh phóng to');
  ov.innerHTML =
    '<button type="button" class="pd-lb-close" aria-label="Đóng">&times;</button>' +
    '<button type="button" class="pd-lb-nav pd-lb-prev" aria-label="Ảnh trước">&#8249;</button>' +
    '<div class="pd-lb-stage"><img class="pd-lb-img" alt=""></div>' +
    '<button type="button" class="pd-lb-nav pd-lb-next" aria-label="Ảnh sau">&#8250;</button>' +
    '<div class="pd-lb-bar"><span class="pd-lb-count"></span>' +
    '<a class="pd-lb-zalo" href="https://zalo.me/0967761516" target="_blank" rel="noopener">Nhắn Zalo hỏi concept này</a></div>';
  d.body.appendChild(ov);

  var img = ov.querySelector('.pd-lb-img'),
      stage = ov.querySelector('.pd-lb-stage'),
      countEl = ov.querySelector('.pd-lb-count'),
      list = [], idx = 0, pushed = false;

  function fullSrc(el) { return el.getAttribute('data-full') || el.currentSrc || el.src; }
  function preload(j) {
    var el = list[(j + list.length) % list.length];
    if (el) { var p = new Image(); p.src = fullSrc(el); }
  }
  function show(i) {
    if (!list.length) return;
    idx = (i + list.length) % list.length;
    var el = list[idx], full = fullSrc(el), small = el.currentSrc || el.src;
    img.alt = el.alt || '';
    if (small && small !== full) {
      img.src = small; /* hiện ngay bản nhỏ đã có sẵn, rồi thay bằng ảnh gốc khi tải xong */
      var p = new Image();
      p.onload = function () { if (list[idx] === el) img.src = full; };
      p.src = full;
    } else {
      img.src = full;
    }
    countEl.textContent = (idx + 1) + ' / ' + list.length;
    preload(idx + 1); preload(idx - 1);
  }
  function open(l, i) {
    list = l;
    show(i);
    ov.classList.add('active');
    d.documentElement.classList.add('pd-lb-open');
    if (window.history && history.pushState) {
      try { history.pushState({ pdlb: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
    }
  }
  function close(fromPop) {
    if (!ov.classList.contains('active')) return;
    ov.classList.remove('active');
    d.documentElement.classList.remove('pd-lb-open');
    img.removeAttribute('src');
    if (pushed && !fromPop) { pushed = false; history.back(); } else pushed = false;
  }
  window.addEventListener('popstate', function () { if (ov.classList.contains('active')) close(true); });

  Array.prototype.forEach.call(galleries, function (g) {
    var imgs = Array.prototype.slice.call(g.querySelectorAll('img'));
    imgs.forEach(function (im) { im.style.cursor = 'zoom-in'; });
    g.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('.pj, img') : null;
      if (!t) return;
      var im = t.tagName === 'IMG' ? t : t.querySelector('img');
      var i = imgs.indexOf(im);
      if (i < 0) return;
      e.preventDefault();
      open(imgs, i);
    });
  });

  ov.querySelector('.pd-lb-close').addEventListener('click', function () { close(); });
  ov.querySelector('.pd-lb-prev').addEventListener('click', function () { show(idx - 1); });
  ov.querySelector('.pd-lb-next').addEventListener('click', function () { show(idx + 1); });
  ov.addEventListener('click', function (e) {
    if (e.target === ov || e.target === stage) close();
  });
  d.addEventListener('keydown', function (e) {
    if (!ov.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
  });

  /* Vuốt trên điện thoại */
  var sx = 0, sy = 0, dx = 0, dy = 0, tracking = false;
  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    tracking = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = dy = 0;
    img.style.transition = 'none';
  }, { passive: true });
  stage.addEventListener('touchmove', function (e) {
    if (!tracking || e.touches.length !== 1) return;
    dx = e.touches[0].clientX - sx; dy = e.touches[0].clientY - sy;
    if (Math.abs(dx) > Math.abs(dy)) img.style.transform = 'translateX(' + dx + 'px)';
    else if (dy > 0) { img.style.transform = 'translateY(' + dy + 'px)'; img.style.opacity = String(Math.max(0.35, 1 - dy / 400)); }
  }, { passive: true });
  stage.addEventListener('touchend', function () {
    if (!tracking) return;
    tracking = false;
    img.style.transition = ''; img.style.transform = ''; img.style.opacity = '';
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(idx + (dx < 0 ? 1 : -1));
    else if (dy > 90 && dy > Math.abs(dx)) close();
  });
})();
