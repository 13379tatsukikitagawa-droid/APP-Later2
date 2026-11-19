/* Lattag — トップページの うごき */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const pad2 = (n) => String(n).padStart(2, '0');
  const stampOf = (d) => `'${String(d.getFullYear()).slice(2)} ${pad2(d.getMonth() + 1)} ${pad2(d.getDate())}`;
  const play = (v) => { if (!v) return; const p = v.play(); if (p && p.catch) p.catch(() => {}); };

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

  /* 動画:画面に 入っている あいだだけ 再生する */
  const heroVideo = document.getElementById('heroVideo');
  const clips = [...document.querySelectorAll('video[data-play]')];
  if (reduce.matches) {
    if (heroVideo) { heroVideo.removeAttribute('autoplay'); heroVideo.pause(); }
  } else if ('IntersectionObserver' in window) {
    const vio = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === heroVideo && root.classList.contains('intro-on')) continue; // オープニング中は 待つ
        if (e.isIntersecting) play(e.target); else e.target.pause();
      }
    }, { threshold: 0.25 });
    clips.forEach((v) => vio.observe(v));
    if (heroVideo) vio.observe(heroVideo);
  } else {
    clips.forEach(play);
  }

  /* オープニング:写真が つぎつぎに とどいて、「Lattag」に なる */
  (() => {
    const $ = (id) => document.getElementById(id);
    const intro = $('intro'); const fly = $('introFly'); const iw = $('introWord'); const stage = $('introStage');
    const hud = $('introHud'); const hudDate = $('introDate'); const bloom = $('introBloom'); const dot = $('introDot');
    const skipBtn = $('introSkip'); const leak = $('introLeak'); const replay = $('replayIntro');
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
      const target = document.getElementById('heroMark'); const word = iw.querySelector('b');
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
      if (heroVideo && !reduce.matches) play(heroVideo);
      hud.classList.add('off'); skipBtn.classList.add('off');
      if (reduce.matches) { intro.style.transition = 'opacity .5s'; intro.style.opacity = '0'; fly.style.transition = 'opacity .5s'; fly.style.opacity = '0'; later(finish, 560); return; }
      flight(ms); hole(ms); later(finish, ms + 80);
    };
    const showWord = () => { iw.classList.add('on'); buzz([16, 50, 24]); };
    const collapse = () => {
      dot.classList.add('off'); leak.classList.remove('on');
      stage.querySelectorAll('.ip').forEach((el) => { el.style.setProperty('--sd', `${(Math.random() * 0.16).toFixed(2)}s`); el.classList.add('suck'); });
      bloom.classList.add('go');
      buzz([20, 30, 28]);
      later(showWord, 560);
      later(() => exit(950), 560 + 1500);
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
      iw.classList.add('on');
      later(() => exit(520), 260);
    };
    const run = () => {
      running = true; finished = false;
      root.classList.add('has-intro', 'intro-on'); root.classList.remove('hero-go', 'logo-in');
      intro.style.cssText = ''; fly.style.cssText = ''; iw.style.cssText = ''; iw.classList.remove('on');
      hud.classList.remove('off'); skipBtn.classList.remove('off'); dot.classList.remove('off'); bloom.classList.remove('go'); leak.classList.remove('on');
      stage.style.opacity = ''; stage.style.setProperty('--z', '1'); stage.textContent = '';
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (heroVideo) { heroVideo.pause(); try { heroVideo.currentTime = 0; } catch (e) { /* まだ 読みこみ中 */ } }
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
