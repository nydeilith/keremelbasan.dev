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
// then slides to the next while the phone nudges on its Y axis; captions follow.
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) { document.documentElement.classList.add('reduce-motion'); return; }

  const story = document.querySelector('.story');
  const phone = document.getElementById('phone');
  const strip = document.getElementById('strip');
  const captions = Array.from(document.querySelectorAll('.caption'));
  const steps = captions.length;
  if (!story || !phone || !strip || !steps) return;

  const dots = document.createElement('div');
  dots.className = 'story-dots'; dots.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < steps; i++) dots.appendChild(document.createElement('i'));
  story.querySelector('.story-sticky').appendChild(dots);
  const dotEls = Array.from(dots.children);

  const ENTER = 0.28;
  const DWELL = 0.55;              // share of each step spent holding the screen still
  const mobile = window.matchMedia('(max-width: 760px)');
  let current = -1, ticking = false;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const smooth = t => t * t * (3 - 2 * t);

  function setStep(i) {
    if (i === current) return;
    current = i;
    captions.forEach(c => c.classList.toggle('is-active', +c.dataset.step === i));
    dotEls.forEach((d, k) => d.classList.toggle('is-active', k === i));
  }

  function render() {
    ticking = false;
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

    setStep(Math.round(pos));
  }

  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  render();
})();
