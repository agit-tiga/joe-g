'use strict';

(function () {
  /* ------------------------------------------------------------------ */
  /* IMAGE REGISTRY                                                        */
  /* ------------------------------------------------------------------ */
  const GALLERY = [
    { thumb: 'assets/images/tattoos/thumb/tattoo-03.jpg',   full: 'assets/images/tattoos/tattoo-03.jpg' },
    { thumb: 'assets/images/tattoos/thumb/tattoo-04.jpg',   full: 'assets/images/tattoos/tattoo-04.jpg' },
    { thumb: 'assets/images/tattoos/thumb/tattoo-05.jpg',   full: 'assets/images/tattoos/tattoo-05.jpg' },
    { thumb: 'assets/images/tattoos/thumb/tattoo-06.jpg',   full: 'assets/images/tattoos/tattoo-06.jpg' },
    { thumb: 'assets/images/tattoos/thumb/tattoo-07.jpg',   full: 'assets/images/tattoos/tattoo-07.jpg' },
    { thumb: 'assets/images/tattoos/thumb/tattoo-08.jpg',   full: 'assets/images/tattoos/tattoo-08.jpg' },
    { thumb: 'assets/images/tattoos/thumb/tattoo-09.jpg',   full: 'assets/images/tattoos/tattoo-09.jpg' },
    { thumb: 'assets/images/tattoos/thumb/tattoo-10.jpg',   full: 'assets/images/tattoos/tattoo-10.jpg' },
    { thumb: 'assets/images/tattoos/thumb/tattoo-11.jpg',   full: 'assets/images/tattoos/tattoo-11.jpg' },
  ];

  /* 2 Seiten à 6 Bilder — je mit eigenem Layout */
  const SETS = [
    { size: 6, layout: 'layout-a', areas: ['a','b','c','d','e','f'] },
    { size: 6, layout: 'layout-b', areas: ['a','b','c','d','e','f'] },
  ];
  /* Rückwärtskompatibel: SET_SIZES nicht mehr gebraucht */
  const SET_SIZES = SETS.map(s => s.size);

  /* ------------------------------------------------------------------ */
  /* CAROUSEL SETUP                                                        */
  /* ------------------------------------------------------------------ */

  const track     = document.getElementById('portfolio-grid');
  const dotsWrap  = document.getElementById('portfolio-dots');
  const btnPrev   = document.querySelector('.portfolio__arrow--prev');
  const btnNext   = document.querySelector('.portfolio__arrow--next');

  if (!track) return;

  /* Build pages from set definitions */
  const pages = [];
  let offset = 0;
  SETS.forEach(set => {
    pages.push({ items: GALLERY.slice(offset, offset + set.size), layout: set.layout, areas: set.areas });
    offset += set.size;
  });

  let currentPage = 0;

  /* Build all pages in DOM */
  pages.forEach((page, pageIdx) => {
    const pageItems = page.items;
    const startIndex = SET_SIZES.slice(0, pageIdx).reduce((a, b) => a + b, 0);

    const pageEl = document.createElement('div');
    pageEl.className = `portfolio__page portfolio__page--${page.layout}`;

    pageItems.forEach((item, itemIdx) => {
      const globalIndex = startIndex + itemIdx;

      const el = document.createElement('div');
      el.className = 'portfolio__item';
      if (page.areas && page.areas[itemIdx]) {
        el.dataset.area = page.areas[itemIdx];
      }
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `Bild ${globalIndex + 1} — Galerie öffnen`);
      el.dataset.index = globalIndex;

      const img = document.createElement('img');
      img.src = item.thumb;
      img.alt = `Tattoo von Joe Guaraglia, Bild ${globalIndex + 1}`;
      /* Eager only for first page, first 2 items */
      img.loading = (pageIdx === 0 && itemIdx < 2) ? 'eager' : 'lazy';

      el.appendChild(img);
      pageEl.appendChild(el);

      el.addEventListener('click', () => openLightbox(globalIndex));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(globalIndex); }
      });
    });

    track.appendChild(pageEl);
  });

  /* Build dot indicators */
  const dots = pages.map((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'portfolio__dot' + (i === 0 ? ' portfolio__dot--active' : '');
    dot.setAttribute('aria-label', `Bild-Set ${i + 1}`);
    dot.setAttribute('role', 'tab');
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
    return dot;
  });

  /* Navigate to a page */
  function goTo(index) {
    currentPage = index;
    track.style.transform = `translateX(-${currentPage * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('portfolio__dot--active', i === currentPage));
    if (btnPrev) btnPrev.disabled = currentPage === 0;
    if (btnNext) btnNext.disabled = currentPage === pages.length - 1;
  }

  /* Arrow buttons */
  if (btnPrev) {
    btnPrev.disabled = true;
    btnPrev.addEventListener('click', () => { if (currentPage > 0) goTo(currentPage - 1); });
  }
  if (btnNext) {
    btnNext.addEventListener('click', () => { if (currentPage < pages.length - 1) goTo(currentPage + 1); });
  }

  /* Touch swipe on carousel */
  let touchStartX = 0;
  const trackWrap = track.closest('.portfolio__track-wrap');
  if (trackWrap) {
    trackWrap.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    trackWrap.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        if (dx < 0 && currentPage < pages.length - 1) goTo(currentPage + 1);
        if (dx > 0 && currentPage > 0) goTo(currentPage - 1);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* LIGHTBOX                                                              */
  /* ------------------------------------------------------------------ */

  let lbIndex = 0;
  let lbTouchStartX = 0;

  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Galerie');
  lb.innerHTML = `
    <div class="lb__backdrop"></div>
    <button class="lb__close" aria-label="Galerie schließen">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <button class="lb__nav lb__nav--prev" aria-label="Vorheriges Bild">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <div class="lb__stage">
      <div class="lb__img-wrap">
        <img class="lb__img" src="" alt="" />
        <div class="lb__spinner" aria-hidden="true"></div>
      </div>
    </div>
    <button class="lb__nav lb__nav--next" aria-label="Nächstes Bild">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
    <div class="lb__counter" aria-live="polite"></div>
  `;
  document.body.appendChild(lb);

  const lbImg     = lb.querySelector('.lb__img');
  const lbCounter = lb.querySelector('.lb__counter');
  const lbSpinner = lb.querySelector('.lb__spinner');

  function openLightbox(index) {
    lbIndex = index;
    lb.classList.add('lb--open');
    document.body.style.overflow = 'hidden';
    loadLbImage(index);
    lb.querySelector('.lb__close').focus();
  }

  function closeLightbox() {
    lb.classList.remove('lb--open');
    document.body.style.overflow = '';
  }

  function loadLbImage(index) {
    const entry = GALLERY[index];
    lbImg.classList.remove('lb__img--visible');
    lbSpinner.classList.add('lb__spinner--active');
    lbCounter.textContent = `${index + 1} / ${GALLERY.length}`;

    const tmp = new Image();
    tmp.onload = () => {
      lbImg.src = entry.full;
      lbImg.alt = `Tattoo von Joe Guaraglia, Bild ${index + 1}`;
      lbSpinner.classList.remove('lb__spinner--active');
      lbImg.classList.add('lb__img--visible');
    };
    tmp.src = entry.full;

    /* Preload neighbours */
    [index - 1, index + 1].forEach(i => {
      const n = (i + GALLERY.length) % GALLERY.length;
      const pre = new Image(); pre.src = GALLERY[n].full;
    });
  }

  function lbNavigate(dir) {
    lbIndex = (lbIndex + dir + GALLERY.length) % GALLERY.length;
    loadLbImage(lbIndex);
  }

  lb.querySelector('.lb__close').addEventListener('click', closeLightbox);
  lb.querySelector('.lb__backdrop').addEventListener('click', closeLightbox);
  lb.querySelector('.lb__nav--prev').addEventListener('click', () => lbNavigate(-1));
  lb.querySelector('.lb__nav--next').addEventListener('click', () => lbNavigate(1));

  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('lb--open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  lbNavigate(-1);
    if (e.key === 'ArrowRight') lbNavigate(1);
  });

  lb.addEventListener('touchstart', (e) => { lbTouchStartX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - lbTouchStartX;
    if (Math.abs(dx) > 50) lbNavigate(dx < 0 ? 1 : -1);
  });
})();
