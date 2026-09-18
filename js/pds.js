/* Phạm Đức Studio — tiện ích dùng chung cho mọi trang (09/2026)
   1. Ưu đãi có hạn: phần tử có data-until="YYYY-MM-DD" tự ẩn sau 23:59 ngày đó (giờ VN).
   2. Thanh liên hệ cố định (.pds-bar): chừa chỗ dưới trang, tự ẩn khi form đặt lịch đang hiện.
   3. Nút "Chọn gói" có data-goi → tự chọn sẵn gói trong form đặt lịch. */
(function(){
  /* 1. Ưu đãi hết hạn → ẩn */
  var now = Date.now();
  document.querySelectorAll('[data-until]').forEach(function(el){
    var d = el.getAttribute('data-until');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    var until = new Date(d + 'T23:59:59+07:00').getTime();
    if(!isNaN(until) && now > until){
      el.setAttribute('hidden','');
      el.style.display = 'none';
    }
  });

  /* 2. Thanh liên hệ cố định */
  var bar = document.querySelector('.pds-bar');
  if(bar && !document.body.classList.contains('calc-page')){
    document.body.classList.add('has-pds-bar');
    var form = document.getElementById('lien-he');
    if(form && 'IntersectionObserver' in window && window.matchMedia('(max-width:900px)').matches){
      new IntersectionObserver(function(entries){
        entries.forEach(function(e){ bar.style.transform = e.isIntersecting ? 'translateY(120%)' : ''; });
      }, {threshold:0.15}).observe(form);
      bar.style.transition = 'transform .25s ease';
    }
  }

  /* 3. Chọn sẵn gói trong form */
  document.addEventListener('click', function(e){
    var a = e.target.closest('[data-goi]');
    if(!a) return;
    var sel = document.getElementById('bf-goi');
    if(!sel) return;
    var want = a.getAttribute('data-goi');
    for(var i = 0; i < sel.options.length; i++){
      if(sel.options[i].text.indexOf(want) === 0){ sel.selectedIndex = i; break; }
    }
  });
})();
