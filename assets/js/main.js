
(function () {
  "use strict";

  var prefersReduced = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

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

  /* ---------- Estado na rolagem: barra de progresso, navbar e voltar ao topo ----------
     Um único listener e um único requestAnimationFrame por quadro, no lugar de três
     listeners independentes — assim o layout é lido no máximo uma vez por quadro. */
  var progressBar = document.getElementById("progressBar");
  var navbar = document.getElementById("navbar");
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");
  var backTop = document.getElementById("backTop");

  var scrollFrame = null;

  function applyScrollState() {
    scrollFrame = null;
    var y = window.scrollY;
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    var pct = scrollable > 0 ? (y / scrollable) * 100 : 0;

    if (progressBar) progressBar.style.width = pct + "%";
    if (navbar) navbar.classList.toggle("scrolled", y > 30);
    if (backTop) backTop.classList.toggle("show", y > 600);
  }

  function queueScrollState() {
    if (scrollFrame !== null) return;
    scrollFrame = requestAnimationFrame(applyScrollState);
  }

  window.addEventListener("scroll", queueScrollState, { passive: true });
  window.addEventListener("resize", queueScrollState, { passive: true });
  applyScrollState();

  /* ---------- Navbar ---------- */

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
    if (first) first.focus({ preventScroll: true });
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
  if (backTop) {
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

})();
