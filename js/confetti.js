/* Конфетти-ромбики Сапа на canvas (без библиотек) */
(function () {
  var canvas = document.getElementById('confetti');
  var ctx = canvas.getContext('2d');
  var COLORS = ['#f2ab55', '#ffe2ae', '#c2414f', '#f5ebde', '#d2852f'];
  var W = 0, H = 0, parts = [], running = false, last = 0;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function burst(o) {
    o = o || {};
    var n = o.count || 150;
    var x = (o.x == null ? 0.5 : o.x) * W;
    var y = (o.y == null ? 0.6 : o.y) * H;
    var angle = (o.angle == null ? 90 : o.angle) * Math.PI / 180;
    var spread = (o.spread == null ? 70 : o.spread) * Math.PI / 180;
    var v0 = o.velocity || Math.max(26, Math.min(48, H * 0.05));
    var cols = o.colors || COLORS, sc = o.scale || 1;
    for (var i = 0; i < n; i++) {
      parts.push({
        x: x, y: y,
        a: angle + (Math.random() - 0.5) * spread,
        v: v0 * (0.5 + Math.random() * 0.65),
        size: (4.5 + Math.random() * 5.5) * sc,
        color: cols[(Math.random() * cols.length) | 0],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.25,
        tilt: Math.random() * Math.PI * 2,
        vt: 0.06 + Math.random() * 0.12,
        wob: Math.random() * 10,
        dot: o.dots || Math.random() < 0.28,
        life: 0,
        max: 220 + Math.random() * 120
      });
    }
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
  }

  function tick(t) {
    var dt = Math.min(2.5, (t - last) / 16.67); last = t;
    ctx.clearRect(0, 0, W, H);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.v *= Math.pow(0.92, dt);
      p.wob += 0.07 * dt;
      p.x += (Math.cos(p.a) * p.v + Math.sin(p.wob) * 0.9) * dt;
      p.y += (-Math.sin(p.a) * p.v + 2.4) * dt;
      p.rot += p.vr * dt; p.tilt += p.vt * dt; p.life += dt;
      if (p.life >= p.max || p.y > H + 30) { parts.splice(i, 1); continue; }
      var alpha = p.life > p.max - 50 ? Math.max(0, (p.max - p.life) / 50) : 1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.tilt));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.dot) {
        ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2);
      } else {
        var s = p.size;
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.68, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.68, 0);
        ctx.closePath();
      }
      ctx.fill();
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, W, H); }
  }

  window.Confetti = { burst: burst };
})();
