/*
 * Жидкая сфера (WebGL, метаболы), палитра «Виски».
 * Сфера = главный шар + 5 «спутников», которые пружинят и создают живую поверхность.
 * Тап: сфера вздрагивает, отрывается капля, летит к своему месту и перетекает в букву
 * (поле капли сливается с размытым полем буквы из атласа).
 * Под сферой: дышащее янтарное свечение, тень и отблеск на «полу».
 * Без WebGL возвращает null — тогда app.js включает упрощённый CSS-вариант.
 */
(function () {
  'use strict';

  var MAX_BALLS = 16;
  var SATS = 5, SAT_Q = 0.58, SAT_OFF = 0.34;
  var VIS = Math.sqrt(1 + SATS * SAT_Q * SAT_Q);   // видимый радиус / радиус главного шара
  var GLYPH = 104, CELL = 128;                       // кегль буквы в ячейке атласа

  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes;',
    'uniform float uDpr;',
    'uniform float uTime;',
    'uniform vec4 uBalls[16];',
    'uniform int uCount;',
    'uniform sampler2D uAtlas;',
    'uniform vec4 uRects[4];',
    'uniform float uW[4];',
    'uniform float uR;',
    'uniform float uAlpha;',
    'uniform vec4 uGlow;',      // x, y, радиус, альфа
    'uniform vec4 uShadow;',    // x, y, полуширина, полувысота
    'uniform vec2 uShadowA;',   // альфа тени, альфа отблеска
    'uniform vec3 uSph;',       // центр и видимый радиус сферы: внутри — гладкие сферические нормали
    'vec3 amberRamp(float k) {',
    '  vec3 c0 = vec3(1.000, 0.816, 0.525);',
    '  vec3 c1 = vec3(0.941, 0.627, 0.275);',
    '  vec3 c2 = vec3(0.710, 0.369, 0.118);',
    '  vec3 c3 = vec3(0.345, 0.129, 0.043);',
    '  vec3 c4 = vec3(0.161, 0.051, 0.020);',
    '  if (k < 0.30) return mix(c0, c1, k / 0.30);',
    '  if (k < 0.58) return mix(c1, c2, (k - 0.30) / 0.28);',
    '  if (k < 0.86) return mix(c2, c3, (k - 0.58) / 0.28);',
    '  return mix(c3, c4, clamp((k - 0.86) / 0.14, 0.0, 1.0));',
    '}',
    'vec3 letterRamp(float y) {',
    '  vec3 a = vec3(1.000, 0.949, 0.839);',
    '  vec3 b = vec3(0.949, 0.671, 0.333);',
    '  vec3 c = vec3(0.710, 0.369, 0.118);',
    '  vec3 d = vec3(0.345, 0.129, 0.043);',
    '  if (y < 0.40) return mix(a, b, y / 0.40);',
    '  if (y < 0.75) return mix(b, c, (y - 0.40) / 0.35);',
    '  return mix(c, d, clamp((y - 0.75) / 0.25, 0.0, 1.0));',
    '}',
    'float dotLamp(vec2 nxy, vec2 c, float r) {',
    '  return 1.0 - smoothstep(r * 0.55, r, length(nxy - c));',
    '}',
    'void main(){',
    '  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;',
    '  vec3 amber = vec3(0.941, 0.588, 0.235);',
    // слой под жидкостью: свечение, тень, отблеск
    '  float ga = uGlow.w * clamp(1.0 - length(p - uGlow.xy) / uGlow.z, 0.0, 1.0);',
    '  vec4 under = vec4(amber * ga, ga);',
    '  float sr = length((p - uShadow.xy) / uShadow.zw);',
    '  float sa = uShadowA.x * 0.65 * clamp(1.0 - sr, 0.0, 1.0);',
    '  under = under * (1.0 - sa) + vec4(0.0, 0.0, 0.0, sa);',
    '  float rr = length((p - uShadow.xy) / (uShadow.zw * vec2(0.7, 0.69)));',
    '  float ra = uShadowA.y * 0.35 * clamp(1.0 - rr, 0.0, 1.0);',
    '  under = under * (1.0 - ra) + vec4(vec3(0.949, 0.671, 0.333) * ra, ra);',
    // поле метаболов и букв
    '  float f = 0.0; vec2 g = vec2(0.0);',
    '  for (int i = 0; i < 16; i++) {',
    '    if (i >= uCount) break;',
    '    vec4 b = uBalls[i];',
    '    vec2 d = p - b.xy;',
    '    float d2 = dot(d, d) + 0.5;',
    '    float v = b.z * b.z / d2;',
    '    f += v;',
    '    g += -2.0 * v / d2 * d;',
    '  }',
    '  float lf = 0.0, ly = 0.0;',
    '  for (int i = 0; i < 4; i++) {',
    '    float w = uW[i];',
    '    if (w < 0.002) continue;',
    '    vec4 R = uRects[i];',
    '    vec2 uv = (p - R.xy) / R.zw;',
    '    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) continue;',
    '    uv.x += sin(uTime * 2.1 + uv.y * 8.0 + float(i) * 1.7) * 0.006;',
    '    uv.y += cos(uTime * 1.7 + uv.x * 7.0 + float(i)) * 0.005;',
    '    vec2 au = vec2((float(i) + uv.x) * 0.25, uv.y);',
    '    float h = 1.0 / 128.0;',
    '    float c  = texture2D(uAtlas, au).r;',
    '    float x1 = texture2D(uAtlas, au + vec2(h * 0.25, 0.0)).r;',
    '    float x0 = texture2D(uAtlas, au - vec2(h * 0.25, 0.0)).r;',
    '    float y1 = texture2D(uAtlas, au + vec2(0.0, h)).r;',
    '    float y0 = texture2D(uAtlas, au - vec2(0.0, h)).r;',
    '    float k = 2.1 * w;',
    '    f += c * k;',
    '    lf += c * k; ly += c * k * uv.y;',
    '    g += vec2((x1 - x0) / (2.0 * h * R.z), (y1 - y0) / (2.0 * h * R.w)) * k;',
    '  }',
    '  vec4 liq = vec4(0.0);',
    '  if (f > 0.2) {',
    '    float aa = max(length(g), 0.0001) * 1.1;',
    '    float alpha = smoothstep(1.0 - aa, 1.0 + aa, f);',
    '    float fi = max(f, 1.0005);',
    '    float hgt = sqrt(1.0 - 1.0 / fi);',
    '    vec2 gh = g / (2.0 * hgt * fi * fi + 0.0001);',
    '    vec3 n = normalize(vec3(-gh * uR, 1.0));',
    '    if (uSph.z > 2.0) {',
    '      vec2 q = (p - uSph.xy) / uSph.z;',
    '      float qq = dot(q, q);',
    '      if (qq < 1.0) {',
    '        float ws = 1.0 - smoothstep(0.55, 0.92, sqrt(qq));',
    '        n = normalize(mix(n, vec3(q, sqrt(1.0 - qq)), ws));',
    '      }',
    '    }',
    '    vec3 L = normalize(vec3(-0.5, -0.62, 0.6));',
    '    vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));',
    '    float dl = clamp(dot(n, L), 0.0, 1.0);',
    '    vec3 col = amberRamp(1.0 - dl);',
    // буквы: вертикальный градиент как в макете, поверх — свет и фаска
    '    float wl = clamp(lf / f, 0.0, 1.0);',
    '    if (wl > 0.01) {',
    '      float gy = clamp((ly / max(lf, 0.0001) - 0.215) / 0.57, 0.0, 1.0);',
    '      col = mix(col, letterRamp(gy) * (0.72 + 0.4 * dl), wl * 0.85);',
    '    }',
    '    float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 1.3);',
    '    vec2 nd = normalize(n.xy + 0.0001);',
    '    col += vec3(1.0, 0.745, 0.431) * 0.28 * max(nd.y, 0.0) * rim;',            // нижний внутренний отсвет
    '    col += vec3(1.0) * 0.16 * max(dot(nd, vec2(-0.6, -0.8)), 0.0) * rim;',     // светлая кромка слева сверху
    '    vec2 hb = vec2(n.x / 0.56, (n.y + 0.6) / 0.22);',
    '    float band = (1.0 - smoothstep(0.7, 1.0, dot(hb, hb))) * clamp((-n.y - 0.38) / 0.44, 0.0, 1.0);',
    '    col = mix(col, vec3(1.0, 0.98, 0.92), band * 0.38);',                       // мягкий верхний блик
    '    float lamps = dotLamp(n.xy, vec2(0.12, -0.66), 0.032)',
    '      + 0.85 * dotLamp(n.xy, vec2(0.26, -0.60), 0.027)',
    '      + 0.65 * dotLamp(n.xy, vec2(0.40, -0.50), 0.022)',
    '      + 0.45 * dotLamp(n.xy, vec2(0.52, -0.38), 0.017);',
    '    lamps += 0.35 * (1.0 - smoothstep(0.0, 0.07, length(n.xy - vec2(0.12, -0.66))));',
    '    col = mix(col, vec3(1.0, 0.98, 0.94), clamp(lamps, 0.0, 1.0));',            // отражения ламп
    '    float spec = pow(max(dot(n, H), 0.0), 160.0);',
    '    col = mix(col, vec3(1.0, 0.949, 0.839), clamp(spec * 1.3, 0.0, 1.0));',      // горячая точка
    '    float a = alpha * uAlpha;',
    '    float halo = smoothstep(0.25, 1.0, f) * (1.0 - alpha);',
    '    float ha = halo * halo * 0.22 * uAlpha;',
    '    liq = vec4(col * a + amber * ha * (1.0 - a), a + ha * (1.0 - a));',
    '  }',
    '  gl_FragColor = liq + under * (1.0 - liq.a);',
    '}'
  ].join('\n');

  function boxBlur(src, w, h, r) {
    var tmp = new Float32Array(w * h), out = new Float32Array(w * h), d = 2 * r + 1, x, y, acc, row;
    for (y = 0; y < h; y++) {
      row = y * w; acc = 0;
      for (x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
      for (x = 0; x < w; x++) {
        tmp[row + x] = acc / d;
        acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
      }
    }
    for (x = 0; x < w; x++) {
      acc = 0;
      for (y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (y = 0; y < h; y++) {
        out[y * w + x] = acc / d;
        acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    return out;
  }

  function makeAtlas(letters, family) {
    var W = CELL * 4, H = CELL;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.font = '900 ' + GLYPH + 'px ' + family;
    for (var i = 0; i < 4; i++) {
      var L = letters[i] || '';
      var m = x.measureText(L);
      var asc = m.actualBoundingBoxAscent || 73, desc = m.actualBoundingBoxDescent || 0;
      var left = m.actualBoundingBoxLeft || 0, right = m.actualBoundingBoxRight || 0;
      x.fillText(L, i * CELL + CELL / 2 + (left - right) / 2, CELL / 2 + (asc - desc) / 2);
    }
    var img = x.getImageData(0, 0, W, H), d = img.data, ch = new Float32Array(W * H), k;
    for (k = 0; k < W * H; k++) ch[k] = d[k * 4] / 255;
    var b = boxBlur(boxBlur(boxBlur(ch, W, H, 4), W, H, 4), W, H, 4);
    for (k = 0; k < W * H; k++) {
      var v = Math.round(Math.min(1, b[k]) * 255);
      d[k * 4] = d[k * 4 + 1] = d[k * 4 + 2] = v; d[k * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }

  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function create(canvas, opts) {
    var gl = null;
    try {
      var ca = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' };
      gl = canvas.getContext('webgl', ca) || canvas.getContext('experimental-webgl', ca);
    } catch (e) { gl = null; }
    if (!gl) return null;

    var vs = compile(gl, gl.VERTEX_SHADER, VERT), fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aLoc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ['uRes', 'uDpr', 'uTime', 'uBalls', 'uCount', 'uAtlas', 'uRects', 'uW', 'uR', 'uAlpha', 'uGlow', 'uShadow', 'uShadowA', 'uSph'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n) || gl.getUniformLocation(prog, n + '[0]');
    });

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, makeAtlas(opts.letters, opts.family));
    gl.uniform1i(U.uAtlas, 0);

    var reduce = !!opts.reduce;
    var S = {
      cx: 0, cy: 0, Rv: 100, Rm0: 1, Rm: 0, RmT: 0, next: 0, alpha: 0, alphaT: 1,
      main: { x: 0, y: 0, vx: 0, vy: 0 },
      sats: [], drops: [],
      letters: [0, 1, 2, 3].map(function () {
        return { x: 0, y: 0, w: 1, h: 1, tx: 0, ty: 0, tw: 1, th: 1, wt: 0, v: 0, target: 0 };
      }),
      t: 0, idle: 0
    };
    for (var s = 0; s < SATS; s++) S.sats.push({ x: 0, y: 0, vx: 0, vy: 0 });

    var dpr = 1, running = true, raf = 0, last = performance.now(), placed = false;
    var balls = new Float32Array(MAX_BALLS * 4), rects = new Float32Array(16), ws = new Float32Array(4);

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();

    function cellFor(r) {
      var size = r.height * CELL / GLYPH;
      return { x: r.left + r.width / 2 - size / 2, y: r.top + r.height / 2 - size / 2, w: size, h: size };
    }

    // Позиции берутся из DOM-якорей: кнопка-сфера и 4 слота для букв (высота слота = кегль буквы)
    function layout(orbRect, slotRects) {
      var first = !placed;
      S.cx = orbRect.left + orbRect.width / 2;
      S.cy = orbRect.top + orbRect.height / 2;
      S.Rv = Math.min(orbRect.width, orbRect.height) * 0.4375;
      S.Rm0 = S.Rv / VIS;
      if (first) {
        S.Rm = S.Rm0 * 0.2; S.RmT = S.Rm0;
        S.main.x = S.cx; S.main.y = S.cy;
        S.sats.forEach(function (p) { p.x = S.cx; p.y = S.cy; });
      } else if (S.RmT > 0) {
        S.RmT = S.Rm0 * (1 - 0.13 * S.next);
      }
      slotRects.forEach(function (r, i) {
        var c = cellFor(r), L = S.letters[i];
        L.x = L.tx = c.x; L.y = L.ty = c.y; L.w = L.tw = c.w; L.h = L.th = c.h;
      });
      placed = true;
    }

    // Плавно переносит готовые буквы в новые слоты (экран кода)
    function moveLetters(slotRects) {
      slotRects.forEach(function (r, i) {
        var c = cellFor(r), L = S.letters[i];
        L.tx = c.x; L.ty = c.y; L.tw = c.w; L.th = c.h;
      });
    }

    function tap(px, py) {
      if (S.next >= 4 || S.Rm < 2) return -1;
      var i = S.next++;
      var L = S.letters[i];
      var dx = S.cx - px, dy = S.cy - py, dl = Math.hypot(dx, dy);
      if (dl < 4) { var a0 = Math.random() * Math.PI * 2; dx = Math.cos(a0); dy = Math.sin(a0); dl = 1; }
      dx /= dl; dy /= dl;
      var kick = S.Rv * 2.6;
      S.sats.forEach(function (p, k) {
        var sw = (k % 2 ? 1 : -1) * 0.6;
        p.vx += (dx + -dy * sw + (Math.random() - 0.5) * 0.8) * kick;
        p.vy += (dy + dx * sw + (Math.random() - 0.5) * 0.8) * kick;
      });
      S.main.vx += dx * kick * 0.35; S.main.vy += dy * kick * 0.35;
      var tx = L.tx + L.tw / 2, ty = L.ty + L.th / 2;
      var ang = Math.atan2(ty - S.cy, tx - S.cx);
      S.drops.push({
        i: i, t: 0, dur: 0.78, m: 0, phase: 'fly',
        sx: S.cx + Math.cos(ang) * S.Rm * 0.35, sy: S.cy + Math.sin(ang) * S.Rm * 0.35,
        tx: tx, ty: ty,
        r0: S.Rm * 0.62, x: S.cx, y: S.cy, r: 0, tailX: S.cx, tailY: S.cy
      });
      S.RmT = S.Rm0 * (1 - 0.13 * S.next);
      return i;
    }

    function dropPos(d, t) {
      var e = easeInOut(Math.min(1, Math.max(0, t)));
      var cx = d.sx + (d.tx - d.sx) * 0.25, cy = d.sy + (d.ty - d.sy) * 0.95;
      var u = 1 - e;
      return [u * u * d.sx + 2 * u * e * cx + e * e * d.tx, u * u * d.sy + 2 * u * e * cy + e * e * d.ty];
    }

    function step(dt) {
      S.t += dt;
      S.alpha += (S.alphaT - S.alpha) * Math.min(1, dt * 3);
      S.Rm += (S.RmT - S.Rm) * Math.min(1, dt * (S.RmT > S.Rm ? 2.2 : 3.2));
      var t = S.t, wob = reduce ? 0.4 : 1;

      // «Сердцебиение», пока никто не тапнул: зовёт нажать
      if (S.next === 0 && !reduce) {
        S.idle += dt;
        if (S.idle > 2.6) {
          S.idle = 0;
          S.sats.forEach(function (p, k) {
            var a = k * 2 * Math.PI / SATS;
            p.vx += Math.cos(a) * S.Rv * 0.9; p.vy += Math.sin(a) * S.Rv * 0.9;
          });
        }
      }

      var K = 95, C = 8.5;
      var mx = S.cx + Math.sin(t * 0.9) * S.Rm * 0.05 * wob, my = S.cy + Math.cos(t * 1.1) * S.Rm * 0.05 * wob;
      S.main.vx += (-K * (S.main.x - mx) - C * S.main.vx) * dt;
      S.main.vy += (-K * (S.main.y - my) - C * S.main.vy) * dt;
      S.main.x += S.main.vx * dt; S.main.y += S.main.vy * dt;

      S.sats.forEach(function (p, k) {
        var a = k * 2 * Math.PI / SATS + t * 0.55;
        var o = S.Rm * SAT_OFF * (1 + 0.14 * wob * Math.sin(t * 1.35 + k * 1.9));
        var rx = S.main.x + Math.cos(a) * o, ry = S.main.y + Math.sin(a) * o;
        p.vx += (-K * (p.x - rx) - C * p.vx) * dt;
        p.vy += (-K * (p.y - ry) - C * p.vy) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
      });

      for (var j = S.drops.length - 1; j >= 0; j--) {
        var d = S.drops[j];
        if (d.phase === 'fly') {
          d.t += dt / d.dur;
          var pos = dropPos(d, d.t), tail = dropPos(d, d.t - 0.09);
          d.x = pos[0]; d.y = pos[1]; d.tailX = tail[0]; d.tailY = tail[1];
          d.r = d.r0 * (1 - 0.2 * Math.sin(Math.PI * Math.min(1, d.t)));
          if (d.t >= 1) {
            d.phase = 'morph'; d.x = d.tx; d.y = d.ty; d.tailX = d.tx; d.tailY = d.ty;
            var L = S.letters[d.i];
            L.target = 1; L.v += 7;
            if (opts.onLetter) opts.onLetter(d.i);
          }
        } else {
          d.m += dt / 0.4;
          d.r = d.r0 * 0.8 * Math.max(0, 1 - d.m);
          if (d.m >= 1) S.drops.splice(j, 1);
        }
      }

      var lk = Math.min(1, dt * 4.5);
      S.letters.forEach(function (L) {
        L.v += (-120 * (L.wt - L.target) - 10 * L.v) * dt;
        L.wt += L.v * dt;
        if (L.wt < 0) { L.wt = 0; L.v = 0; }
        L.x += (L.tx - L.x) * lk; L.y += (L.ty - L.y) * lk;
        L.w += (L.tw - L.w) * lk; L.h += (L.th - L.h) * lk;
      });
    }

    function draw() {
      var n = 0;
      function push(x, y, r) {
        if (r < 0.5 || n >= MAX_BALLS) return;
        balls[n * 4] = x; balls[n * 4 + 1] = y; balls[n * 4 + 2] = r; balls[n * 4 + 3] = 0; n++;
      }
      push(S.main.x, S.main.y, S.Rm);
      S.sats.forEach(function (p) { push(p.x, p.y, S.Rm * SAT_Q); });
      S.drops.forEach(function (d) {
        push(d.x, d.y, d.r);
        if (d.phase === 'fly') push(d.tailX, d.tailY, d.r * 0.62);
      });
      for (var i = 0; i < 4; i++) {
        var L = S.letters[i];
        rects[i * 4] = L.x; rects[i * 4 + 1] = L.y; rects[i * 4 + 2] = L.w; rects[i * 4 + 3] = L.h;
        ws[i] = Math.max(0, L.wt);
      }
      var ga = Math.max(0, Math.min(1, S.alpha));
      var pres = Math.max(0, Math.min(1, S.Rm / S.Rm0));
      var vis = S.Rm * VIS, t = S.t;
      var br = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 4);
      var sh = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 3.6);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uDpr, dpr);
      gl.uniform1f(U.uTime, t);
      gl.uniform4fv(U.uBalls, balls);
      gl.uniform1i(U.uCount, n);
      gl.uniform4fv(U.uRects, rects);
      gl.uniform1fv(U.uW, ws);
      gl.uniform1f(U.uR, Math.max(30, S.Rv));
      gl.uniform1f(U.uAlpha, ga);
      gl.uniform4f(U.uGlow, S.cx, S.cy, S.Rv * 1.59, 0.26 * (0.5 + 0.35 * br) * pres * ga);
      gl.uniform4f(U.uShadow, S.cx, S.cy + vis + 4 + 13, vis * 0.95 * (1 + 0.06 * sh), 13 * (0.6 + 0.4 * pres));
      gl.uniform2f(U.uShadowA, (0.7 - 0.15 * sh) * pres * ga, pres * ga);
      var q2 = SAT_Q * SAT_Q, sx = S.main.x, sy = S.main.y;
      S.sats.forEach(function (p) { sx += p.x * q2; sy += p.y * q2; });
      gl.uniform3f(U.uSph, sx / (1 + SATS * q2), sy / (1 + SATS * q2), vis);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.033, (now - last) / 1000); last = now;
      if (placed) { step(dt); draw(); }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function onVis() {
      if (document.hidden) { cancelAnimationFrame(raf); }
      else if (running) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }
    document.addEventListener('visibilitychange', onVis);

    return {
      layout: layout,
      moveLetters: moveLetters,
      resize: resize,
      tap: tap,
      dissolve: function () { S.RmT = 0; },
      setAlpha: function (a) { S.alphaT = a; },
      destroy: function () {
        running = false; cancelAnimationFrame(raf);
        document.removeEventListener('visibilitychange', onVis);
        var ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      },
      _state: S
    };
  }

  window.Liquid = { create: create };
})();
