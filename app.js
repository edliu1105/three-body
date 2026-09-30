/* 三体 · 画廊 */
(() => {
  const reel = document.getElementById('reel');
  const screens = [...reel.querySelectorAll('.screen')];
  const plates = screens.filter(s => s.classList.contains('plate'));
  const total = plates.length;
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rail = document.querySelector('.rail'), dot = rail.querySelector('.dot'), tip = rail.querySelector('.tip');
  const index = document.getElementById('index');
  const playBtn = document.getElementById('play');
  let cur = 0, playing = null;

  // ---- which screen is on
  const io = new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting && e.intersectionRatio >= .55) activate(screens.indexOf(e.target));
  }, { root: reel, threshold: [.55] });
  screens.forEach(s => io.observe(s));

  function activate(i) {
    if (i < 0) return;
    cur = i;
    const s = screens[i];
    screens.forEach((x, k) => { if (Math.abs(k - i) > 1) x.classList.remove('on'); });
    s.classList.add('on');
    body.classList.toggle('at-open', s.classList.contains('opening'));
    body.classList.toggle('at-card', !s.classList.contains('plate'));
    body.classList.toggle('lit', s.classList.contains('plate'));
    if (s.dataset.glow) document.documentElement.style.setProperty('--glow', s.dataset.glow);
    // the next two pictures start loading now
    for (let k = i + 1; k <= i + 3 && k < screens.length; k++) {
      const img = screens[k].querySelector('img'); if (img) img.loading = 'eager';
    }
    const n = +(s.dataset.n || 0);
    placeDot(n ? n : (s.classList.contains('coda') ? total : nearestN(i)), s);
    const id = s.id || '';
    if (location.hash !== '#' + (s.dataset.n || id)) history.replaceState(null, '', s.dataset.n ? '#' + s.dataset.n : (i ? '#' + id : location.pathname));
    if (s.dataset.title) document.title = s.dataset.title + '——三体';
    else document.title = document.querySelector('meta[name="doc-title"]').content;
    markIndex();
  }
  function nearestN(i) { for (let k = i; k < screens.length; k++) if (screens[k].dataset.n) return +screens[k].dataset.n; return total; }

  // ---- time rail
  const railH = () => rail.getBoundingClientRect();
  function placeDot(n, s) {
    const portrait = matchMedia('(orientation: portrait) and (max-aspect-ratio: 4/5)').matches;
    const f = total > 1 ? (n - 1) / (total - 1) : 0;
    if (portrait) { dot.style.left = (f * 100) + '%'; dot.style.top = '0'; }
    else { dot.style.top = (f * 100) + '%'; dot.style.left = '50%'; }
    tip.style.top = (f * 100) + '%';
    const p = plates[n - 1];
    tip.innerHTML = p ? `<small>${n}</small>${p.dataset.title}` : '';
  }
  plates.forEach((p, k) => {
    if (k && p.dataset.book !== plates[k - 1].dataset.book) {
      const t = document.createElement('i'); t.className = 'seg'; t.style.top = (k - .5) / (total - 1) * 100 + '%'; rail.appendChild(t);
    }
  });
  function railPick(ev) {
    const r = railH(); const f = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
    const n = Math.round(f * (total - 1)) + 1;
    placeDot(n); return n;
  }
  let dragN = 0;
  rail.addEventListener('pointerdown', ev => { stop(); rail.setPointerCapture(ev.pointerId); rail.classList.add('drag'); dragN = railPick(ev); go(plates[dragN - 1], true); });
  rail.addEventListener('pointermove', ev => { if (rail.classList.contains('drag')) { const n = railPick(ev); if (n !== dragN) { dragN = n; go(plates[n - 1], true); } } });
  rail.addEventListener('pointerup', () => rail.classList.remove('drag'));
  rail.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openIndex(); } });

  // ---- moving
  function go(s, instant) {
    if (!s) return;
    reel.scrollTo({ top: s.offsetTop, behavior: instant || reduce ? 'auto' : 'smooth' });
  }
  const step = d => go(screens[Math.min(screens.length - 1, Math.max(0, cur + d))]);

  document.addEventListener('keydown', ev => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    wake();
    if (index.classList.contains('open')) { if (ev.key === 'Escape') closeIndex(); return; }
    const k = ev.key;
    if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(k)) { ev.preventDefault(); stop(); step(1); }
    else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(k)) { ev.preventDefault(); stop(); step(-1); }
    else if (k === 'Home') { ev.preventDefault(); stop(); go(screens[0]); }
    else if (k === 'End') { ev.preventDefault(); stop(); go(screens[screens.length - 1]); }
    else if (k === 'g' || k === 'G' || k === 'i' || k === 'I') openIndex();
    else if (k === 'p' || k === 'P') togglePlay();
    else if (k === 'f' || k === 'F') fullscreen();
    else if (k === 'Enter' && screens[cur].classList.contains('plate')) toggleBare();
    else if (k === 'Escape') { if (body.classList.contains('bare')) toggleBare(false); stop(); }
  });
  ['wheel', 'touchstart'].forEach(t => reel.addEventListener(t, () => { if (playing) stop(); }, { passive: true }));

  // ---- picture only
  function toggleBare(on) {
    const want = on === undefined ? !body.classList.contains('bare') : on;
    body.classList.add('tx'); setTimeout(() => body.classList.remove('tx'), 1000);
    body.classList.toggle('bare', want);
    requestAnimationFrame(() => go(screens[cur], true));
  }
  reel.addEventListener('click', ev => { if (ev.target.closest('.pic')) toggleBare(); });

  // ---- screening
  function togglePlay() { playing ? stop() : play(); }
  function play() {
    playing = true; playBtn.setAttribute('aria-pressed', 'true'); playBtn.textContent = '停止';
    if (!screens[cur].classList.contains('plate') && cur === 0) step(1);
    tick();
  }
  function tick() {
    clearTimeout(playing);
    const s = screens[cur];
    const words = (s.querySelector('figcaption, .epi')?.textContent || '').length;
    const ms = s.classList.contains('plate') ? 7000 + words * 120 : 6000;
    playing = setTimeout(() => { if (cur >= screens.length - 1) return stop(); step(1); setTimeout(tick, 1200); }, ms);
  }
  function stop() { if (!playing) return; clearTimeout(playing); playing = null; playBtn.setAttribute('aria-pressed', 'false'); playBtn.textContent = '放映'; }
  playBtn.addEventListener('click', togglePlay);

  // ---- full screen (TV, Vision Pro, desktop)
  const fsBtn = document.getElementById('fs');
  const canFs = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  if (!canFs) fsBtn.remove();
  function fullscreen() {
    if (!canFs) return;
    const el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
  }
  fsBtn?.addEventListener('click', fullscreen);

  // ---- contents: every frame, two actions away
  function openIndex() {
    stop(); index.classList.add('open'); index.setAttribute('aria-hidden', 'false');
    markIndex();
    const c = index.querySelector('li.cur button');
    (c || index.querySelector('li button'))?.focus({ preventScroll: true });
    c?.scrollIntoView({ block: 'center' });
  }
  function closeIndex() { index.classList.remove('open'); index.setAttribute('aria-hidden', 'true'); document.getElementById('open-index').focus({ preventScroll: true }); }
  function markIndex() {
    const n = +(screens[cur].dataset.n || 0);
    index.querySelectorAll('li').forEach(li => li.classList.toggle('cur', +li.dataset.n === n));
  }
  document.getElementById('open-index').addEventListener('click', openIndex);
  index.querySelector('.close').addEventListener('click', closeIndex);
  index.addEventListener('click', ev => {
    const b = ev.target.closest('li button'); if (!b) return;
    closeIndex(); body.classList.remove('bare'); go(plates[+b.closest('li').dataset.n - 1], true);
  });
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(document.getElementById(b.dataset.go))));

  // ---- controls rest when you do
  let idleT;
  function wake() {
    body.classList.remove('idle'); clearTimeout(idleT);
    idleT = setTimeout(() => { if (!index.classList.contains('open') && !rail.classList.contains('drag')) body.classList.add('idle'); }, 3200);
  }
  ['pointermove', 'pointerdown', 'wheel', 'touchstart'].forEach(t => addEventListener(t, wake, { passive: true }));
  reel.addEventListener('scroll', wake, { passive: true });
  wake();

  // ---- arrive where the link points
  const h = decodeURIComponent(location.hash.slice(1));
  const target = /^\d+$/.test(h) ? plates[+h - 1] : (h && document.getElementById(h));
  if (target) { reel.scrollTop = target.offsetTop; activate(screens.indexOf(target)); }
  else activate(0);
  addEventListener('hashchange', () => {
    const v = decodeURIComponent(location.hash.slice(1));
    const t = /^\d+$/.test(v) ? plates[+v - 1] : document.getElementById(v);
    if (t && screens.indexOf(t) !== cur) go(t, true);
  });
  addEventListener('resize', () => requestAnimationFrame(() => go(screens[cur], true)));
})();
