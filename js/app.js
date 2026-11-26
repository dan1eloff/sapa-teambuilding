(function () {
  'use strict';
  var C = window.INVITE;
  var $ = function (s) { return document.querySelector(s); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;
  var screens = { intro: $('#intro'), verify: $('#verify'), reveal: $('#reveal'), final: $('#final') };
  var stage = 'intro';

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
  function pad(n) { return String(n).padStart(2, '0'); }
  function anim(el, frames, opts) {
    if (!el.animate) return { finished: Promise.resolve() };
    var a = el.animate(frames, opts);
    return a;
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- Мазмұн ---------- */
  $('#question').textContent = C.question;
  $('#dateBig').textContent = C.date.big;
  $('#dateSmall').textContent = C.date.small;
  $('#timeBig').textContent = C.time.big;
  $('#timeSmall').textContent = C.time.small;
  $('#placeBig').textContent = C.place.big;
  $('#placeSmall').textContent = C.place.small;
  $('#dressBig').textContent = C.dress.big;
  $('#dressSmall').textContent = C.dress.small;
  $('#mapBtn').href = C.place.map;
  $('#mapBtn2').href = C.place.map;
  $('#finalWhen').textContent = C.date.big + ', ' + C.date.small + ' · ' + C.time.big;
  $('#finalWhere').textContent = C.place.big + ', ' + C.place.small;
  Array.prototype.forEach.call(document.querySelectorAll('#reveal .rv'), function (el, i) {
    el.style.setProperty('--i', i);
  });

  /* ---------- Экран ауыстыру ---------- */
  function go(next, opts) {
    opts = opts || {};
    var from = screens[stage], to = screens[next];
    var out = (reduce || opts.skipOut)
      ? Promise.resolve()
      : anim(from, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.06)' }],
          { duration: 420, easing: 'ease-in', fill: 'forwards' }).finished.catch(function () {});
    return out.then(function () {
      from.classList.remove('is-active');
      if (from.getAnimations) from.getAnimations().forEach(function (a) { a.cancel(); });
      body.classList.remove('stage-' + stage);
      stage = next;
      body.classList.add('stage-' + next);
      to.classList.add('is-active');
      window.scrollTo(0, 0);
      if (!reduce) {
        var frames = next === 'reveal'
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }];
        anim(to, frames, { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    });
  }

  /* ---------- Гирлянда ---------- */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var garland = $('#garland'), garlandW = 0;
  function mk(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function buildGarland() {
    var W = window.innerWidth;
    if (W === garlandW) return;
    garlandW = W;
    garland.innerHTML = '';
    garland.setAttribute('viewBox', '0 0 ' + W + ' 150');
    var strands = [
      { x0: -12, y0: 6, x1: W + 12, y1: 24, sag: Math.min(70, W * 0.17) },
      { x0: -12, y0: 34, x1: W + 12, y1: 2, sag: Math.min(52, W * 0.12) }
    ];
    var gap = 33, seed = 0;
    strands.forEach(function (s, si) {
      var mx = (s.x0 + s.x1) / 2, my = (s.y0 + s.y1) / 2 + s.sag * 2;
      var path = mk('path', { d: 'M' + s.x0 + ' ' + s.y0 + ' Q' + mx + ' ' + my + ' ' + s.x1 + ' ' + s.y1, 'class': 'wire' }, garland);
      var len = path.getTotalLength();
      var n = Math.max(6, Math.floor(len / gap));
      for (var i = 1; i < n; i++) {
        var p = path.getPointAtLength((len / n) * (i + (si ? 0.5 : 0)));
        var g = mk('g', { 'class': 'bulb' }, garland);
        seed++;
        g.style.setProperty('--d', (1.6 + ((seed * 37) % 23) / 10) + 's');
        g.style.setProperty('--dl', (-((seed * 53) % 30) / 10) + 's');
        mk('rect', { x: p.x - 1.6, y: p.y - 1, width: 3.2, height: 4, rx: 1, 'class': 'socket' }, g);
        mk('circle', { cx: p.x, cy: p.y + 7, r: 13, fill: 'url(#g-bulb)' }, g);
        mk('circle', { cx: p.x, cy: p.y + 6.5, r: 3, 'class': 'core' }, g);
      }
    });
  }
  buildGarland();
  var rsT;
  window.addEventListener('resize', function () { clearTimeout(rsT); rsT = setTimeout(buildGarland, 150); });

  /* ---------- Ұшатын әріптер ---------- */
  var lettersEl = $('#letters'), flies = [], rafOn = false, lastT = 0;
  function placeFly(f) { f.el.style.transform = 'translate3d(' + f.x.toFixed(1) + 'px,' + f.y.toFixed(1) + 'px,0)'; }
  function stepFlies(t) {
    var dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
    var W = window.innerWidth, H = window.innerHeight;
    for (var i = 0; i < flies.length; i++) {
      var f = flies[i];
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.x < -f.s * 0.15) { f.x = -f.s * 0.15; f.vx = Math.abs(f.vx); }
      if (f.x > W - f.s * 0.85) { f.x = W - f.s * 0.85; f.vx = -Math.abs(f.vx); }
      if (f.y < -f.s * 0.15) { f.y = -f.s * 0.15; f.vy = Math.abs(f.vy); }
      if (f.y > H - f.s * 0.85) { f.y = H - f.s * 0.85; f.vy = -Math.abs(f.vy); }
      placeFly(f);
    }
    if (stage === 'final') { rafOn = false; return; }
    requestAnimationFrame(stepFlies);
  }
  function spawnLetter(ch, fromRect) {
    var s = Math.round(Math.min(window.innerWidth * 0.44, 190));
    var el = document.createElement('div');
    el.className = 'fly';
    el.style.setProperty('--s', s + 'px');
    var i = document.createElement('i');
    i.textContent = ch;
    el.appendChild(i);
    lettersEl.appendChild(el);
    var ang = Math.random() * Math.PI * 2;
    var sp = reduce ? 20 + Math.random() * 15 : 70 + Math.random() * 70;
    var f = {
      el: el, s: s,
      x: fromRect.left + fromRect.width / 2 - s / 2,
      y: fromRect.top + fromRect.height / 2 - s / 2,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp
    };
    flies.push(f);
    placeFly(f);
    anim(i, [
      { opacity: 1, transform: 'scale(.3)', filter: 'blur(0px)', color: '#ffe2a3' },
      { opacity: 0.95, transform: 'scale(1.12)', filter: 'blur(0px)', color: '#f0c06a', offset: 0.25 },
      { opacity: 0.11, transform: 'scale(1)', filter: 'blur(1.5px)', color: '#9be7c8' }
    ], { duration: 1700, easing: 'ease-out' });
    if (!rafOn) { rafOn = true; lastT = performance.now(); requestAnimationFrame(stepFlies); }
  }

  /* ---------- 1. Батырма ---------- */
  var orb = $('#orb'), ripple = $('#orbRipple'), mark = $('#orbMark'), hint = $('#hint');
  var dots = document.querySelectorAll('#progress i');
  var taps = 0, TOTAL = C.letters.length;
  hint.textContent = 'Түймені ' + TOTAL + ' рет бас';

  orb.addEventListener('click', function () {
    if (taps >= TOTAL) return;
    Sound.unlock();
    Sound.chime(taps);
    vibrate(25);
    taps++;
    anim(orb, [{ transform: 'scale(1)' }, { transform: 'scale(.86)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }],
      { duration: 450, easing: 'ease-out' });
    anim(ripple, [{ transform: 'scale(1)', opacity: 0.85 }, { transform: 'scale(1.8)', opacity: 0 }],
      { duration: 800, easing: 'cubic-bezier(.2,.8,.2,1)' });
    mark.style.setProperty('--rot', (taps * 90) + 'deg');
    if (dots[taps - 1]) dots[taps - 1].classList.add('on');
    spawnLetter(C.letters[taps - 1], orb.getBoundingClientRect());
    hint.textContent = taps < TOTAL ? 'Тағы ' + (TOTAL - taps) + ' рет' : 'Код жиналды!';
    if (taps === TOTAL) {
      wait(1150).then(function () { return go('verify'); }).then(function () {
        try { input.focus({ preventScroll: true }); } catch (e) {}
      });
    }
  });

  /* ---------- 2. Код ---------- */
  var input = $('#answer'), vcard = $('#verifyCard'), vmsg = $('#verifyMsg');
  var DEFAULT_MSG = vmsg.textContent;
  var LAT = { S: 'С', A: 'А', P: 'П', C: 'С', E: 'Е', O: 'О', K: 'К', M: 'М', T: 'Т', H: 'Н', B: 'В', X: 'Х' };
  function norm(s) {
    return String(s).toUpperCase().replace(/\s+/g, '').replace(/[A-Z]/g, function (ch) { return LAT[ch] || ch; });
  }
  var OK = C.answers.map(norm);
  var wrongT = null, solved = false;

  function wrong() {
    vcard.classList.add('is-wrong');
    vmsg.textContent = 'Қате! Тағы байқап көр';
    vcard.classList.remove('shake'); void vcard.offsetWidth; vcard.classList.add('shake');
    Sound.error();
    vibrate([40, 60, 40]);
    setTimeout(function () { if (!solved && vcard.classList.contains('is-wrong')) vmsg.textContent = DEFAULT_MSG; }, 1800);
  }
  function solve() {
    solved = true;
    clearTimeout(wrongT);
    vcard.classList.remove('is-wrong');
    vcard.classList.add('is-ok');
    vmsg.textContent = 'Дұрыс! 🎉';
    input.readOnly = true;
    input.blur();
    Sound.success();
    vibrate([30, 40, 30, 40, 80]);
    wait(700).then(function () { return go('reveal'); }).then(onReveal);
  }
  input.addEventListener('input', function () {
    if (solved) return;
    var v = norm(input.value);
    clearTimeout(wrongT);
    vcard.classList.remove('is-wrong');
    if (OK.indexOf(v) !== -1) return solve();
    vmsg.textContent = DEFAULT_MSG;
    if (v.length >= 4) wrongT = setTimeout(wrong, 500);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || solved) return;
    e.preventDefault();
    if (OK.indexOf(norm(input.value)) !== -1) solve(); else wrong();
  });

  /* ---------- 3. Шақыру ---------- */
  var soundBtn = $('#soundBtn');
  soundBtn.addEventListener('click', function () {
    var m = Sound.toggleMute();
    soundBtn.classList.toggle('is-muted', m);
    soundBtn.setAttribute('aria-label', m ? 'Дыбысты қосу' : 'Дыбысты өшіру');
  });

  function onReveal() {
    Sound.startMusic();
    soundBtn.hidden = false;
    screens.reveal.classList.add('is-shown');
    Confetti.burst({ x: 0.5, y: 0.62, count: reduce ? 40 : 160, spread: 85 });
    if (!reduce) {
      setTimeout(function () { Confetti.burst({ x: 0.08, y: 0.92, angle: 62, spread: 40, count: 55 }); }, 250);
      setTimeout(function () { Confetti.burst({ x: 0.92, y: 0.92, angle: 118, spread: 40, count: 55 }); }, 400);
    }
    startCountdown();
    observeBlocks();
  }

  // Кері санақ
  var target = new Date(C.start).getTime();
  var cells = {};
  Array.prototype.forEach.call(document.querySelectorAll('#cdGrid b'), function (b) { cells[b.dataset.u] = b; });
  var cdTimer = null;
  function setCell(u, v) {
    var el = cells[u], t = pad(v);
    if (el.textContent === t) return;
    el.textContent = t;
    if (!reduce) anim(el, [{ transform: 'translateY(-40%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out' });
  }
  function tickCountdown() {
    var now = Date.now(), d = target - now;
    if (d <= 0) {
      $('#cdGrid').hidden = true;
      var done = $('#cdDone');
      done.hidden = false;
      done.textContent = (now - target < 8 * 3600e3) ? 'Тимбилдинг басталды! 🎉' : 'Керемет өтті! Рақмет! 💚';
      document.querySelector('#countdown .label').textContent = 'SAPA TEAM';
      clearInterval(cdTimer);
      return;
    }
    var s = Math.floor(d / 1000);
    setCell('d', Math.floor(s / 86400));
    setCell('h', Math.floor((s % 86400) / 3600));
    setCell('m', Math.floor((s % 3600) / 60));
    setCell('s', s % 60);
  }
  function startCountdown() {
    if (cdTimer) return;
    tickCountdown();
    cdTimer = setInterval(tickCountdown, 1000);
  }

  // Блоктар айналдырғанда пайда болады
  function observeBlocks() {
    var blocks = document.querySelectorAll('#reveal .io');
    if (!('IntersectionObserver' in window) || reduce) {
      Array.prototype.forEach.call(blocks, function (b) { b.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      var k = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.setProperty('--dl', (k++ * 90 + (stage === 'reveal' && window.scrollY < 10 ? 500 : 0)) + 'ms');
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    Array.prototype.forEach.call(blocks, function (b) { io.observe(b); });
  }

  // Галерея
  var track = $('#galleryTrack'), gDots = $('#galleryDots'), gCount = $('#galleryCount');
  C.photos.forEach(function (p, i) {
    var fig = document.createElement('figure');
    fig.className = 'shot';
    var img = new Image();
    img.alt = p.caption;
    img.width = 464; img.height = 580;
    img.decoding = 'async';
    img.loading = i < 2 ? 'eager' : 'lazy';
    img.src = p.src;
    var cap = document.createElement('figcaption');
    cap.textContent = p.caption;
    fig.appendChild(img); fig.appendChild(cap);
    track.appendChild(fig);
    gDots.appendChild(document.createElement('i'));
  });
  var gTotal = C.photos.length, gRaf = 0;
  function updGallery() {
    gRaf = 0;
    var shots = track.children, mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = Infinity;
    for (var i = 0; i < shots.length; i++) {
      var c = shots[i].offsetLeft + shots[i].offsetWidth / 2, d = Math.abs(c - mid);
      if (d < bd) { bd = d; best = i; }
    }
    for (var j = 0; j < gDots.children.length; j++) gDots.children[j].classList.toggle('on', j === best);
    gCount.textContent = pad(best + 1) + ' / ' + pad(gTotal);
  }
  track.addEventListener('scroll', function () { if (!gRaf) gRaf = requestAnimationFrame(updGallery); }, { passive: true });
  updGallery();

  /* ---------- 4. Растау → Финал ---------- */
  var confirmBtn = $('#confirmBtn'), boom = $('#boom'), exploding = false;
  confirmBtn.addEventListener('click', function () {
    if (exploding) return;
    exploding = true;
    vibrate([20, 30, 70]);
    Sound.whoosh();
    var sec = screens.reveal;
    var r = confirmBtn.getBoundingClientRect(), sr = sec.getBoundingClientRect();
    sec.style.transformOrigin = (r.left + r.width / 2 - sr.left) + 'px ' + (r.top + r.height / 2 - sr.top) + 'px';
    var p1 = reduce
      ? anim(sec, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).finished
      : anim(sec, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(4)', opacity: 0 }],
          { duration: 800, easing: 'cubic-bezier(.6,0,.9,.4)', fill: 'forwards' }).finished;
    p1.catch(function () {}).then(function () {
      if (reduce) return;
      return anim(boom, [
        { opacity: 0, transform: 'translate(-50%,-50%) scale(.4)', filter: 'blur(0px)' },
        { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', filter: 'blur(0px)', offset: 0.3 },
        { opacity: 0, transform: 'translate(-50%,-50%) scale(14)', filter: 'blur(12px)' }
      ], { duration: 1300, easing: 'cubic-bezier(.5,0,.8,.3)' }).finished;
    }).catch(function () {}).then(function () {
      return go('final', { skipOut: true });
    }).then(function () {
      sec.style.transformOrigin = '';
      Confetti.burst({ x: 0.5, y: 0.5, count: reduce ? 40 : 140, spread: 120, velocity: 30 });
      if (!reduce) {
        setTimeout(function () { Confetti.burst({ x: 0.05, y: 0.95, angle: 60, spread: 35, count: 60 }); }, 300);
        setTimeout(function () { Confetti.burst({ x: 0.95, y: 0.95, angle: 120, spread: 35, count: 60 }); }, 450);
      }
    });
  });

  $('#backBtn').addEventListener('click', function () { window.location.reload(); });
})();
