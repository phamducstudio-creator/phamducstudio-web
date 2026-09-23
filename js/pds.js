/* Phạm Đức Studio — tiện ích dùng chung cho mọi trang (09/2026)
   1. Ưu đãi có hạn: phần tử có data-until="YYYY-MM-DD" tự ẩn sau 23:59 ngày đó (giờ VN).
   2. Thanh liên hệ cố định (.pds-bar): chừa chỗ dưới trang, tự ẩn khi form đặt lịch đang hiện.
   3. Nút "Chọn gói" có data-goi → tự chọn sẵn gói trong form đặt lịch.
   4. Hiệu ứng hiện dần (.reveal): bảo đảm LUÔN hiện — kể cả khối rất dài trên màn hình điện thoại
      (lỗi cũ: threshold 0.12 không bao giờ đạt với khối cao hơn ~8 lần màn hình → cả lưới ảnh trắng trơn).
   5. Nút chia sẻ [data-share]: mở bảng chia sẻ của điện thoại (Zalo, Messenger...) hoặc sao chép link.
   6. Dải thẻ vuốt ngang (.js-snap): chấm chỉ vị trí thẻ đang xem. */
(function(){
  var d = document;

  /* 1. Ưu đãi hết hạn → ẩn */
  var now = Date.now();
  d.querySelectorAll('[data-until]').forEach(function(el){
    var s = el.getAttribute('data-until');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return;
    var until = new Date(s + 'T23:59:59+07:00').getTime();
    if(!isNaN(until) && now > until){
      el.setAttribute('hidden','');
      el.style.display = 'none';
    }
  });

  /* 2. Thanh liên hệ cố định */
  var bar = d.querySelector('.pds-bar');
  if(bar && !d.body.classList.contains('calc-page')){
    d.body.classList.add('has-pds-bar');
    var form = d.getElementById('lien-he') || d.getElementById('dat-lich');
    if(form && 'IntersectionObserver' in window && window.matchMedia('(max-width:900px)').matches){
      new IntersectionObserver(function(entries){
        entries.forEach(function(e){ bar.style.transform = e.isIntersecting ? 'translateY(120%)' : ''; });
      }, {threshold:0.15}).observe(form);
      bar.style.transition = 'transform .25s ease';
    }
  }

  /* 3. Chọn sẵn gói trong form */
  d.addEventListener('click', function(e){
    var a = e.target.closest('[data-goi]');
    if(!a) return;
    var sel = d.getElementById('bf-goi');
    if(!sel) return;
    var want = a.getAttribute('data-goi');
    for(var i = 0; i < sel.options.length; i++){
      if(sel.options[i].text.indexOf(want) === 0){ sel.selectedIndex = i; break; }
    }
  });

  /* 4. Hiện dần khi cuộn — threshold 0: chạm mép màn hình là hiện, không phụ thuộc chiều cao khối */
  var rev = d.querySelectorAll('.reveal:not(.in)');
  if(rev.length){
    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
      }, {threshold:0, rootMargin:'0px 0px -40px 0px'});
      rev.forEach(function(el){ io.observe(el); });
    } else {
      rev.forEach(function(el){ el.classList.add('in'); });
    }
    /* chốt an toàn: khối đã nằm trên/giữa màn hình mà vì lý do nào đó chưa hiện → hiện luôn */
    setTimeout(function(){
      d.querySelectorAll('.reveal:not(.in)').forEach(function(el){
        if(el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
      });
    }, 2500);
  }

  /* 5. Chia sẻ */
  d.addEventListener('click', function(e){
    var b = e.target.closest('[data-share]');
    if(!b) return;
    e.preventDefault();
    var url = location.href.split('#')[0], title = d.title;
    var done = function(msg){
      var old = b.getAttribute('data-label') || b.textContent;
      b.setAttribute('data-label', old);
      b.textContent = msg;
      setTimeout(function(){ b.textContent = old; }, 2200);
    };
    if(navigator.share){
      navigator.share({title:title, url:url}).catch(function(){});
    } else if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(function(){ done('Đã sao chép link ✓'); }, function(){ window.prompt('Sao chép link album:', url); });
    } else {
      window.prompt('Sao chép link album:', url);
    }
    if(window.fbq) fbq('trackCustom','ChiaSeAlbum');
    if(window.gtag) gtag('event','share',{method:'button', content_type:'album', item_id:location.pathname});
  });

  /* 6. Chấm chỉ vị trí cho dải thẻ vuốt ngang */
  d.querySelectorAll('.js-snap').forEach(function(track){
    var cards = Array.prototype.slice.call(track.children);
    var dots = d.createElement('div');
    dots.className = 'snap-dots';
    dots.setAttribute('aria-hidden','true');
    cards.forEach(function(){ dots.appendChild(d.createElement('span')); });
    track.parentNode.insertBefore(dots, track.nextSibling);
    var spans = dots.children;
    var mark = function(){
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = Infinity;
      /* xếp theo vị trí hiển thị (thẻ nổi bật có thể được đưa lên đầu bằng CSS order) */
      cards.slice().sort(function(a, b){ return a.offsetLeft - b.offsetLeft; }).forEach(function(c, i){
        var cm = c.offsetLeft + c.offsetWidth / 2, dist = Math.abs(cm - mid);
        if(dist < bd){ bd = dist; best = i; }
      });
      for(var i = 0; i < spans.length; i++) spans[i].className = i === best ? 'on' : '';
    };
    var t;
    track.addEventListener('scroll', function(){ clearTimeout(t); t = setTimeout(mark, 60); }, {passive:true});
    window.addEventListener('resize', mark);
    mark();
  });
})();
