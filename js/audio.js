/*
 * Дыбыс: фондық музыка (Web Audio арқылы — iOS-та да дыбыс деңгейі жұмыс істейді)
 * және синтезделген «дзынь» дыбыстары.
 * Музыка бірінші тапта үнсіз басталады (iOS үшін), кодтан кейін біртіндеп қатаяды.
 */
(function () {
  var cfg = window.INVITE.music;
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, musicGain = null, srcNode = null;
  var primed = false, musicOn = false, muted = false;

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
        musicGain.connect(master);
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

  window.Sound = {
    unlock: unlock, startMusic: startMusic, toggleMute: toggleMute,
    chime: chime, success: success, error: error, whoosh: whoosh,
    isMuted: function () { return muted; },
    _debug: function () { return { ctx: ctx && ctx.state, paused: el.paused, t: el.currentTime, gain: musicGain && musicGain.gain.value, webAudio: !!srcNode }; }
  };
})();
