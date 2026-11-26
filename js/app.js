(function () {
  'use strict';
  var C = window.INVITE;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body, root = document.documentElement;
  var screens = { intro: $('#intro'), verify: $('#verify'), reveal: $('#reveal'), final: $('#final') };
  var stage = 'intro';
  var TOTAL = 4;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // Цвет панели браузера — под фон палитры
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var bgVar = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (themeMeta && bgVar) themeMeta.setAttribute('content', bgVar);

  function vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
  function pad(n) { return String(n).padStart(2, '0'); }
  function anim(el, frames, opts) {
    if (!el || !el.animate) return { finished: Promise.resolve(), cancel: function () {} };
    return el.animate(frames, opts);
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
  $('#trackName').textContent = C.music.title || '';
  var sd = new Date(C.start);
  var dShort = pad(sd.getDate()) + '.' + pad(sd.getMonth() + 1);
  $('#recDate').textContent = dShort;
  $('#recTime').textContent = C.time.big;
  // Билет: номер случайный для каждого гостя
  $('#tkNo').textContent = String(100 + Math.floor(Math.random() * 900));
  $('#tkDate').textContent = dShort;
  $('#tkDay').textContent = C.date.small;
  $('#tkTime').textContent = C.time.big;
  $('#tkTimeSmall').textContent = C.time.small;
  $('#tkPlace').textContent = C.place.big;
  $('#tkCity').textContent = C.place.small.split(',')[0];
  $$('#reveal .rv').forEach(function (el, i) { el.style.setProperty('--i', i); });

  /* ---------- Экран ауыстыру ---------- */
  function go(next, opts) {
    opts = opts || {};
    var from = screens[stage], to = screens[next];
    var out = (reduce || opts.skipOut)
      ? Promise.resolve()
      : anim(from, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.05)' }],
          { duration: 450, easing: 'ease-in', fill: 'forwards' }).finished.catch(function () {});
    return out.then(function () {
      from.classList.remove('is-active');
      if (from.getAnimations) from.getAnimations().forEach(function (a) { a.cancel(); });
      body.classList.remove('stage-' + stage);
      stage = next;
      body.classList.add('stage-' + next);
      to.classList.add('is-active');
      window.scrollTo(0, 0);
      if (!reduce && !opts.noEnter) {
        var frames = next === 'reveal'
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ opacity: 0, transform: 'translateY(18px) scale(.98)' }, { opacity: 1, transform: 'none' }];
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
  // Одна нить с провисом, лампы-овалы. Состояния: off (вход), dim (код), lit (приглашение)
  function buildGarland() {
    var W = window.innerWidth;
    if (W === garlandW) return;
    garlandW = W;
    var lit = garland.getAttribute('data-state') === 'lit';
    garland.innerHTML = '';
    garland.setAttribute('viewBox', '0 0 ' + W + ' 120');
    var x0 = -10, x2 = W + 10, x1 = W / 2, top = 4, sag = 100;
    mk('path', { d: 'M' + x0 + ' ' + top + ' Q' + x1 + ' ' + (top + sag) + ' ' + x2 + ' ' + top, 'class': 'wire' }, garland);
    var n = Math.max(14, Math.min(30, Math.round(19 * W / 390)));
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n, u = 1 - t;
      var x = u * u * x0 + 2 * u * t * x1 + t * t * x2;
      var y = u * u * top + 2 * u * t * (top + sag) + t * t * top;
      var g = mk('g', { 'class': 'bulb' + (lit ? ' on' : ''), 'data-x': x.toFixed(1) }, garland);
      var cy = y + 6.5;
      mk('ellipse', { cx: x, cy: cy, rx: 4, ry: 5.5, fill: 'url(#g-off)', 'class': 'glass' }, g);
      var light = mk('g', { 'class': 'light' }, g);
      var tw = mk('g', { 'class': 'tw' }, light);
      tw.style.setProperty('--dl', ((i * 0.37) % 2.4).toFixed(2) + 's');
      mk('circle', { cx: x, cy: cy, r: 30, fill: 'url(#g-halo)', 'class': 'halo' }, tw);
      mk('ellipse', { cx: x, cy: cy, rx: 4, ry: 5.5, fill: 'url(#g-on)' }, tw);
    }
  }
  function ignite() {
    garland.setAttribute('data-state', 'lit');
    var bulbs = $$('.bulb', garland).sort(function (a, b) { return a.getAttribute('data-x') - b.getAttribute('data-x'); });
    bulbs.forEach(function (b, i) {
      setTimeout(function () {
        b.classList.add('on');
        if (!reduce) anim(b.querySelector('.light'), [
          { opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0.25, offset: 0.4 }, { opacity: 1, offset: 0.6 }, { opacity: 1 }
        ], { duration: 420 });
      }, reduce ? 0 : 80 + i * 45);
    });
  }
  buildGarland();

  /* ---------- 1. Жидкая сфера ---------- */
  var orb = $('#orb'), wordSpans = $$('#word span'), smallSpans = $$('#wordSmall span');
  function smallRects() { return smallSpans.map(function (s) { return s.getBoundingClientRect(); }); }
  var liquidCanvas = $('#liquid'), liquid = null, liquidReady = false, pending = [];
  var taps = 0, formed = 0;

  function layoutLiquid() {
    if (!liquid || stage !== 'intro') return;
    liquid.layout(orb.getBoundingClientRect(), wordSpans.map(function (s) { return s.getBoundingClientRect(); }));
  }
  function initLiquid() {
    if (liquidReady) return;
    liquidReady = true;
    liquid = window.Liquid && window.Liquid.create(liquidCanvas, {
      letters: C.letters, family: 'Montserrat, sans-serif', reduce: reduce,
      onLetter: onLetterFormed
    });
    if (!liquid) {
      body.classList.add('no-gl');
      liquidCanvas.remove();
    } else {
      layoutLiquid();
    }
    pending.forEach(function (p) { doTap(p[0], p[1], p[2]); });
    pending = [];
  }
  var fontReady = document.fonts && document.fonts.load
    ? Promise.race([document.fonts.load('900 90px Montserrat', 'САПА'), wait(2500)])
    : Promise.resolve();
  fontReady.catch(function () {}).then(initLiquid);

  var rsT;
  window.addEventListener('resize', function () {
    clearTimeout(rsT);
    rsT = setTimeout(function () {
      buildGarland();
      if (liquid) {
        liquid.resize();
        if (stage === 'intro') layoutLiquid();
        else if (stage === 'verify') liquid.moveLetters(smallRects());
      }
    }, 120);
  });

  function onLetterFormed(i) {
    Sound.chime(i);
    vibrate(12);
    wordSpans[i].classList.add('on');
    smallSpans[i].textContent = C.letters[i];
    smallSpans[i].classList.add('on');
    formed++;
    if (formed === TOTAL) finishIntro();
  }
  function doTap(x, y, i) {
    if (liquid) {
      liquid.tap(x, y);
    } else {
      wordSpans[i].textContent = C.letters[i];
      anim(orb, [{ transform: 'scale(1)' }, { transform: 'scale(.88)' }, { transform: 'scale(1)' }], { duration: 380 });
      anim(wordSpans[i], [{ transform: 'translateY(-60px) scale(.3)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 600, easing: 'cubic-bezier(.3,1.5,.5,1)' });
      setTimeout(function () { onLetterFormed(i); }, 450);
    }
  }
  orb.addEventListener('click', function (e) {
    if (taps >= TOTAL) return;
    taps++;
    Sound.unlock();
    Sound.bloop();
    vibrate(18);
    var r = orb.getBoundingClientRect();
    var x = e.clientX || r.left + r.width / 2, y = e.clientY || r.top + r.height / 2;
    if (!liquidReady) { pending.push([x, y, taps - 1]); return; }
    doTap(x, y, taps - 1);
  });

  function finishIntro() {
    wait(450).then(function () {
      if (liquid) liquid.dissolve();
      return wait(liquid ? 750 : 300);
    }).then(function () {
      garland.setAttribute('data-state', 'dim');
      if (liquid) liquid.setAlpha(0.4);
      return go('verify');
    }).then(function () {
      if (liquid) liquid.moveLetters(smallRects());
      renderCells();
      try { input.focus({ preventScroll: true }); } catch (e) {}
    });
  }

  /* ---------- 2. Код ---------- */
  var input = $('#answer'), codeBox = $('#codeBox'), cells = $$('.cell', codeBox);
  var vcard = $('#verifyCard'), vmsg = $('#verifyMsg');
  var LAT = { S: 'С', A: 'А', P: 'П', C: 'С', E: 'Е', O: 'О', K: 'К', M: 'М', T: 'Т', H: 'Н', B: 'В', X: 'Х' };
  function norm(s) {
    return String(s).toUpperCase().replace(/\s+/g, '').replace(/[A-Z]/g, function (ch) { return LAT[ch] || ch; });
  }
  var OK = C.answers.map(norm);
  var solved = false, focused = false, prevLen = 0, msgT = null;

  function renderCells() {
    var v = input.value.toUpperCase();
    cells.forEach(function (c, i) {
      c.textContent = v[i] || '';
      c.classList.toggle('filled', !!v[i]);
      c.classList.toggle('active', focused && !solved && i === Math.min(v.length, TOTAL - 1) && v.length < TOTAL);
    });
  }
  input.addEventListener('focus', function () { focused = true; renderCells(); });
  input.addEventListener('blur', function () { focused = false; renderCells(); });
  input.addEventListener('input', function () {
    if (solved) return;
    var v = input.value.replace(/\s+/g, '').slice(0, TOTAL);
    if (v !== input.value) input.value = v;
    codeBox.classList.remove('is-wrong');
    renderCells();
    if (v.length > prevLen && cells[v.length - 1]) {
      anim(cells[v.length - 1], [{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
    }
    prevLen = v.length;
    if (v.length === TOTAL) {
      if (OK.indexOf(norm(v)) !== -1) solve(); else wrong();
    }
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); if (!solved && input.value.length) wrong(); }
  });

  function wrong() {
    codeBox.classList.add('is-wrong');
    vmsg.textContent = 'Қате, тағы байқап көр';
    vcard.classList.remove('shake'); void vcard.offsetWidth; vcard.classList.add('shake');
    Sound.error();
    vibrate([40, 60, 40]);
    setTimeout(function () {
      if (solved) return;
      input.value = ''; prevLen = 0;
      codeBox.classList.remove('is-wrong');
      renderCells();
    }, 750);
    clearTimeout(msgT);
    msgT = setTimeout(function () { if (!solved) vmsg.textContent = ''; }, 2200);
  }
  function solve() {
    solved = true;
    clearTimeout(msgT);
    vmsg.textContent = '';
    codeBox.classList.add('is-ok');
    input.readOnly = true;
    input.blur();
    renderCells();
    cells.forEach(function (c, i) {
      anim(c, [{ transform: 'scale(1)' }, { transform: 'scale(1.14)' }, { transform: 'scale(1)' }],
        { duration: 380, delay: i * 80, easing: 'ease-out' });
    });
    Sound.success();
    vibrate([30, 40, 30, 40, 80]);
    wait(850).then(startReveal);
  }

  /* ---------- 3. Джаз-клуб ашылады ---------- */
  var soundBtn = $('#soundBtn'), player = $('#player');
  var neon = $('#neon'), neonA = $('.neon-a'), neonB = $('.neon-b');
  var revealAt = 0;

  // Звук выключается пластинкой: маленькой в плеере или большой на финале
  var record = $('.record');
  function toggleSound() {
    var m = Sound.toggleMute();
    soundBtn.classList.toggle('is-muted', m);
    player.classList.toggle('is-muted', m);
    record.classList.toggle('is-muted', m);
    soundBtn.setAttribute('aria-label', m ? 'Дыбысты қосу' : 'Дыбысты өшіру');
    vibrate(10);
  }
  soundBtn.addEventListener('click', toggleSound);
  record.addEventListener('click', toggleSound);
  // Вывеска висит на двух верёвках. При прокрутке поднимается под гирлянду и уменьшается до таблички
  var hang = $('#hang'), edgeTop = $('#edgeTop');
  var ropeEls = { L: $('#ropeL'), L2: $('#ropeL2'), R: $('#ropeR'), R2: $('#ropeR2'), hL: $('#hookL'), hR: $('#hookR') };
  var hangOn = false, slot = null, slotTop = 0, signW = 0, safeT = 0, hRaf = 0;
  var SMALL_TOP = 48, S_MIN = 0.44;
  function measureHang() {
    if (!slot) return;
    slotTop = slot.getBoundingClientRect().top + window.scrollY;
    signW = neon.offsetWidth;
    safeT = parseFloat(getComputedStyle(edgeTop).paddingTop) || 0;
  }
  function rope(a, b, x1, y1, x2, y2) {
    var d = 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' L' + x2.toFixed(1) + ' ' + y2.toFixed(1);
    a.setAttribute('d', d); b.setAttribute('d', d);
  }
  function updHang() {
    hRaf = 0;
    if (!hangOn) return;
    var sy = Math.max(0, window.scrollY), small = SMALL_TOP + safeT;
    var range = Math.max(180, slotTop - small + 140);
    var p = Math.min(1, sy / range), e = 1 - (1 - p) * (1 - p);
    var y = slotTop + (small - slotTop) * e, s = 1 + (S_MIN - 1) * e;
    var cx = window.innerWidth / 2, ax = signW * s * 0.34, ay = y + 3 * s, spread = 8 + 16 * (1 - e);
    neon.style.transform = 'translate(-50%,' + y.toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
    rope(ropeEls.L, ropeEls.L2, cx - ax - spread, -6, cx - ax, ay);
    rope(ropeEls.R, ropeEls.R2, cx + ax + spread, -6, cx + ax, ay);
    ropeEls.hL.setAttribute('cx', (cx - ax).toFixed(1)); ropeEls.hL.setAttribute('cy', ay.toFixed(1));
    ropeEls.hR.setAttribute('cx', (cx + ax).toFixed(1)); ropeEls.hR.setAttribute('cy', ay.toFixed(1));
    root.style.setProperty('--edge-top', (0.6 + 0.4 * e).toFixed(3));
  }
  function mountHang() {
    if (hangOn) return;
    slot = document.createElement('div');
    slot.className = 'neon-slot';
    slot.style.height = neon.offsetHeight + 'px';
    neon.parentNode.insertBefore(slot, neon);
    measureHang();
    hang.appendChild(neon);
    if (!reduce) hang.classList.add('swing');
    hangOn = true;
    updHang();
  }
  function unmountHang() {
    if (!hangOn) return;
    anim(hang, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).finished.catch(function () {}).then(function () {
      hangOn = false;
      hang.hidden = true;
    });
  }
  window.addEventListener('resize', function () {
    if (!hangOn) return;
    measureHang();
    updHang();
  });

  // При прокрутке плашка с названием трека прячется, пластинка остаётся; вывеска едет вверх
  window.addEventListener('scroll', function () {
    player.classList.toggle('compact', window.scrollY > 60);
    if (hangOn && !hRaf) hRaf = requestAnimationFrame(updHang);
  }, { passive: true });

  function startReveal() {
    if (liquid) {
      liquid.setAlpha(0);
      setTimeout(function () { liquid.destroy(); liquid = null; liquidCanvas.remove(); }, 900);
    }
    go('reveal').then(function () {
      revealAt = Date.now();
      mountHang();
      screens.reveal.classList.add('is-shown');
      startCountdown();
      observeBlocks();
      wait(250).then(function () {
        Sound.switchOn();
        Sound.startMusic();
        startBeat();
        ignite();
      });
      wait(reduce ? 0 : 900).then(function () { body.classList.add('spots-on'); });
      wait(reduce ? 0 : 1350).then(function () { neon.classList.add('lit'); });
      wait(reduce ? 0 : 1750).then(function () { neonA.classList.add('lit'); });
      wait(reduce ? 0 : 2200).then(function () {
        neonB.classList.add('lit');
        if (!reduce) sparks(neonB);
      });
      wait(reduce ? 300 : 2500).then(startNotes);
      wait(reduce ? 300 : 2900).then(function () {
        player.hidden = false;
        anim(soundBtn, [{ transform: 'translateY(-24px) rotate(-120deg)', opacity: 0 }, { transform: 'none', opacity: 1 }],
          { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' });
        anim(player.querySelector('.now-playing'), [{ transform: 'translateX(14px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
          { duration: 600, delay: 250, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      });
    });
  }

  function sparks(el) {
    var r = el.getBoundingClientRect();
    Confetti.burst({
      x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height * 0.6) / window.innerHeight,
      count: 46, spread: 300, angle: 90, velocity: 17, scale: 0.45, dots: true,
      colors: Confetti.colors('--sparks') || undefined
    });
  }

  // Огни в ритм музыки
  var beatOn = false, beatVal = 0, lastBeatNote = 0;
  function startBeat() {
    if (beatOn || reduce) return;
    beatOn = true;
    (function tick() {
      var L = Sound.level();
      var t = L.bass;
      beatVal += (t - beatVal) * (t > beatVal ? 0.45 : 0.1);
      root.style.setProperty('--beat', beatVal.toFixed(3));
      if (t > 0.9 && Date.now() - lastBeatNote > 900) { lastBeatNote = Date.now(); spawnNote(); }
      requestAnimationFrame(tick);
    })();
  }

  // Ноты
  var notesEl = $('#notes');
  var NOTE_SVG = [
    '<svg viewBox="0 0 24 32" class="note"><ellipse cx="8" cy="25" rx="6" ry="4.5" transform="rotate(-20 8 25)"/><rect x="12.5" y="4" width="2" height="21"/><path d="M14.5 4c0 5 7 6 7 12-1.5-3-4-4-7-4z"/></svg>',
    '<svg viewBox="0 0 30 32" class="note"><ellipse cx="6" cy="26" rx="5" ry="4" transform="rotate(-20 6 26)"/><ellipse cx="22" cy="22" rx="5" ry="4" transform="rotate(-20 22 22)"/><rect x="10" y="6" width="2" height="20"/><rect x="26" y="2" width="2" height="20"/><path d="M10 6 28 2v5L10 11z"/></svg>',
    '<svg viewBox="0 0 24 32" class="note"><ellipse cx="9" cy="25" rx="6" ry="4.5" transform="rotate(-20 9 25)"/><rect x="13.5" y="3" width="2" height="22"/></svg>'
  ];
  function spawnNote() {
    if (document.hidden || notesEl.childElementCount > 8) return;
    var w = document.createElement('div');
    w.innerHTML = NOTE_SVG[(Math.random() * NOTE_SVG.length) | 0];
    var el = w.firstChild;
    var s = 0.7 + Math.random() * 0.7;
    el.style.width = (22 * s) + 'px'; el.style.height = (30 * s) + 'px';
    el.style.left = (6 + Math.random() * 86) + '%';
    notesEl.appendChild(el);
    var H = window.innerHeight + 80;
    var sw = (20 + Math.random() * 40) * (Math.random() < 0.5 ? -1 : 1), rot = Math.random() * 30 - 15;
    var a = anim(el, [
      { transform: 'translate(0,0) rotate(' + rot + 'deg)', opacity: 0 },
      { transform: 'translate(' + sw + 'px,' + (-H * 0.28) + 'px) rotate(' + (-rot) + 'deg)', opacity: 0.4, offset: 0.25 },
      { transform: 'translate(' + (-sw * 0.6) + 'px,' + (-H * 0.7) + 'px) rotate(' + rot + 'deg)', opacity: 0.3, offset: 0.7 },
      { transform: 'translate(' + (sw * 0.4) + 'px,' + (-H) + 'px) rotate(' + (-rot) + 'deg)', opacity: 0 }
    ], { duration: 10000 + Math.random() * 6000, easing: 'linear' });
    a.onfinish = function () { el.remove(); };
    if (!el.animate) el.remove();
  }
  var notesTimer = null;
  function startNotes() {
    if (notesTimer || reduce) return;
    spawnNote();
    notesTimer = setInterval(spawnNote, 1900);
  }

  // Кері санақ
  var target = new Date(C.start).getTime();
  var cdCells = {};
  $$('#cdGrid b').forEach(function (b) { cdCells[b.dataset.u] = b; });
  var cdTimer = null;
  function setCell(u, v) {
    var el = cdCells[u], t = pad(v);
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
      $('#countdown .label').textContent = 'САПА';
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
    var blocks = $$('#reveal .io');
    if (!('IntersectionObserver' in window) || reduce) {
      blocks.forEach(function (b) { b.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      var k = 0, base = Math.max(0, revealAt + 2800 - Date.now());
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.setProperty('--dl', (base + k++ * 90) + 'ms');
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    blocks.forEach(function (b) { io.observe(b); });
  }

  // Галерея: стопка полароидов. Смахни или тапни верхнее фото — оно уходит под низ стопки
  var stack = $('#stack'), gCount = $('#galleryCount'), gTotal = C.photos.length;
  var ROT = [-2.5, 5, -6, 3.5, -4, 6, -3, 4.5];
  var pols = C.photos.map(function (p, i) {
    var fig = document.createElement('figure');
    fig.className = 'pol';
    fig.style.setProperty('--tr', (i % 2 ? 4 : -3) + 'deg');
    var tape = document.createElement('i'); tape.className = 'pol-tape';
    var box = document.createElement('div'); box.className = 'pol-img';
    var img = new Image();
    img.alt = p.caption; img.width = 464; img.height = 580;
    img.decoding = 'async'; img.draggable = false;
    img.loading = i < 3 ? 'eager' : 'lazy';
    img.src = p.src;
    box.appendChild(img);
    var cap = document.createElement('figcaption'); cap.textContent = p.caption;
    fig.appendChild(tape); fig.appendChild(box); fig.appendChild(cap);
    stack.appendChild(fig);
    return fig;
  });
  var deck = pols.map(function (_, i) { return i; });
  function rankTf(i, r) {
    var rot = ROT[i % ROT.length];
    if (r === 0) return 'translate(0px,0px) rotate(' + (rot * 0.35) + 'deg) scale(1)';
    var k = Math.min(r, 3), side = r % 2 ? 1 : -1;
    return 'translate(' + (side * 7 * k) + 'px,' + (6 * k) + 'px) rotate(' + rot + 'deg) scale(' + (1 - 0.025 * k) + ')';
  }
  function layoutStack() {
    deck.forEach(function (i, r) {
      pols[i].style.zIndex = String(100 - r);
      pols[i].style.transform = rankTf(i, r);
    });
    gCount.textContent = pad(deck[0] + 1) + ' / ' + pad(gTotal);
  }
  layoutStack();

  var drag = null, flinging = false, touched = false;
  function nextCard(dir, fromT) {
    if (flinging) return;
    flinging = true; touched = true;
    var el = pols[deck[0]];
    Sound.flick();
    vibrate(8);
    var outT = 'translate(' + (dir * window.innerWidth * 0.95) + 'px,-30px) rotate(' + (dir * 24) + 'deg) scale(1)';
    el.classList.add('dragging');
    var a = anim(el, [{ transform: fromT || el.style.transform }, { transform: outT }],
      { duration: reduce ? 1 : 280, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' });
    a.finished.catch(function () {}).then(function () {
      deck.push(deck.shift());
      el.style.transform = outT;
      if (a.cancel) a.cancel();
      void el.offsetWidth;
      el.classList.remove('dragging');
      layoutStack();
      setTimeout(function () { flinging = false; }, 140);
    });
  }
  stack.addEventListener('pointerdown', function (e) {
    var top = pols[deck[0]];
    if (flinging || !top.contains(e.target)) return;
    var now = performance.now();
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: now, dx: 0, dy: 0, vx: 0, lx: e.clientX, lt: now, el: top, moved: false };
    try { top.setPointerCapture(e.pointerId); } catch (_) {}
  });
  stack.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var now = performance.now();
    drag.dx = e.clientX - drag.x0; drag.dy = e.clientY - drag.y0;
    drag.vx = (e.clientX - drag.lx) / Math.max(1, now - drag.lt);
    drag.lx = e.clientX; drag.lt = now;
    if (!drag.moved && Math.abs(drag.dx) > 6) { drag.moved = true; drag.el.classList.add('dragging'); }
    if (drag.moved) {
      var rot = ROT[deck[0] % ROT.length] * 0.35 + drag.dx * 0.06;
      drag.el.style.transform = 'translate(' + drag.dx + 'px,' + (drag.dy * 0.25) + 'px) rotate(' + rot + 'deg) scale(1)';
    }
  });
  function endDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    if (!cancelled && (Math.abs(d.dx) > 70 || Math.abs(d.vx) > 0.45)) {
      nextCard(d.dx >= 0 ? 1 : -1, d.el.style.transform);
    } else if (!cancelled && !d.moved && performance.now() - d.t0 < 400) {
      nextCard(-1);
    } else {
      d.el.classList.remove('dragging');
      layoutStack();
    }
  }
  stack.addEventListener('pointerup', function (e) { endDrag(e, false); });
  stack.addEventListener('pointercancel', function (e) { endDrag(e, true); });
  stack.addEventListener('keydown', function (e) {
    if (['ArrowRight', 'ArrowLeft', 'Enter', ' '].indexOf(e.key) === -1) return;
    e.preventDefault();
    nextCard(e.key === 'ArrowLeft' ? -1 : 1);
  });
  // Когда стопка впервые видна, верхнее фото слегка «качнётся» — понятно, что его можно смахнуть
  if ('IntersectionObserver' in window && !reduce) {
    var gio = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      gio.disconnect();
      setTimeout(function () {
        if (touched || flinging || drag) return;
        var el = pols[deck[0]], base = rankTf(deck[0], 0);
        anim(el, [
          { transform: base },
          { transform: 'translate(34px,-4px) rotate(5deg) scale(1)', offset: 0.4 },
          { transform: 'translate(-8px,0px) rotate(-1.5deg) scale(1)', offset: 0.75 },
          { transform: base }
        ], { duration: 1100, easing: 'ease-in-out' });
      }, 900);
    }, { threshold: 0.6 });
    gio.observe(stack);
  }

  /* ---------- 4. Билет: подпись пером → печать → финал ---------- */
  var confirmBtn = $('#confirmBtn'), signEl = $('#sign'), ticket = $('#ticket'), ticketWrap = $('#ticketWrap');
  var sigCanvas = $('#sigCanvas'), sctx = sigCanvas.getContext('2d'), quill = $('#quill');
  var signDone = $('#signDone'), signClear = $('#signClear'), seal = $('#tkSeal');
  var sig = { drawing: false, ink: 0, last: null, mid: null, w: 2.4, sized: false, sealed: false };

  function setPy() { ticket.style.setProperty('--py', $('#tkMain').offsetHeight + 'px'); }
  function sizeSig() {
    var r = sigCanvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    sigCanvas.width = Math.round(r.width * dpr); sigCanvas.height = Math.round(r.height * dpr);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.lineCap = 'round'; sctx.lineJoin = 'round';
    sctx.strokeStyle = '#2a1209'; sctx.fillStyle = '#2a1209';
  }
  function placeQuill(x, y) { quill.style.transform = 'translate(' + (x - 6) + 'px,' + (y - 60) + 'px)'; }
  function idleQuill() {
    var r = sigCanvas.getBoundingClientRect();
    placeQuill(r.left + r.width * 0.2, r.bottom - 30);
    quill.classList.add('show', 'idle');
  }
  function openSign() {
    if (sig.sealed) return;
    body.classList.add('no-scroll');
    signEl.hidden = false;
    setPy();
    if (!sig.sized) { sizeSig(); sig.sized = true; }
    Sound.flick();
    anim(signEl, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    anim(ticketWrap, [
      { transform: 'translateY(70vh) rotate(-8deg)' },
      { transform: 'translateY(-10px) rotate(1.5deg)', offset: 0.75 },
      { transform: 'none' }
    ], { duration: reduce ? 1 : 700, easing: 'cubic-bezier(.2,.8,.2,1)' }).finished.catch(function () {}).then(function () {
      if (!sig.sealed && !signEl.hidden && !sig.ink) idleQuill();
    });
  }
  function closeSign() {
    quill.classList.remove('show', 'idle');
    anim(signEl, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 }).finished.catch(function () {}).then(function () {
      signEl.hidden = true;
      body.classList.remove('no-scroll');
    });
  }
  confirmBtn.addEventListener('click', function () { vibrate(15); openSign(); });
  $('#signClose').addEventListener('click', closeSign);

  function sigPt(ev) {
    var r = sigCanvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top, t: ev.timeStamp || performance.now() };
  }
  sigCanvas.addEventListener('pointerdown', function (e) {
    if (sig.sealed) return;
    e.preventDefault();
    try { sigCanvas.setPointerCapture(e.pointerId); } catch (_) {}
    sig.drawing = true;
    var p = sigPt(e);
    sig.last = p; sig.mid = p; sig.w = 2.6;
    sctx.beginPath(); sctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2); sctx.fill();
    quill.classList.remove('idle'); quill.classList.add('show');
    placeQuill(e.clientX, e.clientY);
    Sound.scratchStart();
  });
  sigCanvas.addEventListener('pointermove', function (e) {
    if (!sig.drawing) return;
    var evs = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
    if (!evs.length) evs = [e];
    var speed = 0;
    evs.forEach(function (ev) {
      var p = sigPt(ev), l = sig.last;
      var dist = Math.hypot(p.x - l.x, p.y - l.y);
      if (dist < 0.8) return;
      var v = dist / Math.max(1, p.t - l.t);
      speed = v;
      var w = Math.max(1.1, Math.min(3.4, 3.6 - v * 1.4));
      sig.w = sig.w * 0.65 + w * 0.35;
      var mid = { x: (l.x + p.x) / 2, y: (l.y + p.y) / 2 };
      sctx.lineWidth = sig.w;
      sctx.beginPath(); sctx.moveTo(sig.mid.x, sig.mid.y); sctx.quadraticCurveTo(l.x, l.y, mid.x, mid.y); sctx.stroke();
      sig.mid = mid; sig.last = p; sig.ink += dist;
    });
    placeQuill(e.clientX, e.clientY);
    Sound.scratch(speed);
    if (sig.ink > 90) signDone.disabled = false;
  });
  function endStroke() {
    if (!sig.drawing) return;
    sig.drawing = false;
    Sound.scratchStop();
  }
  sigCanvas.addEventListener('pointerup', endStroke);
  sigCanvas.addEventListener('pointercancel', endStroke);
  signClear.addEventListener('click', function () {
    if (sig.sealed) return;
    sctx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    sig.ink = 0; signDone.disabled = true;
    idleQuill();
  });

  signDone.addEventListener('click', function () {
    if (sig.sealed || signDone.disabled) return;
    sig.sealed = true;
    signDone.disabled = true; signClear.disabled = true;
    ticket.classList.add('signed');
    quill.classList.remove('idle');
    anim(quill, [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '50px -70px' }], { duration: 380, fill: 'forwards' });
    seal.classList.add('on');
    seal.querySelector('span').textContent = 'САПА';
    anim(seal, [
      { transform: 'scale(2.6) rotate(-32deg)', opacity: 0, easing: 'cubic-bezier(.55,0,.9,.4)' },
      { transform: 'scale(.9) rotate(-8deg)', opacity: 1, offset: 0.62, easing: 'ease-out' },
      { transform: 'scale(1.05) rotate(-8deg)', offset: 0.82 },
      { transform: 'scale(1) rotate(-8deg)', opacity: 1 }
    ], { duration: reduce ? 1 : 580 });
    setTimeout(function () {
      Sound.thud();
      vibrate([30, 20, 70]);
      anim(ticketWrap, [{ transform: 'none' }, { transform: 'translateY(4px) scale(.994)' }, { transform: 'none' }], { duration: 220 });
      var r = seal.getBoundingClientRect();
      Confetti.burst({
        x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight,
        count: 16, spread: 360, angle: 90, velocity: 9, scale: 0.4, dots: true,
        colors: Confetti.colors('--seal-parts') || undefined
      });
    }, reduce ? 0 : 360);
    setTimeout(toFinal, reduce ? 400 : 1400);
  });

  // Подписанный билет переезжает на финальный экран
  function toFinal() {
    var first = ticketWrap.getBoundingClientRect();
    quill.classList.remove('show');
    unmountHang();
    $$('.sign-title, .sign-actions, .sign-close').forEach(function (el) {
      anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
    });
    go('final', { skipOut: true, noEnter: true }).then(function () {
      $('#finalTicket').appendChild(ticketWrap);
      setPy();
      var last = ticketWrap.getBoundingClientRect();
      anim(ticketWrap, [
        { transform: 'translate(' + (first.left - last.left) + 'px,' + (first.top - last.top) + 'px)' },
        { transform: 'none' }
      ], { duration: reduce ? 1 : 750, easing: 'cubic-bezier(.2,.8,.2,1)' });
      anim(signEl, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }).finished.catch(function () {}).then(function () {
        signEl.hidden = true;
        body.classList.remove('no-scroll');
      });
      $$('#final .record, #final .final-title, #final .final-map, #final .link-back').forEach(function (el, i) {
        anim(el, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
          { duration: 600, delay: 150 + i * 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      });
      Confetti.burst({ x: 0.5, y: 0.35, count: reduce ? 40 : 130, spread: 120, velocity: 30 });
      if (!reduce) {
        setTimeout(function () { Confetti.burst({ x: 0.05, y: 0.95, angle: 60, spread: 35, count: 60 }); }, 300);
        setTimeout(function () { Confetti.burst({ x: 0.95, y: 0.95, angle: 120, spread: 35, count: 60 }); }, 450);
      }
    });
  }

  $('#backBtn').addEventListener('click', function () { window.location.reload(); });
})();
