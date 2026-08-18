/* ============================================================
   LR-63 — cinematic interaction engine
   Intro particles · curtain reveal · 3D hero · tilt · scroll
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var isSmall = function () { return window.innerWidth < 768; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };

  var state = { introDone: false, curtainDone: false, init3D: false, revealDone: false };

  /* ------------------------------------------------ cursor glow */
  function initCursor() {
    if (!finePointer) return;
    var glow = $('#cursorGlow');
    var tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty;
    addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      glow.style.setProperty('--cx', tx + 'px');
      glow.style.setProperty('--cy', ty + 'px');
    });
    (function loop() {
      x = lerp(x, tx, 0.12); y = lerp(y, ty, 0.12);
      glow.style.transform = 'translate(' + (x - tx) + 'px,' + (y - ty) + 'px)';
      requestAnimationFrame(loop);
    })();
  }

  /* ------------------------------------------------ magnetic */
  function initMagnetic() {
    if (!finePointer) return;
    $$('.btn').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) * 0.18;
        var dy = (e.clientY - r.top - r.height / 2) * 0.26;
        btn.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    });
  }

  /* ------------------------------------------------ 3D tilt */
  function initTilt() {
    if (!finePointer) return;
    $$('.tilt').forEach(function (card) {
      var max = parseFloat(card.getAttribute('data-tilt') || '7');
      var raf = null;
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          card.style.transform = 'perspective(1100px) rotateX(' + (-py * max) + 'deg) rotateY(' + (px * max) + 'deg) translateZ(6px)';
          raf = null;
        });
      });
      card.addEventListener('mouseleave', function () {
        if (raf) cancelAnimationFrame(raf); raf = null;
        card.style.transform = '';
      });
    });
  }

  /* ------------------------------------------------ intro particles */
  function initIntro(cb) {
    var intro = $('#intro');
    var canvas = $('#particleCanvas');
    var ctx = canvas.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W, H;
    var particles = [];
    var targets = [];
    var phase = 0; // 0 swarm, 1 form, 2 glow, 3 done
    var t0 = performance.now();
    var skip = $('#introSkip');

    function resize() {
      W = innerWidth; H = innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    addEventListener('resize', resize);

    /* sample "LR-63" glyph into point cloud */
    function sampleGlyph() {
      var off = document.createElement('canvas');
      off.width = 900; off.height = 260;
      var o = off.getContext('2d');
      o.fillStyle = '#fff'; o.fillRect(0, 0, 900, 260);
      o.fillStyle = '#000';
      o.font = '900 180px "Space Grotesk","Arial Black",Arial,sans-serif';
      o.textAlign = 'center'; o.textBaseline = 'middle';
      o.fillText('LR-63', 450, 132);
      var data = o.getImageData(0, 0, 900, 260).data;
      var pts = [];
      for (var y = 0; y < 260; y += 4) {
        for (var x = 0; x < 900; x += 4) {
          if (data[(y * 900 + x) * 4 + 3] > 120) pts.push([x, y]);
        }
      }
      var stride = Math.max(1, Math.floor(pts.length / 2200));
      var picked = [];
      for (var i = 0; i < pts.length; i += stride) picked.push(pts[i]);
      var scale = Math.min((W * 0.86) / 900, (H * 0.4) / 260);
      targets = picked.map(function (p) {
        return [ (p[0] - 450) * scale + W / 2, (p[1] - 130) * scale + H / 2 ];
      });
      build(2200);
    }

    function build(n) {
      var colors = ['255,255,255', '125,211,252', '167,139,250', '226,232,240'];
      for (var i = 0; i < n; i++) {
        var t = targets[i % targets.length];
        var sx = W * (0.12 + Math.random() * 0.76);
        var sy = H * (0.08 + Math.random() * 0.84);
        particles.push({
          x: sx, y: sy,
          tx: t[0] + (Math.random() - 0.5) * 10,
          ty: t[1] + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 0.55,
          vy: (Math.random() - 0.5) * 0.55,
          r: 0.6 + Math.random() * 1.8,
          c: colors[Math.random() < 0.78 ? 0 : (Math.random() < 0.65 ? 1 : 2)],
          a: 0.25 + Math.random() * 0.55,
          sp: 0.25 + Math.random() * 0.5
        });
      }
    }

    var burstEl = $('.intro-burst');

    function draw(now) {
      var el = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);

      if (phase === 0 && el > 2.4) phase = 1;
      if (phase === 1 && el > 5.1) {
        phase = 2;
        burstEl.style.transition = 'none';
        burstEl.style.opacity = 1;
        burstEl.style.width = burstEl.style.height = '60px';
      }

      var burstT = phase === 2 ? el - 5.1 : 0;
      if (phase === 2 && burstT > 1.15) phase = 3;

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        if (phase === 0) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
          if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
        } else if (phase === 1) {
          var k = clamp((el - 2.4) / 2.2, 0, 1);
          var e = 1 - Math.pow(1 - k, 3);
          p.x = lerp(p.x, p.tx, 0.06 + e * 0.09);
          p.y = lerp(p.y, p.ty, 0.06 + e * 0.09);
        } else if (phase === 2) {
          var o = 1 - burstT / 1.15;
          p.x += (p.x - W / 2) * 0.02 * o;
          p.y += (p.y - H / 2) * 0.02 * o;
        }
        var tw = Math.sin(now * 0.002 + i) * 0.5 + 0.5;
        var alpha = phase === 0 ? p.a * 0.6 : (phase === 3 ? Math.max(0, 1 - (el - 6.25) / 0.4) * p.a : p.a * (0.55 + 0.45 * tw));
        if (alpha <= 0) continue;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + p.c + ',' + alpha.toFixed(3) + ')';
        ctx.arc(p.x, p.y, p.r * (phase === 0 ? 0.8 : 1), 0, 6.2832);
        ctx.fill();
      }

      if (phase === 2) {
        var s = 60 + burstT * 2400;
        burstEl.style.width = burstEl.style.height = s + 'px';
        burstEl.style.opacity = String(Math.max(0, 1 - burstT / 1.15) * 0.95);
      }

      if (phase < 3) requestAnimationFrame(draw);
      else {
        burstEl.style.opacity = 0;
        setTimeout(function () { intro.style.display = 'none'; cb(false); }, 320);
      }
    }

    skip.addEventListener('click', function () {
      try { localStorage.setItem('lr63_intro_skip', '1'); } catch (e) {}
      var c = $('#curtain');
      if (c) c.style.visibility = 'hidden';
      intro.style.display = 'none';
      cb(true);
    });

    var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    ready.then(function () {
      sampleGlyph();
      requestAnimationFrame(draw);
    });
  }

  /* ------------------------------------------------ curtain reveal */
  function initCurtain(onDone) {
    var curtain = $('#curtain');
    var tl = gsap ? gsap.timeline({ defaults: { ease: 'power4.inOut' } }) : null;
    curtain.style.visibility = 'visible';
    curtain.style.opacity = 1;

    if (!tl) { onDone(); return; }

    tl.set('.welcome-wrap', { opacity: 1 })
      .from('.welcome-kicker', { opacity: 0, y: 24, duration: 0.5, ease: 'power3.out' })
      .from('.welcome-title span', { opacity: 0, y: 60, filter: 'blur(10px)', stagger: 0.14, duration: 1, ease: 'power4.out' }, '-=0.2')
      .to('.curtain-panel.left', { xPercent: -104, duration: 1.5 }, '+=0.55')
      .to('.curtain-panel.right', { xPercent: 104, duration: 1.5 }, '<')
      .to('.rope.left', { x: -260, opacity: 0, duration: 1.5 }, '<')
      .to('.rope.right', { x: 260, opacity: 0, duration: 1.5 }, '<')
      .to('.stage-figure.left', { x: -90, opacity: 0, duration: 1.1 }, '<0.3')
      .to('.stage-figure.right', { x: 90, opacity: 0, duration: 1.1 }, '<')
      .to('.curtain-rod', { scaleY: 0.02, transformOrigin: 'center top', duration: 1.2 }, '+=0.6')
      .to(curtain, { opacity: 0, duration: 0.9, ease: 'power2.inOut', onComplete: onDone }, '-=0.2');
  }

  /* ------------------------------------------------ hero text entrance */
  function animateHero() {
    if (!gsap || state.heroAnimated) return;
    state.heroAnimated = true;
    var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.from('#hk', { opacity: 0, y: 26, duration: 0.7 }, 0)
      .from('#ht .line', { yPercent: 120, duration: 1.1, stagger: 0.16 }, 0.12)
      .from('#hs', { opacity: 0, y: 30, filter: 'blur(8px)', duration: 0.9 }, 0.75)
      .from('#hc .btn', { opacity: 0, y: 34, stagger: 0.14, duration: 0.8 }, 1.0)
      .from('#hf .hf-chip', { opacity: 0, y: 24, stagger: 0.09, duration: 0.7 }, 1.35)
      .from('#scrollHint', { opacity: 0, duration: 0.8 }, 1.7);
  }

  /* ------------------------------------------------ THREE hero scene */
  function initHero3D() {
    if (state.init3D || reduced || isSmall()) {
      document.documentElement.classList.add('mobile-3d');
      return;
    }
    if (!window.THREE) {
      document.documentElement.classList.add('no-3d');
      return;
    }
    try {
      state.init3D = true;
      document.documentElement.classList.remove('mobile-3d', 'no-3d');
      var canvas = $('#hero3d');
      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      var scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x05050a, 0.042);
      var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
      camera.position.set(0, 0, 14);
      var group = new THREE.Group();
      scene.add(group);

      var loader = new THREE.TextureLoader();
      function billboard(src, x, y, z, s, rx, ry) {
        var tex = loader.load('assets/img/' + src);
        var m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92 });
        var g = new THREE.PlaneGeometry(16 * s, 9 * s);
        var mesh = new THREE.Mesh(g, m);
        mesh.position.set(x, y, z);
        mesh.rotation.set(rx, ry, 0);
        group.add(mesh);
        return mesh;
      }
      var b1 = billboard('hero-1.jpg', -6.4, 1.6, -3, 0.62, 0.06, 0.55);
      var b2 = billboard('hero-2.jpg', 6.2, 1.2, -2.2, 0.55, 0.05, -0.52);
      var b3 = billboard('hero-3.jpg', 0, -2.6, -1.2, 0.5, -0.08, 0);

      var wire = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.5, 1),
        new THREE.MeshBasicMaterial({ color: 0x4cc3ff, wireframe: true, transparent: true, opacity: 0.4 })
      );
      wire.position.set(-7.6, -1.4, 1.5);
      var knot = new THREE.Mesh(
        new THREE.TorusKnotGeometry(1.05, 0.34, 110, 18),
        new THREE.MeshStandardMaterial({ color: 0x8b5cf6, metalness: 0.92, roughness: 0.22 })
      );
      knot.position.set(7.4, -1.6, 1.2);
      var box1 = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 1.3, 1.3),
        new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.26, metalness: 0.7, roughness: 0.14 })
      );
      box1.position.set(-4.6, 3.4, 0.4);
      var box2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 2.6, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.3, metalness: 0.6, roughness: 0.18 })
      );
      box2.position.set(4.1, 3.6, 0.9);
      [wire, knot, box1, box2].forEach(function (m) {
        m.castShadow = false;
        group.add(m);
      });

      group.add(new THREE.AmbientLight(0x3b4b6b, 0.75));
      var dir = new THREE.DirectionalLight(0xffffff, 0.85);
      dir.position.set(4, 8, 9);
      group.add(dir);
      var p1 = new THREE.PointLight(0x38bdf8, 1.7, 26);
      p1.position.set(-6, 3, 5);
      var p2 = new THREE.PointLight(0x8b5cf6, 1.5, 26);
      p2.position.set(6, -3, 4);
      group.add(p1); group.add(p2);

      var N = 750;
      var pos = new Float32Array(N * 3);
      var col = new Float32Array(N * 3);
      for (var i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 26;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
        pos[i * 3 + 2] = -8 + Math.random() * 16;
        var hue = Math.random();
        col[i * 3] = hue < 0.7 ? 1 : (hue < 0.85 ? 0.55 : 0.9);
        col[i * 3 + 1] = hue < 0.7 ? 1 : (hue < 0.85 ? 0.83 : 0.66);
        col[i * 3 + 2] = hue < 0.7 ? 1 : (hue < 0.85 ? 0.95 : 1);
      }
      var pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      var pts = new THREE.Points(pGeo, new THREE.PointsMaterial({
        size: 0.055, vertexColors: true, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      group.add(pts);

      var mx = 0, my = 0;
      addEventListener('pointermove', function (e) {
        mx = e.clientX / innerWidth - 0.5;
        my = e.clientY / innerHeight - 0.5;
      });

      function resize() {
        var w = $('#hero').clientWidth || innerWidth;
        var h = $('#hero').clientHeight || innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      resize();
      addEventListener('resize', resize);

      var start = null;
      function tick(now) {
        if (!state.curtainDone) { requestAnimationFrame(tick); return; }
        if (!start) start = now;
        var t = (now - start) / 1000;
        camera.position.x = lerp(camera.position.x, mx * 1.5, 0.035);
        camera.position.y = lerp(camera.position.y, -my * 1.0, 0.035);
        camera.lookAt(0, 0, 0);
        group.rotation.y = mx * 0.12;
        group.rotation.x = -my * 0.06;
        b1.position.y = 1.6 + Math.sin(t * 0.55) * 0.28;
        b2.position.y = 1.2 + Math.sin(t * 0.5 + 2) * 0.26;
        b3.position.y = -2.6 + Math.sin(t * 0.47 + 4) * 0.24;
        wire.rotation.x += 0.0035; wire.rotation.y += 0.005;
        knot.rotation.x += 0.004; knot.rotation.z += 0.003;
        box1.rotation.y += 0.006; box2.rotation.y -= 0.007;
        box2.position.y = 3.6 + Math.sin(t * 0.6) * 0.3;
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    } catch (err) {
      document.documentElement.classList.add('no-3d');
    }
  }

  /* ------------------------------------------------ scroll reveals */
  function initReveals() {
    var els = $$('.reveal');
    if (!gsap || !window.ScrollTrigger) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.style.opacity = '1'; en.target.style.transform = 'none'; io.unobserve(en.target); }
        });
      }, { threshold: 0.12 });
      els.forEach(function (el) { io.observe(el); });
      return;
    }
    els.forEach(function (el) {
      gsap.fromTo(el,
        { opacity: 0, y: 54, filter: 'blur(10px)' },
        {
          opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.05, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 86%', once: true }
        });
    });

    /* portfolio 3D entrance */
    gsap.utils.toArray('.work-item').forEach(function (item, i) {
      gsap.fromTo(item,
        { opacity: 0, rotateY: (i % 2 ? 22 : -22), x: (i % 2 ? 90 : -90), scale: 0.94, filter: 'blur(8px)' },
        {
          opacity: 1, rotateY: 0, x: 0, scale: 1, filter: 'blur(0px)', duration: 1.15,
          ease: 'power3.out', delay: (i % 4) * 0.06,
          scrollTrigger: { trigger: item, start: 'top 88%', once: true }
        });
    });

    /* parallax on platform images */
    $$('.plat-media').forEach(function (m) {
      gsap.fromTo(m.querySelector('img'),
        { yPercent: -8 }, {
          yPercent: 8, ease: 'none',
          scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true }
        });
    });

    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  /* ------------------------------------------------ stats count-up */
  function initStats() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var b = en.target.querySelector('b');
        var end = parseFloat(b.getAttribute('data-count'));
        var suffix = b.getAttribute('data-suffix') || '';
        var t0 = null;
        function step(now) {
          if (!t0) t0 = now;
          var k = clamp((now - t0) / 1900, 0, 1);
          var e = 1 - Math.pow(1 - k, 3);
          b.textContent = Math.round(end * e) + suffix;
          if (k < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    $$('.stat').forEach(function (s) { io.observe(s); });
  }

  /* ------------------------------------------------ AI network */
  function buildNetwork() {
    var wrap = $('#netWrap');
    var svg = $('#netSvg');
    if (!wrap) return;
    var nodes = $$('.net-node', wrap);
    var core = $('#netCore');
    var rect = wrap.getBoundingClientRect();
    var cx = (core.offsetLeft + core.offsetWidth / 2) - rect.left + wrap.scrollLeft;
    var cy = (core.offsetTop + core.offsetHeight / 2) - rect.top + wrap.scrollTop;
    var w = wrap.clientWidth, h = wrap.clientHeight;

    /* place nodes on an ellipse around the core */
    var rx = w * 0.38, ry = h * 0.40;
    nodes.forEach(function (n, i) {
      var ang = -Math.PI / 2 + (i / nodes.length) * Math.PI * 2;
      var nx = cx + Math.cos(ang) * rx * (w < 640 ? 1 : 1);
      var ny = cy + Math.sin(ang) * ry * (w < 640 ? 0.92 : 1);
      n.style.left = clamp(nx, 60, w - 60) + 'px';
      n.style.top = clamp(ny, 60, h - 60) + 'px';
    });

    /* redraw lines + flowing data dots */
    function draw() {
      var inner = '';
      var paths = [];
      nodes.forEach(function (n) {
        var nx = n.offsetLeft + n.offsetWidth / 2;
        var ny = n.offsetTop + n.offsetHeight / 2;
        inner += '<line x1="' + cx + '" y1="' + cy + '" x2="' + nx + '" y2="' + ny + '"/>';
        var d = 'M' + cx + ' ' + cy + ' L' + nx + ' ' + ny;
        paths.push(d);
      });
      svg.innerHTML = inner;
      var ns = 'http://www.w3.org/2000/svg';
      paths.forEach(function (d) {
        var c = document.createElementNS(ns, 'circle');
        c.setAttribute('r', '3');
        c.setAttribute('fill', '#38bdf8');
        var am = document.createElementNS(ns, 'animateMotion');
        am.setAttribute('dur', '2.6s');
        am.setAttribute('repeatCount', 'indefinite');
        am.setAttribute('path', d);
        c.appendChild(am);
        svg.appendChild(c);
      });
    }
    draw();
    addEventListener('resize', function () { setTimeout(draw, 250); });
  }

  /* ------------------------------------------------ nav */
  function initNav() {
    var nav = $('#nav');
    var burger = $('#navBurger');
    var menu = $('#mobileMenu');
    addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', scrollY > 40);
    }, { passive: true });
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.classList.toggle('open', open);
    });
    $$('#mobileMenu a').forEach(function (a) {
      a.addEventListener('click', function () { menu.classList.remove('open'); });
    });
  }

  /* ------------------------------------------------ marquee fill */
  function fillMarquee() {
    var text = 'CREATIVE <b>&bull;</b> PERFORMANCE <b>&bull;</b> AI <b>&bull;</b> ATTENTION <b>&bull;</b> BRANDS <b>&bull;</b> GROWTH <b>&bull;</b> ';
    var m1 = $('#mq1'), m2 = $('#mq2');
    [m1, m2].forEach(function (el) {
      if (!el) return;
      el.innerHTML = '';
      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.innerHTML = text + text;
        el.appendChild(span);
      }
    });
  }

  /* ------------------------------------------------ cta dust */
  function initDust() {
    var dust = $('#ctaDust');
    if (!dust || reduced) return;
    var n = isSmall() ? 14 : 24;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('i');
      var sz = 2 + Math.random() * 4;
      s.style.left = Math.random() * 100 + '%';
      s.style.width = s.style.height = sz + 'px';
      s.style.animationDuration = (7 + Math.random() * 10) + 's';
      s.style.animationDelay = (Math.random() * 9) + 's';
      s.style.opacity = (0.35 + Math.random() * 0.6).toFixed(2);
      dust.appendChild(s);
    }
  }

  /* ------------------------------------------------ boot */
  function boot() {
    fillMarquee();
    initCursor();
    initMagnetic();
    initTilt();
    initNav();
    initStats();
    initDust();
    initReveals();

    var skipIntro = reduced;
    try { if (localStorage.getItem('lr63_intro_skip') === '1') skipIntro = true; } catch (e) {}

    if (skipIntro) {
      $('#intro').style.display = 'none';
      $('#curtain').style.visibility = 'hidden';
      state.curtainDone = true;
      animateHero();
      initHero3D();
    } else {
      initIntro(function (fast) {
        state.introDone = true;
        if (fast) {
          $('#curtain').style.visibility = 'hidden';
          state.curtainDone = true;
          animateHero();
          initHero3D();
          if (window.ScrollTrigger) ScrollTrigger.refresh();
        } else {
          initCurtain(function () {
            if (!state.curtainDone) {
              state.curtainDone = true;
              animateHero();
              initHero3D();
              if (window.ScrollTrigger) ScrollTrigger.refresh();
            }
          });
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  addEventListener('load', function () {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    if (!isSmall() && state.curtainDone && !state.init3D && !reduced) initHero3D();
  });

  /* QA hook: ?shot=#section scrolls to a section (used for screenshot testing) */
  var qs = new URLSearchParams(location.search).get('shot');
  if (qs) setTimeout(function () {
    var t = document.querySelector(qs);
    if (t) t.scrollIntoView({ block: 'start' });
  }, 400);
})();
