/* Phạm Đức Studio — Lightbox phóng to ảnh album (thuần JS, không phụ thuộc thư viện ngoài) */
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    var galleries = document.querySelectorAll('.album-sub-gallery');
    if(!galleries.length) return;

    // Tạo overlay dùng chung 1 lần
    var overlay = document.createElement('div');
    overlay.className = 'pd-lightbox';
    overlay.innerHTML =
      '<button type="button" class="pd-lb-close" aria-label="Đóng">&times;</button>' +
      '<button type="button" class="pd-lb-nav pd-lb-prev" aria-label="Ảnh trước">&#8249;</button>' +
      '<div class="pd-lb-stage"><img class="pd-lb-img" src="" alt=""></div>' +
      '<button type="button" class="pd-lb-nav pd-lb-next" aria-label="Ảnh sau">&#8250;</button>' +
      '<div class="pd-lb-count"></div>';
    document.body.appendChild(overlay);

    var imgEl   = overlay.querySelector('.pd-lb-img');
    var countEl = overlay.querySelector('.pd-lb-count');
    var btnClose= overlay.querySelector('.pd-lb-close');
    var btnPrev = overlay.querySelector('.pd-lb-prev');
    var btnNext = overlay.querySelector('.pd-lb-next');

    var currentList = [];
    var currentIndex = 0;

    function show(index){
      if(!currentList.length) return;
      currentIndex = (index + currentList.length) % currentList.length;
      var el = currentList[currentIndex];
      imgEl.src = el.currentSrc || el.src;
      imgEl.alt = el.alt || '';
      countEl.textContent = (currentIndex+1) + ' / ' + currentList.length;
    }

    function open(list, index){
      currentList = list;
      show(index);
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function close(){
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      imgEl.src = '';
    }

    galleries.forEach(function(gallery){
      var imgs = Array.prototype.slice.call(gallery.querySelectorAll('img.photo-slot'));
      imgs.forEach(function(img, i){
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function(){
          open(imgs, i);
        });
      });
    });

    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function(){ show(currentIndex - 1); });
    btnNext.addEventListener('click', function(){ show(currentIndex + 1); });
    overlay.addEventListener('click', function(e){
      if(e.target === overlay || e.target.classList.contains('pd-lb-stage')) close();
    });
    document.addEventListener('keydown', function(e){
      if(!overlay.classList.contains('active')) return;
      if(e.key === 'Escape') close();
      else if(e.key === 'ArrowLeft') show(currentIndex - 1);
      else if(e.key === 'ArrowRight') show(currentIndex + 1);
    });
  });
})();
