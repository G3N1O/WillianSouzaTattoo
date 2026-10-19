(function () {
  "use strict";

  var gallery = document.getElementById("portfolioGallery");
  var dialog = document.getElementById("galleryLightbox");
  if (!gallery || !dialog) return;

  var cards = Array.from(gallery.querySelectorAll(".circular-gallery__item"));
  var track = gallery.querySelector(".circular-gallery__track");
  var counter = document.querySelector(".circular-gallery__status");
  var dialogImage = dialog.querySelector(".gallery-lightbox__image");
  var dialogCounter = dialog.querySelector(".gallery-lightbox__status");
  var position = 0;
  var target = 0;
  var activeIndex = -1;
  var dialogIndex = 0;
  var openerCard = null;
  var animationFrame = 0;
  var snapTimer = 0;
  var drag = null;
  var suppressClick = false;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function wrapIndex(index) {
    return ((index % cards.length) + cards.length) % cards.length;
  }

  function shortestOffset(index) {
    var offset = index - position;
    return ((offset + cards.length / 2) % cards.length + cards.length) % cards.length - cards.length / 2;
  }

  function render() {
    var galleryWidth = gallery.clientWidth;
    var itemWidth = cards[0].offsetWidth;
    var radius = itemWidth * 1.65;
    var stepAngle = galleryWidth < 640 ? 34 : galleryWidth < 1024 ? 28 : 23;
    var nextActiveIndex = wrapIndex(Math.round(position));

    cards.forEach(function (card, index) {
      var offset = shortestOffset(index);
      var angle = offset * stepAngle;
      var radians = angle * Math.PI / 180;
      var distance = Math.abs(offset);
      var x = radius * Math.sin(radians);
      var z = radius * (Math.cos(radians) - 1);
      var scale = Math.max(0.84, 1 - distance * 0.035);
      var opacity = Math.max(0.18, 1 - Math.max(0, distance - 1) * 0.24);

      card.style.setProperty("--cg-x", x.toFixed(1) + "px");
      card.style.setProperty("--cg-z", z.toFixed(1) + "px");
      card.style.setProperty("--cg-angle", (-angle * 0.68).toFixed(1) + "deg");
      card.style.setProperty("--cg-scale", scale.toFixed(3));
      card.style.setProperty("--cg-opacity", opacity.toFixed(3));
      card.style.setProperty("--cg-depth", String(100 - Math.round(distance * 10)));
      card.setAttribute("aria-current", distance < 0.5 ? "true" : "false");
    });

    if (nextActiveIndex !== activeIndex) {
      activeIndex = nextActiveIndex;
      // Only update counter if the element exists (page may have removed it)
      if (counter) counter.textContent = (activeIndex + 1) + " / " + cards.length;
    }
  }

  function animate() {
    if (animationFrame) return;

    if (reducedMotion.matches) {
      position = target;
      render();
      gallery.classList.remove("is-moving");
      return;
    }

    gallery.classList.add("is-moving");

    function frame() {
      var difference = target - position;
      if (Math.abs(difference) < 0.001) {
        position = target;
        render();
        gallery.classList.remove("is-moving");
        animationFrame = 0;
        return;
      }
      position += difference * 0.18;
      render();
      animationFrame = window.requestAnimationFrame(frame);
    }

    animationFrame = window.requestAnimationFrame(frame);
  }

  function moveBy(amount) {
    target = Math.round(target) + amount;
    animate();
  }

  function moveTo(index) {
    target = position + shortestOffset(index);
    animate();
  }

  function updateDialog(index) {
    dialogIndex = wrapIndex(index);
    var card = cards[dialogIndex];
    var image = card.querySelector("img");
    dialogImage.src = image.currentSrc || image.src;
    dialogImage.alt = image.alt;
    // Update dialog counter only if present
    if (dialogCounter) dialogCounter.textContent = (dialogIndex + 1) + " / " + cards.length;
    target = position + shortestOffset(dialogIndex);
    animate();
  }

  function openDialog(index) {
    openerCard = cards[index];
    updateDialog(index);
    if (!dialog.open) dialog.showModal();
  }

  cards.forEach(function (card, index) {
    card.addEventListener("focus", function () {
      moveTo(index);
    });
    card.addEventListener("click", function () {
      if (suppressClick) return;
      openDialog(index);
    });
  });

  gallery.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveBy(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveBy(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      moveTo(cards.length - 1);
    }
  });

  gallery.addEventListener("pointerdown", function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startPosition: position,
      moved: false
    };
    event.target.setPointerCapture(event.pointerId);
  });

  gallery.addEventListener("pointermove", function (event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    var delta = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(delta) < 5) return;
    drag.moved = true;
    gallery.classList.add("is-moving");
    position = drag.startPosition - delta / (cards[0].offsetWidth * 0.9);
    target = position;
    render();
  });

  function finishDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) {
      suppressClick = true;
      window.setTimeout(function () {
        suppressClick = false;
      }, 0);
    }
    drag = null;
    target = Math.round(position);
    animate();
  }

  gallery.addEventListener("pointerup", finishDrag);
  gallery.addEventListener("pointercancel", finishDrag);

  gallery.addEventListener("wheel", function (event) {
    if (!event.shiftKey && Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    var delta = event.shiftKey ? event.deltaY : event.deltaX;
    target += delta / (cards[0].offsetWidth * 0.9);
    animate();
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(function () {
      target = Math.round(target);
      animate();
    }, 140);
  }, { passive: false });

  var prevBtn = document.querySelector("[data-gallery-previous]");
  var nextBtn = document.querySelector("[data-gallery-next]");
  if (prevBtn) prevBtn.addEventListener("click", function () { moveBy(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { moveBy(1); });

  var closeBtn = dialog.querySelector("[data-gallery-close]");
  if (closeBtn) closeBtn.addEventListener("click", function () { dialog.close(); });

  var dlgPrev = dialog.querySelector("[data-lightbox-previous]");
  var dlgNext = dialog.querySelector("[data-lightbox-next]");
  if (dlgPrev) dlgPrev.addEventListener("click", function () { updateDialog(dialogIndex - 1); });
  if (dlgNext) dlgNext.addEventListener("click", function () { updateDialog(dialogIndex + 1); });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      updateDialog(dialogIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      updateDialog(dialogIndex + 1);
    }
  });
  dialog.addEventListener("close", function () {
    if (openerCard) openerCard.focus({ preventScroll: true });
  });

  if ("ResizeObserver" in window) {
    var resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(gallery);
  } else {
    window.addEventListener("resize", render, { passive: true });
  }
  render();
})();
