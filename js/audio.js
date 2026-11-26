/*
 * Дыбыс: фондық музыка (Web Audio арқылы — iOS-та да дыбыс деңгейі жұмыс істейді)
 * және синтезделген «дзынь» дыбыстары.
 * Музыка бірінші тапта үнсіз басталады (iOS үшін), кодтан кейін біртіндеп қатаяды.
 */
(function () {
  var cfg = window.INVITE.music;
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, musicGain = null, srcNode = null, analyser = null, freq = null;
  var primed = false, musicOn = false, muted = false;
  var lvl = { bass: 0, mid: 0, peak: 0.25 };

  var el = new Audio();
  el.src = cfg.src;
  el.loop = true;
  el.preload = 'auto';
  el.setAttribute('playsinline', '');

  function ensureCtx() {
    if (!AC) return null;
    if (!ctx) {
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.connect(ctx.destination);
        musicGain = ctx.createGain();
        musicGain.gain.value = 0;
        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;
        freq = new Uint8Array(analyser.frequencyBinCount);
        musicGain.connect(analyser);
        analyser.connect(master);
        srcNode = ctx.createMediaElementSource(el);
        srcNode.connect(musicGain);
      } catch (e) { srcNode = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Міндетті түрде пайдаланушы жесі ішінде шақырылады
  function unlock() {
    ensureCtx();
    if (!primed) {
      primed = true;
      if (!srcNode) el.volume = 0;
      var p = el.play();
      if (p && p.catch) p.catch(function () { primed = false; });
    }
  }

  function fadeTo(v, sec) {
    if (srcNode && musicGain) {
      var t = ctx.currentTime, g = musicGain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(v, t + sec);
    } else {
      var from = el.volume, t0 = performance.now();
      (function step() {
        var k = Math.min(1, (performance.now() - t0) / (sec * 1000));
        try { el.volume = from + (v - from) * k; } catch (e) {}
        if (k < 1) requestAnimationFrame(step);
      })();
    }
  }

  function startMusic() {
    ensureCtx();
    musicOn = true;
    try { el.currentTime = cfg.offset || 0; } catch (e) {}
    var p = el.play();
    if (p && p.catch) p.catch(function () {});
    fadeTo(muted ? 0 : cfg.volume, cfg.fadeIn || 3);
  }

  function toggleMute() {
    muted = !muted;
    if (musicOn) fadeTo(muted ? 0 : cfg.volume, 0.4);
    return muted;
  }

  document.addEventListener('visibilitychange', function () {
    if (!primed) return;
    if (document.hidden) {
      el.pause();
    } else {
      if (ctx && ctx.state === 'suspended') ctx.resume();
      var p = el.play();
      if (p && p.catch) p.catch(function () {});
    }
  });

  function tone(freq, o) {
    o = o || {};
    if (muted || !ensureCtx()) return;
    var t = ctx.currentTime + (o.delay || 0);
    var dur = o.dur || 0.5, vol = o.vol || 0.15;
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  var NOTES = [523.25, 659.25, 783.99, 1046.5];
  function chime(i) {
    var f = NOTES[i % NOTES.length];
    tone(f, { dur: 0.9, vol: 0.16 });
    tone(f * 2, { dur: 0.45, vol: 0.05 });
    tone(f * 3.01, { dur: 0.2, vol: 0.02 });
  }
  function success() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, k) {
      tone(f, { dur: 1.2, vol: 0.1, delay: k * 0.07 });
    });
  }
  function error() {
    tone(196, { type: 'triangle', dur: 0.22, vol: 0.12 });
    tone(174.6, { type: 'triangle', dur: 0.3, vol: 0.1, delay: 0.09 });
  }
  function whoosh() {
    if (muted || !ensureCtx()) return;
    var len = Math.floor(ctx.sampleRate * 1.1);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
    var g = ctx.createGain(), t = ctx.currentTime;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(3200, t + 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + 1.1);
  }

  // «Буль» — капля отрывается от сферы
  function bloop() {
    if (muted || !ensureCtx()) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(1100, t + 0.09);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.25);
  }

  // «Щёлк» рубильника перед тем, как загорится свет
  function switchOn() {
    if (muted || !ensureCtx()) return;
    var t = ctx.currentTime, len = Math.floor(ctx.sampleRate * 0.06);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    var g = ctx.createGain(); g.gain.value = 0.5;
    src.connect(lp); lp.connect(g); g.connect(master);
    src.start(t);
    tone(90, { dur: 0.18, vol: 0.18 });
  }

  function noiseBuffer(sec) {
    var len = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // Скрип пера: шум, громкость зависит от скорости росчерка
  var scr = null;
  function scratchStart() {
    if (muted || !ensureCtx() || scr) return;
    var src = ctx.createBufferSource(); src.buffer = noiseBuffer(1); src.loop = true;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.7;
    var g = ctx.createGain(); g.gain.value = 0;
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start();
    scr = { src: src, g: g, bp: bp };
  }
  function scratch(speed) {
    if (!scr) return;
    var t = ctx.currentTime;
    scr.g.gain.setTargetAtTime(Math.min(0.07, speed * 0.035), t, 0.02);
    scr.bp.frequency.setTargetAtTime(2600 + Math.min(2000, speed * 900), t, 0.03);
  }
  function scratchStop() {
    if (!scr) return;
    var s = scr; scr = null;
    s.g.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    setTimeout(function () { try { s.src.stop(); } catch (e) {} }, 200);
  }

  // Удар сургучной печати
  function thud() {
    if (muted || !ensureCtx()) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.32);
    var src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.08);
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    var g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.25, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    src.connect(lp); lp.connect(g2); g2.connect(master);
    src.start(t);
  }

  // Шорох фотографии, когда её смахивают
  function flick() {
    if (muted || !ensureCtx()) return;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.25);
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(1200, t);
    bp.frequency.exponentialRampToValueAtTime(4200, t + 0.2);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t);
  }

  // Уровень баса/середины 0…1 для огней в ритм (адаптивная нормализация)
  function level() {
    if (!analyser || !musicOn) return lvl;
    analyser.getByteFrequencyData(freq);
    var b = 0, m = 0, i;
    for (i = 1; i <= 6; i++) b += freq[i];
    for (i = 10; i <= 40; i++) m += freq[i];
    b /= 6 * 255; m /= 31 * 255;
    lvl.peak = Math.max(lvl.peak * 0.995, b, 0.2);
    lvl.bass = Math.max(0, Math.min(1, (b / lvl.peak - 0.55) / 0.45));
    lvl.mid = m;
    return lvl;
  }

  window.Sound = {
    unlock: unlock, startMusic: startMusic, toggleMute: toggleMute,
    chime: chime, success: success, error: error, whoosh: whoosh,
    bloop: bloop, switchOn: switchOn, level: level,
    scratchStart: scratchStart, scratch: scratch, scratchStop: scratchStop, thud: thud, flick: flick,
    isMuted: function () { return muted; },
    _debug: function () { return { ctx: ctx && ctx.state, paused: el.paused, t: el.currentTime, gain: musicGain && musicGain.gain.value, webAudio: !!srcNode }; }
  };
})();
