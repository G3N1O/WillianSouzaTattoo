(function () {
  "use strict";

  var prefersReduced = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  /* Detecção robusta de touch */
  var isTouch = false;
  if (window.matchMedia) {
    isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  }
  if (!isTouch && typeof navigator !== "undefined") {
    isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  }

  /* ---------- CSS injetado ---------- */
  (function injectStyles() {
    var style = document.createElement("style");
    style.setAttribute("data-injected", "main-js");
    style.textContent = [
      /* Libera rolagem vertical por cima da galeria */
      ".galeria-stage, .drift-wrap, .drift-wall, .drift-wall__plane, .drift-wall__col, .drift-wall__track {",
      "  touch-action: pan-y !important;",
      "}",
      /* Overlay mais transparente = imagens mais visíveis */
      ".drift-wall__overlay { opacity: 0.35 !important; }",
      /* Galeria: cursor + zoom no clique */
      ".drift-wall__tile { cursor: zoom-in; overflow: visible !important; }",
      ".drift-wall__inner {",
      "  transition: transform 0.4s cubic-bezier(0.22,0.61,0.36,1),",
      "              box-shadow 0.4s cubic-bezier(0.22,0.61,0.36,1) !important;",
      "}",
      ".drift-wall__tile.is-zoomed { z-index: 20; cursor: zoom-out; }",
      ".drift-wall__tile.is-zoomed .drift-wall__inner {",
      "  transform: scale(1.35);",
      "  box-shadow: 0 24px 60px rgba(0,0,0,0.55);",
      "}",
      /* Aceleração de GPU pra suavizar */
      ".drift-wall__plane, .drift-wall__track, .drift-wall__inner {",
      "  will-change: transform;",
      "}"
    ].join("\n");
    document.head.appendChild(style);
  })();

  /* ---------- Preloader ---------- */
  (function () {
    var preloader = document.getElementById("preloader");
    if (!preloader) return;
    document.body.classList.add("loading");

    var started = performance.now();
    var MIN_TIME = 1500;
    var MAX_TIME = 4000;
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;

      var pLogo = preloader.querySelector(".preloader-logo");
      var pName = preloader.querySelector(".preloader-name");
      var heroLogo = document.querySelector(".hero-logo");
      var heroName = document.querySelector(".hero-name");

      if (pLogo) pLogo.style.animation = "none";

      function landOn(target, from) {
        if (!target || !from) return "";
        var t = target.getBoundingClientRect();
        var f = from.getBoundingClientRect();
        if (!t.width || !t.height || !f.width || !f.height) return "";
        var scale = t.width / f.width;
        var dx = t.left + t.width / 2 - (f.left + f.width / 2);
        var dy = t.top + t.height / 2 - (f.top + f.height / 2);
        return (
          "translate(" + dx.toFixed(2) + "px, " + dy.toFixed(2) + "px) " +
          "scale(" + scale.toFixed(4) + ")"
        );
      }

      var logoLand = landOn(heroLogo, pLogo);
      var nameLand = landOn(heroName, pName);
      if (logoLand) preloader.style.setProperty("--morph-logo", logoLand);
      if (nameLand) preloader.style.setProperty("--morph-name", nameLand);

      void preloader.offsetWidth;
      preloader.classList.add("grow");

      setTimeout(function () {
        document.body.classList.remove("loading");
        if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
      }, 650);
    }

    function onReady() {
      var elapsed = performance.now() - started;
      setTimeout(finish, Math.max(0, MIN_TIME - elapsed));
    }

    if (document.readyState === "complete") onReady();
    else window.addEventListener("load", onReady);
    setTimeout(finish, MAX_TIME);
  })();

  /* ---------- Scroll progress ---------- */
  var progressBar = document.getElementById("progressBar");
  if (progressBar) {
    function updateProgress() {
      var scrollable = document.documentElement.scrollHeight - window.innerHeight;
      var pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      progressBar.style.width = pct + "%";
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });
    updateProgress();
  }

  /* ---------- Navbar ---------- */
  var navbar = document.getElementById("navbar");
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");

  function onScrollNav() {
    if (window.scrollY > 30) navbar.classList.add("scrolled");
    else navbar.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  function closeMenu(restoreFocus) {
    navLinks.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Abrir menu");
    document.body.classList.remove("nav-open");
    if (restoreFocus) navToggle.focus();
  }
  function openMenu() {
    navLinks.classList.add("open");
    navToggle.classList.add("open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Fechar menu");
    document.body.classList.add("nav-open");
    var first = navLinks.querySelector("a");
    if (first) first.focus();
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      if (navLinks.classList.contains("open")) closeMenu(false);
      else openMenu();
    });
    navLinks.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navLinks.classList.contains("open")) closeMenu(true);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 768 && navLinks.classList.contains("open")) closeMenu(false);
    }, { passive: true });
  }

  /* ---------- Back to top ---------- */
  var backTop = document.getElementById("backTop");
  if (backTop) {
    function onScrollTop() {
      backTop.classList.toggle("show", window.scrollY > 600);
    }
    window.addEventListener("scroll", onScrollTop, { passive: true });
    onScrollTop();
    backTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReduced) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".acc-item").forEach(function (item) {
    var btn = item.querySelector(".acc-btn");
    var panel = item.querySelector(".acc-panel");
    function open() {
      item.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      panel.style.maxHeight = panel.scrollHeight + "px";
    }
    function close() {
      item.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      panel.style.maxHeight = "";
    }
    btn.addEventListener("click", function () {
      var isOpen = item.classList.contains("open");
      document.querySelectorAll(".acc-item.open").forEach(close);
      if (!isOpen) open();
    });
  });

  /* ---------- Ano dinâmico ---------- */
  var ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();

  /* ---------- Galeria: Drift Wall ---------- */
  (function initDriftWall() {
    var wall = document.getElementById("driftWall");
    var plane = document.getElementById("driftPlane");
    if (!wall || !plane) return;

    var IMAGES = [
      "assets/Portfolio/1.jpg",
      "assets/Portfolio/2.jpg",
      "assets/Portfolio/3.jpg",
      "assets/Portfolio/4.jpg",
      "assets/Portfolio/5.jpg",
      "assets/Portfolio/6.jpg",
      "assets/Portfolio/7.jpg",
      "assets/Portfolio/8.jpg",
      "assets/Portfolio/9.jpg"
    ];

    var VIEW = isTouch
      ? { cols: 3, scale: 1.0, tilt: 8, turn: 0, depth: 0, parallax: 0 }
      : { cols: 5, scale: 1.18, tilt: 16, turn: -14, depth: 120, parallax: 0.6 };

    var SPEED = 42;
    var VARIANCE = 0.45;
    var DIR_UP = true;
    var ROLL = 0;

    var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

    var tracks = [];
    var copyHeights = [];
    var offsets = [];
    var velocities = [];
    var baseVel = [];
    var hoveredCol = -1;
    var activeTile = null;
    var zoomedTile = null;
    var pointer = { x: 0, y: 0 };
    var damped = { x: 0, y: 0 };
    var lastTs = null;
    var raf = null;
    var resizeTimer = null;
    var builtCols = VIEW.cols;
    /* Flag: a galeria está visível na viewport? Se não, pausa o RAF. */
    var wallVisible = true;

    function isReduced() {
      return prefersReduced || (mq && mq.matches);
    }

    function columnFactor(index, variance) {
      var pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1;
      return 1 + variance * pseudo;
    }

    function readMetrics() {
      var cs = window.getComputedStyle(wall);
      var tileH = parseFloat(cs.getPropertyValue("--dw-tile-h")) || 300;
      var gap = parseFloat(cs.getPropertyValue("--dw-gap")) || 18;
      return { unit: tileH + gap, height: wall.clientHeight || 600 };
    }

    function applyPlane(px, py) {
      plane.style.transform =
        "translate(-50%, -50%) scale(" + VIEW.scale + ") " +
        "rotateX(" + (VIEW.tilt + py) + "deg) " +
        "rotateY(" + (VIEW.turn + px) + "deg) " +
        "rotateZ(" + ROLL + "deg) " +
        "translateZ(" + -VIEW.depth + "px)";
    }

    function activate(tile) {
      if (activeTile && activeTile !== tile) activeTile.classList.remove("is-active");
      activeTile = tile;
      tile.classList.add("is-active");
      hoveredCol = Number(tile.getAttribute("data-col"));
    }

    function clearActive() {
      if (activeTile) activeTile.classList.remove("is-active");
      activeTile = null;
      hoveredCol = -1;
    }

    function startRaf() {
      if (raf === null && !isReduced() && wallVisible) {
        lastTs = null;
        raf = requestAnimationFrame(animate);
      }
    }

    function stopRaf() {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }

    function build() {
      stopRaf();
      lastTs = null;
      plane.innerHTML = "";
      tracks = [];
      copyHeights = [];
      offsets = [];
      velocities = [];
      baseVel = [];
      clearActive();

      var m = readMetrics();
      var dirSign = DIR_UP ? 1 : -1;
      var reduced = isReduced();
      var COLS = VIEW.cols;
      builtCols = COLS;

      for (var c = 0; c < COLS; c++) {
        var colItems = [];
        for (var i = c; i < IMAGES.length; i += COLS) colItems.push(IMAGES[i]);
        if (!colItems.length) colItems = IMAGES.slice(0, 1);

        var copyHeight = Math.max(m.unit, colItems.length * m.unit);
        var copies = reduced
          ? Math.max(1, Math.ceil(m.height / copyHeight))
          : Math.max(2, Math.ceil((m.height * 1.6) / copyHeight) + 1);

        var colEl = document.createElement("div");
        colEl.className = "drift-wall__col";
        var distFromCenter = Math.abs(c - (COLS - 1) / 2) / Math.max(1, (COLS - 1) / 2);
        var colDim = 0.5 + (1 - distFromCenter) * 0.22;
        colEl.style.setProperty("--dw-dim", colDim.toFixed(3));

        var track = document.createElement("div");
        track.className = "drift-wall__track";

        for (var k = 0; k < copies; k++) {
          colItems.forEach(function (src, idx) {
            var tile = document.createElement("div");
            tile.className = "drift-wall__tile";
            tile.setAttribute("data-tile-id", c + "-" + k + "-" + idx);
            tile.setAttribute("data-col", c);
            tile.setAttribute("data-src", src);

            var inner = document.createElement("span");
            inner.className = "drift-wall__inner";

            var img = document.createElement("img");
            img.src = src;
            img.alt = "";
            img.decoding = "async";
            img.draggable = false;
            img.addEventListener("error", function () { tile.style.display = "none"; });

            var ov = document.createElement("span");
            ov.className = "drift-wall__overlay";
            ov.setAttribute("aria-hidden", "true");

            inner.appendChild(img);
            inner.appendChild(ov);
            tile.appendChild(inner);
            track.appendChild(tile);
          });
        }

        colEl.appendChild(track);
        plane.appendChild(colEl);
        tracks.push(track);
        copyHeights.push(copyHeight);
        offsets.push(copyHeight * ((c * 0.37) % 1));
        velocities.push(0);
        var altSign = c % 2 === 0 ? 1 : -1;
        baseVel.push(SPEED * columnFactor(c, VARIANCE) * dirSign * altSign);
      }

      applyPlane(0, 0);

      if (reduced) {
        tracks.forEach(function (t, i) {
          t.style.transform = "translate3d(0," + -offsets[i] + "px,0)";
        });
      } else {
        startRaf();
      }
    }

    function animate(ts) {
      if (lastTs === null) lastTs = ts;
      var dt = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000));
      lastTs = ts;

      var maxTilt = VIEW.parallax * 8;
      var tx = pointer.x * maxTilt;
      var ty = -pointer.y * maxTilt;
      var damp = 1 - Math.exp(-dt / 0.12);
      damped.x += (tx - damped.x) * damp;
      damped.y += (ty - damped.y) * damp;
      applyPlane(damped.x, damped.y);

      for (var c = 0; c < tracks.length; c++) {
        var ch = copyHeights[c];
        var target = hoveredCol === c ? 0 : baseVel[c];
        var ease = 1 - Math.exp(-dt / (target === 0 ? 0.16 : 0.28));
        velocities[c] += (target - velocities[c]) * ease;
        var next = offsets[c] + velocities[c] * dt;
        next = ((next % ch) + ch) % ch;
        offsets[c] = next;
        tracks[c].style.transform = "translate3d(0," + -next + "px,0)";
      }

      /* Só agenda o próximo frame se a galeria ainda estiver visível.
         Fora da viewport, paramos o RAF pra não competir com o scroll. */
      if (wallVisible && !isReduced()) {
        raf = requestAnimationFrame(animate);
      } else {
        raf = null;
      }
    }

    /* Pausa a animação quando a galeria sai da viewport.
       rootMargin positivo faz ativar um pouco antes de entrar em vista. */
    if ("IntersectionObserver" in window) {
      var wallObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          wallVisible = entry.isIntersecting;
          if (wallVisible) {
            startRaf();
          } else {
            stopRaf();
          }
        });
      }, { rootMargin: "150px 0px 150px 0px", threshold: 0 });
      wallObserver.observe(wall);
    }

    /* Hover de coluna só em desktop */
    if (!isTouch) {
      wall.addEventListener("pointermove", function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        var rect = wall.getBoundingClientRect();
        if (VIEW.parallax > 0 && !isReduced()) {
          pointer.x = (e.clientX - rect.left) / rect.width - 0.5;
          pointer.y = (e.clientY - rect.top) / rect.height - 0.5;
        }
        var hit = document.elementFromPoint(e.clientX, e.clientY);
        var tile = hit && hit.closest ? hit.closest("[data-tile-id]") : null;
        if (!tile || !wall.contains(tile)) return;
        if (tile === activeTile) return;
        activate(tile);
      });
      wall.addEventListener("pointerleave", function () {
        pointer.x = 0;
        pointer.y = 0;
        clearActive();
      });
    }

    /* Clique = zoom sutil. Clique fora ou no mesmo = volta ao normal. */
    wall.addEventListener("click", function (e) {
      var tile = e.target.closest ? e.target.closest("[data-tile-id]") : null;

      /* Clique fora de qualquer tile → remove zoom */
      if (!tile || !wall.contains(tile)) {
        if (zoomedTile) {
          zoomedTile.classList.remove("is-zoomed");
          zoomedTile = null;
        }
        return;
      }

      /* Clique na mesma tile já ampliada → desfaz */
      if (tile === zoomedTile) {
        tile.classList.remove("is-zoomed");
        zoomedTile = null;
        return;
      }

      /* Nova tile → aplica zoom nela e remove da anterior */
      if (zoomedTile) zoomedTile.classList.remove("is-zoomed");
      tile.classList.add("is-zoomed");
      zoomedTile = tile;
    });

    window.addEventListener("resize", function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var nextCols = isTouch ? 3 : 5;
        if (nextCols !== builtCols) {
          VIEW = isTouch
            ? { cols: 3, scale: 1.0, tilt: 8, turn: 0, depth: 0, parallax: 0 }
            : { cols: 5, scale: 1.18, tilt: 16, turn: -14, depth: 120, parallax: 0.6 };
        }
        build();
      }, 220);
    }, { passive: true });

    if (mq) {
      if (mq.addEventListener) mq.addEventListener("change", build);
      else if (mq.addListener) mq.addListener(build);
    }

    function firstPaint() {
      build();
      requestAnimationFrame(function () {
        applyPlane(damped.x, damped.y);
        setTimeout(function () { applyPlane(damped.x, damped.y); }, 60);
      });
    }

    if (document.readyState === "complete") firstPaint();
    else {
      window.addEventListener("load", firstPaint);
      setTimeout(firstPaint, 300);
    }
  })();

})();