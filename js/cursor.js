'use strict';

(() => {
  if (window.matchMedia('(hover: none)').matches) return;

  const dot  = document.createElement('div');
  const ring = document.createElement('div');
  dot.className  = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);

  let mx = -200, my = -200;
  let rx = -200, ry = -200;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  const lerp = (a, b, t) => a + (b - a) * t;
  const tick = () => {
    rx = lerp(rx, mx, 0.12);
    ry = lerp(ry, my, 0.12);
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const HOVER_TARGETS = 'a, button, [role="button"], input, textarea, label';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(HOVER_TARGETS)) ring.classList.add('cursor-ring--hover');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(HOVER_TARGETS)) ring.classList.remove('cursor-ring--hover');
  });

  document.addEventListener('mousedown', () => dot.classList.add('cursor-dot--click'));
  document.addEventListener('mouseup',   () => dot.classList.remove('cursor-dot--click'));

  document.addEventListener('mouseleave', () => {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    dot.style.opacity  = '';
    ring.style.opacity = '';
  });

  document.documentElement.classList.add('custom-cursor-active');
})();
