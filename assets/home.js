/* Lattag — トップページの うごき */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ヘッダー:スクロールしたら すりガラスに */
  const header = document.getElementById('header');
  const onHeader = () => header.classList.toggle('is-stuck', window.scrollY > 12);
  onHeader();
  window.addEventListener('scroll', onHeader, { passive: true });

  /* スクロールで あらわれる */
  const targets = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
  } else {
    targets.forEach((t) => t.classList.add('is-in'));
  }

  /* タグの 帯:画面の 幅が うまるまで 複製して、とぎれなく 流す */
  document.querySelectorAll('.tags-row').forEach((row) => {
    const first = row.querySelector('ul');
    if (!first) return;
    const w = first.getBoundingClientRect().width;
    if (!w) return;
    const need = Math.ceil((window.innerWidth * 1.2) / w) + 1;
    while (row.children.length < need) row.appendChild(first.cloneNode(true));
    row.style.setProperty('--shift', `${-w}px`);
  });

  /* つぎの 9:00 までの カウントダウン(見ている人の 時刻で) */
  const cd = document.getElementById('countdownTime');
  if (cd) {
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(9, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const s = Math.floor((next - now) / 1000);
      cd.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* 7セグの 時計 */
  const lcd = document.getElementById('lcd');
  const SEG = { // a b c d e f g
    0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
  };
  const H = (x, y) => `${x + 1},${y} ${x + 7},${y} ${x + 8},${y + 1} ${x + 7},${y + 2} ${x + 1},${y + 2} ${x},${y + 1}`;
  const V = (x, y) => `${x + 1},${y} ${x + 2},${y + 1} ${x + 2},${y + 7} ${x + 1},${y + 8} ${x},${y + 7} ${x},${y + 1}`;
  const SHAPE = { a: H(1, 0), g: H(1, 8), d: H(1, 16), f: V(0, 1), b: V(8, 1), e: V(0, 9), c: V(8, 9) };
  let lcdText = '';
  const drawLcd = (text) => {
    if (!lcd || text === lcdText) return;
    lcdText = text;
    let x = 0; let out = '';
    for (const ch of text) {
      if (ch === ':') {
        out += `<g transform="translate(${x})"><rect class="on" x="1" y="5" width="2" height="2" rx=".4"/><rect class="on" x="1" y="11" width="2" height="2" rx=".4"/></g>`;
        x += 6;
      } else if (ch === ' ') {
        x += 13;
      } else {
        const lit = SEG[ch] || '';
        out += `<g transform="translate(${x})">` + Object.keys(SHAPE).map((k) => `<polygon class="${lit.includes(k) ? 'on' : 'off'}" points="${SHAPE[k]}"/>`).join('') + '</g>';
        x += 13;
      }
    }
    lcd.innerHTML = `<svg viewBox="-1 0 ${x} 18" aria-hidden="true"><g transform="skewX(-5)">${out}</g></svg>`;
  };

  /* 現像:スクロールに あわせて、夜 → 朝 9:00 */
  const dev = document.getElementById('develop');
  if (dev && lcd) {
    const START = 20 * 60 + 43; // 20:43
    const SPAN = (24 * 60 - START) + 9 * 60; // 9:00 まで
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const fmt = (min) => { const m = ((min % 1440) + 1440) % 1440; return `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}`; };
    let ticking = false;
    const update = () => {
      ticking = false;
      if (reduce.matches) { dev.style.setProperty('--p', 1); dev.classList.remove('is-waiting'); drawLcd('9:00'); return; }
      const r = dev.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const t = total > 0 ? clamp(-r.top / total) : 1;
      const clock = ease(clamp((t - 0.04) / 0.62));      // 時計が すすむ
      const p = ease(clamp((t - 0.34) / 0.44));          // ミルク色が とける
      dev.style.setProperty('--p', p.toFixed(4));
      dev.classList.toggle('is-waiting', p < 0.985);
      drawLcd(clock >= 1 ? '9:00' : fmt(START + Math.round(SPAN * clock)));
    };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    reduce.addEventListener('change', request);
    update();
  }

  /* ヒーロー:1日の 映像を 朝 → 夜へ 切りかえる */
  const root = document.documentElement;
  const hvs = [...document.querySelectorAll('#heroMedia .hv')];
  const bars = [...document.querySelectorAll('#heroBars i')];
  const heroTag = document.getElementById('heroTag');
  const heroClock = document.getElementById('heroClock');
  const heroDate = document.getElementById('heroDate');
  const pad2 = (n) => String(n).padStart(2, '0');
  const stampOf = (d) => `'${String(d.getFullYear()).slice(2)} ${pad2(d.getMonth() + 1)} ${pad2(d.getDate())}`;
  if (heroDate) heroDate.textContent = stampOf(new Date());
  const play = (v) => { if (!v) return; const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const HOLD = 4600;
  let hcur = 0; let helapsed = 0; let hlast = 0; let hvis = true;
  const hshow = (i, first) => {
    const prev = hcur; hcur = i; helapsed = 0;
    hvs.forEach((f, k) => f.classList.toggle('on', k === i));
    const v = hvs[i].querySelector('video');
    if (v.dataset.src && !v.src) v.src = v.dataset.src;
    try { v.currentTime = 0; } catch (e) { /* まだ 読みこみ中 */ }
    if (!reduce.matches) play(v);
    if (prev !== i) setTimeout(() => { if (hcur !== prev) hvs[prev].querySelector('video').pause(); }, 1400);
    // つぎの 映像を 先に 読みこんでおく
    const nv = hvs[(i + 1) % hvs.length].querySelector('video');
    if (nv.dataset.src && !nv.src) { nv.preload = 'auto'; nv.src = nv.dataset.src; }
    if (heroClock) heroClock.textContent = hvs[i].dataset.t;
    if (heroTag) {
      heroTag.textContent = hvs[i].dataset.tag;
      if (!first) { heroTag.classList.remove('swap'); void heroTag.offsetWidth; heroTag.classList.add('swap'); }
    }
    bars.forEach((b, k) => { b.classList.toggle('done', k < i); b.classList.remove('now'); });
    if (bars[i] && !reduce.matches) { void bars[i].offsetWidth; bars[i].style.setProperty('--bar', `${HOLD}ms`); bars[i].classList.add('now'); }
  };
  if (hvs.length) {
    const hloop = (t) => {
      const dt = hlast ? Math.min(100, t - hlast) : 0; hlast = t;
      const running = (!root.classList.contains('has-intro') || root.classList.contains('hero-go')) && hvis && !document.hidden && !reduce.matches;
      bars.forEach((b) => { b.style.animationPlayState = running ? 'running' : 'paused'; });
      if (running) { helapsed += dt; if (helapsed >= HOLD) hshow((hcur + 1) % hvs.length); }
      requestAnimationFrame(hloop);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => {
        hvis = es[0].isIntersecting;
        const v = hvs[hcur].querySelector('video');
        if (hvis) { if (!reduce.matches) play(v); } else v.pause();
      }, { threshold: 0.05 }).observe(document.getElementById('hero'));
    }
    hshow(0, true);
    requestAnimationFrame(hloop);
  }

  /* オープニング:写真が つぎつぎに とどいて、「Lattag」に なる */
  (() => {
    const $ = (id) => document.getElementById(id);
    const intro = $('intro'); const fly = $('introFly'); const iw = $('introWord'); const stage = $('introStage');
    const hud = $('introHud'); const hudDate = $('introDate'); const bloom = $('introBloom'); const dot = $('introDot');
    const tagEl = $('introTag'); const skipBtn = $('introSkip'); const leak = $('introLeak'); const replay = $('replayIntro');
    if (!intro || !fly || !iw || !stage) { root.classList.remove('intro-on'); root.classList.add('hero-go', 'logo-in'); return; }
    let timers = []; let irRaf = 0; let running = false; let finished = true;
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
    const clearAll = () => { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(irRaf); };
    const rnd = (a, b) => a + Math.random() * (b - a);
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const buzz = (p) => { try { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(p); } catch (e) { /* 対応していない 端末 */ } };
    const now = new Date();

    const buildItems = () => shuffle([...document.querySelectorAll('.intro-pool img')].map((im) => im.getAttribute('src')));
    const preload = (items) => {
      const jobs = items.map((src) => new Promise((res) => { const im = new Image(); im.onload = im.onerror = () => res(); im.src = src; if (im.decode) im.decode().then(res, res); }));
      return Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 2400))]);
    };

    const spawn = (src, i, n) => {
      const p = i / (n - 1); const el = document.createElement('figure');
      const W = window.innerWidth; const H = window.innerHeight; const wide = W > 760;
      const d = new Date(now); d.setDate(d.getDate() - 1 - Math.floor(i * 1.9 + Math.random() * 3));
      hudDate.textContent = stampOf(d);
      el.className = 'ip';
      // 画面ぜんたいに、うずまき状に ちらす
      const a = i * 2.39996 + rnd(-0.35, 0.35); const rr = (0.16 + 0.84 * ((i * 0.618) % 1)) * (0.82 + 0.28 * p);
      const rx = wide ? 40 : 44; const ry = wide ? 36 : 34;
      const x = 50 + Math.cos(a) * rx * rr + rnd(-4, 4); const y = 50 + Math.sin(a) * ry * rr + rnd(-4, 4);
      const base = wide ? Math.min(Math.min(W * 0.22, H * 0.36), 340) : Math.min(W * 0.46, 240);
      const big = (i % 9 === 8) ? 1.45 : 1;
      const w = base * (0.82 + 0.46 * p) * rnd(0.9, 1.12) * big;
      el.style.setProperty('--x', `${x.toFixed(1)}%`); el.style.setProperty('--y', `${y.toFixed(1)}%`);
      el.style.setProperty('--w', `${w.toFixed(0)}px`);
      el.style.setProperty('--r', `${rnd(-13, 13).toFixed(1)}deg`);
      el.style.zIndex = String(i + 1);
      const wrap = document.createElement('div'); wrap.className = 'w';
      const img = document.createElement('img'); img.alt = ''; img.src = src; wrap.appendChild(img);
      const stamp = document.createElement('span'); stamp.className = 'd'; stamp.textContent = stampOf(d);
      el.append(wrap, stamp);
      stage.appendChild(el);
      const kids = stage.children;
      if (kids.length > 3) kids[kids.length - 4].classList.add('old');
      if (kids.length > 7) kids[kids.length - 8].classList.add('older');
      while (kids.length > 16) stage.removeChild(stage.firstChild);
      stage.style.setProperty('--z', (1 + 0.1 * p).toFixed(3));
      if (i === Math.floor(n * 0.45)) leak.classList.add('on');
      buzz(6);
    };

    const hole = (ms) => {
      const t0 = performance.now(); const max = Math.hypot(window.innerWidth, window.innerHeight) / 2 + 60;
      const f = (t) => { const q = Math.min(1, (t - t0) / ms); const e = q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2; intro.style.setProperty('--ir', `${(max * e).toFixed(1)}px`); if (q < 1) irRaf = requestAnimationFrame(f); };
      irRaf = requestAnimationFrame(f);
    };
    const flight = (ms) => {
      const target = document.querySelector('.site-header .brand-word'); const word = iw.querySelector('b');
      if (!target || !word) return;
      const tg = target.getBoundingClientRect(); const r = word.getBoundingClientRect();
      const dx = (tg.left + tg.width / 2) - (r.left + r.width / 2); const dy = (tg.top + tg.height / 2) - (r.top + r.height / 2); const sc = tg.width / r.width;
      iw.style.transition = `transform ${ms}ms cubic-bezier(.65,0,.25,1)`;
      iw.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${sc.toFixed(4)})`;
    };
    const finish = () => {
      clearAll(); clearTimeout(window.__ifs);
      root.classList.add('logo-in');
      requestAnimationFrame(() => {
        intro.style.display = 'none'; fly.style.display = 'none';
        root.classList.remove('intro-on'); root.classList.add('hero-go');
        stage.textContent = ''; running = false; finished = true;
      });
    };
    const exit = (ms) => {
      root.classList.add('hero-go');
      tagEl.classList.add('gone'); hud.classList.add('off'); skipBtn.classList.add('off');
      if (reduce.matches) { intro.style.transition = 'opacity .5s'; intro.style.opacity = '0'; fly.style.transition = 'opacity .5s'; fly.style.opacity = '0'; later(finish, 560); return; }
      flight(ms); hole(ms); later(finish, ms + 80);
    };
    const showWord = () => { iw.classList.add('on'); later(() => tagEl.classList.add('on'), reduce.matches ? 300 : 900); buzz([16, 50, 24]); };
    const collapse = () => {
      dot.classList.add('off'); leak.classList.remove('on');
      stage.querySelectorAll('.ip').forEach((el) => { el.style.setProperty('--sd', `${(Math.random() * 0.16).toFixed(2)}s`); el.classList.add('suck'); });
      bloom.classList.add('go');
      buzz([20, 30, 28]);
      later(showWord, 560);
      later(() => exit(950), 560 + 1900);
    };
    const montage = (items) => {
      const n = items.length; let t = 0;
      items.forEach((src, i) => { later(() => spawn(src, i, n), t); t += Math.max(46, 250 * Math.pow(0.9, i)); });
      later(collapse, t + 380);
    };
    const skip = () => {
      if (!running || finished) return;
      clearAll();
      stage.style.opacity = '0'; dot.classList.add('off'); leak.classList.remove('on');
      iw.classList.add('on'); tagEl.classList.add('on');
      later(() => exit(520), 260);
    };
    const run = () => {
      running = true; finished = false;
      root.classList.add('has-intro', 'intro-on'); root.classList.remove('hero-go', 'logo-in');
      intro.style.cssText = ''; fly.style.cssText = ''; iw.style.cssText = ''; iw.classList.remove('on');
      tagEl.className = 'intro-tag'; hud.classList.remove('off'); skipBtn.classList.remove('off'); dot.classList.remove('off'); bloom.classList.remove('go'); leak.classList.remove('on');
      stage.style.opacity = ''; stage.style.setProperty('--z', '1'); stage.textContent = '';
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (hvs.length) hshow(0, true);
      if (reduce.matches) { dot.classList.add('off'); hud.classList.add('off'); later(showWord, 150); later(() => exit(0), 1900); return; }
      const items = buildItems();
      preload(items).then(() => { if (!running || finished) return; later(() => montage(items), 320); });
    };
    intro.addEventListener('click', skip);
    skipBtn.addEventListener('click', (e) => { e.stopPropagation(); skip(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') skip(); });
    if (replay) replay.addEventListener('click', () => { if (!running) run(); });
    try { run(); } catch (err) { finish(); }
  })();
})();
