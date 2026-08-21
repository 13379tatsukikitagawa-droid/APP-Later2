(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     One-time text reveal: headline / body-text / eyebrow fade+scale in
     as their section enters the viewport. Driven by IntersectionObserver
     — this is a single transition, not a per-frame scroll effect.
     ------------------------------------------------------------------ */
  var sections = document.querySelectorAll('[data-section]');

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.32 }
    );
    sections.forEach(function (s) {
      io.observe(s);
    });
  } else {
    sections.forEach(function (s) {
      s.classList.add('is-visible');
    });
  }

  var hero = document.getElementById('hero');
  requestAnimationFrame(function () {
    hero.classList.add('is-visible');
  });

  /* ------------------------------------------------------------------
     Section nav: highlights which of the 5 feature sections is centered
     in the viewport, and hides itself over the hero and closing screens.
     Runs regardless of reduced-motion — it's a state toggle, not motion.
     ------------------------------------------------------------------ */
  var sectionNav = document.querySelector('.section-nav');
  if (sectionNav && 'IntersectionObserver' in window) {
    var navDots = sectionNav.querySelectorAll('.section-nav-dot');
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          navDots.forEach(function (dot) {
            dot.classList.toggle('is-active', dot.getAttribute('data-nav-target') === id);
          });
        });
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 }
    );
    ['group', 'vote', 'me', 'gallery', 'developing'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) navObserver.observe(el);
    });

    var closingEl = document.getElementById('closing');
    var heroPassed = false;
    var closingReached = false;
    var updateNavVisibility = function () {
      sectionNav.classList.toggle('is-visible', heroPassed && !closingReached);
    };
    new IntersectionObserver(
      function (entries) {
        heroPassed = !entries[0].isIntersecting;
        updateNavVisibility();
      },
      { threshold: 0.15 }
    ).observe(hero);
    if (closingEl) {
      new IntersectionObserver(
        function (entries) {
          closingReached = entries[0].isIntersecting;
          updateNavVisibility();
        },
        { threshold: 0.15 }
      ).observe(closingEl);
    }
  }

  var heroVideo = hero.querySelector('.hero-video');

  if (reduceMotion) {
    // Respect reduced-motion: skip all continuous scroll-linked effects and
    // leave the hero video paused on its poster frame instead of autoplaying.
    document.querySelectorAll('.js-fx').forEach(function (el) {
      el.style.opacity = '1';
    });
    return;
  }

  if (heroVideo) {
    var playPromise = heroVideo.play();
    if (playPromise && playPromise.catch) playPromise.catch(function () {});
  }

  // ME phone demo: only decode/play while it's actually on screen.
  var mePhoneVideo = document.querySelector('.me-phone-video');
  if (mePhoneVideo && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var p = mePhoneVideo.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            mePhoneVideo.pause();
          }
        });
      },
      { threshold: 0.3 }
    ).observe(mePhoneVideo);
  }

  /* ------------------------------------------------------------------
     Continuous scroll-linked effects (parallax, unlocking, developing).
     A single rAF-throttled loop reads layout once per frame and writes
     transform/opacity directly — no CSS transitions in the hot path.
     ------------------------------------------------------------------ */

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function easeOutBack(t) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // Progress across a "tall" (sticky-pinned) section: 0 at the start of
  // the pin, 1 at the end of it.
  function pinProgress(el) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight;
    var denom = rect.height - vh;
    if (denom <= 0) return crossProgress(el);
    return clamp(-rect.top / denom, 0, 1);
  }

  // Progress of a normal element crossing the viewport: 0 as it enters
  // from the bottom, 1 as it exits over the top.
  function crossProgress(el) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight;
    return clamp((vh - rect.top) / (vh + rect.height), 0, 1);
  }

  // Fade in then back out as an element crosses the viewport, staying
  // fully visible while centered.
  function bellOpacity(p, edge) {
    edge = edge || 0.22;
    return Math.min(clamp(p / edge, 0, 1), clamp((1 - p) / edge, 0, 1));
  }

  var heroGlow = hero.querySelectorAll('[data-parallax]');
  var heroVideoEl = hero.querySelector('.hero-video');

  var groupSection = document.getElementById('group');
  var lockCards = groupSection.querySelectorAll('[data-lock-card]');
  var lockOverlays = groupSection.querySelectorAll('[data-lock-overlay]');
  var progressNum = groupSection.querySelector('[data-progress-num]');

  var voteSection = document.getElementById('vote');
  var voteCardWrap = voteSection.querySelector('.vote-card-wrap');
  var voteHeart = voteSection.querySelector('[data-vote-heart]');
  var voteReveal = voteSection.querySelector('.vote-reveal');

  var meSection = document.getElementById('me');
  var meNumberEl = meSection.querySelector('[data-me-number]');
  var mePickerRow = meSection.querySelector('.me-picker-row');
  var mePickerLabel = meSection.querySelector('.me-picker-label');
  var meCard = meSection.querySelector('.me-card');
  var ME_GOAL_TARGET = 7;

  var gallerySection = document.getElementById('gallery');
  var galleryCards = gallerySection.querySelectorAll('[data-gallery-card]');

  var developingSection = document.getElementById('developing');
  var developingOverlay = developingSection.querySelector('[data-developing-overlay]');
  var developingPhoto = developingSection.querySelector('[data-developing-photo]');
  var developingPercent = developingSection.querySelector('[data-developing-percent]');

  var progressBar = document.getElementById('progressBar');

  function update() {
    // Hero: gentle parallax + fade as the user scrolls away.
    var heroRect = hero.getBoundingClientRect();
    if (heroRect.bottom > 0) {
      var scrolled = -heroRect.top;
      heroGlow.forEach(function (el) {
        var factor = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        el.style.transform = 'translate3d(0,' + scrolled * factor + 'px,0)';
      });
      hero.style.opacity = String(clamp(1 - scrolled / (window.innerHeight * 0.9), 0, 1));
      if (heroVideoEl) {
        var heroProgress = clamp(scrolled / window.innerHeight, 0, 1);
        var videoScale = 1.02 + heroProgress * 0.14;
        heroVideoEl.style.transform =
          'translate3d(0,' + scrolled * 0.2 + 'px,0) scale(' + videoScale + ')';
      }
    }

    // 01. Group — cards unlock one by one as the pin scrolls through.
    var gp = pinProgress(groupSection);
    lockCards.forEach(function (card, i) {
      var start = i * 0.22;
      var end = start + 0.46;
      var local = clamp((gp - start) / (end - start), 0, 1);
      var overlay = lockOverlays[i];
      if (overlay) {
        overlay.style.opacity = String(1 - local);
        var blur = (6 * (1 - local)).toFixed(2) + 'px';
        overlay.style.backdropFilter = 'blur(' + blur + ')';
        overlay.style.webkitBackdropFilter = 'blur(' + blur + ')';
      }
      card.style.transform =
        'translateY(' + (1 - local) * 10 + 'px) scale(' + (0.96 + 0.04 * local) + ')';
    });
    if (progressNum) {
      progressNum.textContent = String(3 + Math.min(3, Math.floor(gp * 3 + 0.001)));
    }

    // 02. Vote — card settles in, then the heart pops, then the name.
    var vp = crossProgress(voteSection);
    if (voteCardWrap) {
      voteCardWrap.style.opacity = String(bellOpacity(vp, 0.28));
      voteCardWrap.style.transform = 'translateY(' + (0.5 - vp) * 46 + 'px)';
    }
    if (voteHeart) {
      var hp = clamp((vp - 0.38) / 0.24, 0, 1);
      voteHeart.style.opacity = String(hp);
      voteHeart.style.transform = 'scale(' + (hp <= 0 ? 0 : easeOutBack(hp)) + ')';
    }
    if (voteReveal) {
      var rp = clamp((vp - 0.55) / 0.28, 0, 1);
      voteReveal.style.opacity = String(rp);
      voteReveal.style.transform = 'translateY(' + (1 - rp) * 14 + 'px)';
    }

    // 03. ME — the goal number counts up as the section crosses center.
    var mp = crossProgress(meSection);
    if (mePickerRow) {
      var meOpacity = bellOpacity(mp, 0.26);
      mePickerRow.style.opacity = String(meOpacity);
      if (mePickerLabel) mePickerLabel.style.opacity = String(meOpacity);
      if (meCard) {
        meCard.style.opacity = String(meOpacity);
        var meScale = 0.94 + 0.06 * (1 - Math.abs(0.5 - mp) * 2);
        meCard.style.transform = 'translateY(' + (0.5 - mp) * 24 + 'px) scale(' + clamp(meScale, 0.9, 1) + ')';
      }
      var n = clamp(Math.round(1 + mp * (ME_GOAL_TARGET - 1) * 1.3), 1, ME_GOAL_TARGET);
      if (meNumberEl) meNumberEl.textContent = String(n);
    }

    // 04. Gallery — cards drift and fade as they pass through view.
    galleryCards.forEach(function (card, i) {
      var cp = crossProgress(card);
      card.style.opacity = String(bellOpacity(cp, 0.3));
      var dir = i % 2 === 0 ? 1 : -1;
      card.style.transform =
        'translate3d(' + (0.5 - cp) * 30 * dir + 'px,' + (0.5 - cp) * -18 + 'px,0) rotate(' +
        (0.5 - cp) * dir * 3 + 'deg)';
    });

    // 05. Developing — the emulsion fog clears and the photo gains density
    // (brightness/contrast/saturation) as the pin scrolls, like instant film.
    var dp = pinProgress(developingSection);
    if (developingOverlay) {
      developingOverlay.style.opacity = String(1 - dp);
    }
    if (developingPhoto) {
      var dBrightness = 1.9 - 0.9 * dp;
      var dContrast = 0.35 + 0.7 * dp;
      var dSaturate = 0.05 + dp;
      var dBlur = (1 - dp) * 1;
      developingPhoto.style.filter =
        'brightness(' + dBrightness + ') contrast(' + dContrast + ') saturate(' + dSaturate + ') blur(' + dBlur + 'px)';
    }
    if (developingPercent) {
      developingPercent.textContent = Math.round(dp * 100) + '%';
    }

    ticking = false;
  }

  var ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
    var doc = document.documentElement;
    var total = doc.scrollHeight - window.innerHeight;
    var pct = total > 0 ? clamp(window.scrollY / total, 0, 1) : 0;
    if (progressBar) progressBar.style.transform = 'scaleX(' + pct + ')';
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    requestAnimationFrame(update);
  });

  update();
})();
