// Copy-to-clipboard buttons (mailto: is dead on most desktops).
(function () {
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  let t;
  function show(msg) {
    toast.textContent = msg; toast.classList.add('is-on');
    clearTimeout(t); t = setTimeout(() => toast.classList.remove('is-on'), 1800);
  }
  document.querySelectorAll('.js-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const v = btn.dataset.copy;
      try { await navigator.clipboard.writeText(v); show('Copied: ' + v); }
      catch (e) { window.location.href = 'mailto:' + v; }
    });
  });
})();

// Scroll story.
// Phase A (0–0.28): the phone rises, un-tilts and scales in.
// Phase B (0.28–1): a strip of screens scrolls inside the phone. Each step dwells,
// then slides to the next while the phone nudges on its Y axis. Captions are driven
// by the same scroll progress, so fast scrolling can't desync them.
// Falls back to a static stacked layout for reduced motion and short viewports.
(function () {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const short = window.matchMedia('(max-height: 640px), (max-width: 760px) and (max-height: 720px)');

  const story = document.querySelector('.story');
  const phone = document.getElementById('phone');
  const strip = document.getElementById('strip');
  const captions = Array.from(document.querySelectorAll('.caption'));
  const steps = captions.length;
  if (!story || !phone || !strip || !steps) return;

  if (reduce.matches) { root.classList.add('reduce-motion'); return; }
  root.classList.replace('no-js', 'js');

  const dots = document.createElement('div');
  dots.className = 'story-dots'; dots.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < steps; i++) dots.appendChild(document.createElement('i'));
  story.querySelector('.story-sticky').appendChild(dots);
  const dotEls = Array.from(dots.children);

  const ENTER = 0.28;
  const DWELL = 0.55;              // share of each step spent holding the screen still
  const mobile = window.matchMedia('(max-width: 760px)');
  let ticking = false;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const smooth = t => t * t * (3 - 2 * t);

  function setStatic(on) {
    root.classList.toggle('static-story', on);
    if (on) {
      phone.style.transform = ''; strip.style.transform = '';
      captions.forEach(c => { c.style.opacity = ''; c.style.transform = ''; });
    }
  }

  function render() {
    ticking = false;
    if (short.matches) { setStatic(true); return; }
    setStatic(false);

    const rect = story.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = story.offsetHeight - vh;
    const p = clamp(-rect.top / total, 0, 1);
    const m = mobile.matches;

    // phase A
    const a = easeOut(clamp(p / ENTER, 0, 1));
    const y = (m ? 30 : 35) * (1 - a);
    const s0 = m ? 0.7 : 0.62;
    const s = s0 + (1 - s0) * a;
    const rx = (m ? 18 : 22) * (1 - a);
    story.classList.toggle('is-in', a > 0.85);

    // phase B: continuous position along the strip, with dwell + slide per step
    const b = clamp((p - ENTER) / (1 - ENTER), 0, 0.9999) * steps;   // 0 … steps
    const i = Math.floor(b);
    const frac = b - i;
    const slide = i >= steps - 1 ? 0 : smooth(clamp((frac - DWELL) / (1 - DWELL), 0, 1));
    const pos = Math.min(i + slide, steps - 1);
    strip.style.transform = `translateY(${-pos * 100}%)`;

    // nudge the phone while a slide is in progress
    const ry = Math.sin(slide * Math.PI) * -7;
    const lift = Math.sin(slide * Math.PI) * -1.2;
    phone.style.transform = `translateY(${y + lift}vh) scale(${s}) rotateX(${rx}deg) rotateY(${ry}deg)`;

    // captions: outgoing fades in the first half of the slide, incoming rises in the second
    captions.forEach((c, k) => {
      let o = 0, ty = 18;
      if (k === i) { o = 1 - clamp(slide * 2, 0, 1); ty = -18 * clamp(slide * 2, 0, 1); }
      else if (k === i + 1) { const u = clamp(slide * 2 - 1, 0, 1); o = u; ty = 18 * (1 - u); }
      c.style.opacity = o;
      c.style.transform = `translateY(${ty}px)`;
      c.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
    });
    const active = Math.round(pos);
    dotEls.forEach((d, k) => d.classList.toggle('is-active', k === active));
  }

  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  render();

  // "Work" should land on the first fully-visible story state, not the entrance phase.
  document.querySelectorAll('a[href="#work"]').forEach(a => {
    a.addEventListener('click', e => {
      if (short.matches) return;
      e.preventDefault();
      const top = story.offsetTop + (story.offsetHeight - window.innerHeight) * (ENTER + 0.02);
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();
