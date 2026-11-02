(function () {
  "use strict";

  var carousel = document.querySelector("[data-polaroid-carousel]");
  if (!carousel) return;

  var viewport = carousel.querySelector("[data-carousel-viewport]");
  var slides = Array.prototype.slice.call(carousel.querySelectorAll(".polaroid-carousel__slide"));
  var cards = slides.map(function (slide) { return slide.querySelector(".polaroid-card"); });
  var previousButton = carousel.querySelector("[data-carousel-previous]");
  var nextButton = carousel.querySelector("[data-carousel-next]");
  var autoplayButton = carousel.querySelector("[data-carousel-autoplay]");
  var status = carousel.querySelector("[data-carousel-status]");
  var dialog = document.querySelector("[data-gallery-dialog]");
  var dialogImage = dialog && dialog.querySelector("[data-lightbox-image]");
  var dialogStatus = dialog && dialog.querySelector("[data-lightbox-status]");
  var dialogPrevious = dialog && dialog.querySelector("[data-lightbox-previous]");
  var dialogNext = dialog && dialog.querySelector("[data-lightbox-next]");
  var dialogClose = dialog && dialog.querySelector("[data-gallery-close]");

  if (!viewport || !slides.length) return;

  var reducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  var currentIndex = 0;
  var autoplayEnabled = !reducedMotion || !reducedMotion.matches;
  var visible = false;
  var timer = null;
  var scrollFrame = null;
  var pointer = null;
  var suppressClick = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getNearestIndex() {
    var center = viewport.getBoundingClientRect().left + viewport.clientWidth / 2;
    var nearest = 0;
    var nearestDistance = Infinity;

    slides.forEach(function (slide, index) {
      var rect = slide.getBoundingClientRect();
      var distance = Math.abs(rect.left + rect.width / 2 - center);
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });

    return nearest;
  }

  function updateCarousel() {
    var viewportRect = viewport.getBoundingClientRect();
    slides.forEach(function (slide, index) {
      var rect = slide.getBoundingClientRect();
      var position = clamp((rect.left + rect.width / 2 - viewportRect.left) / viewportRect.width, 0, 1);
      var cordDrop = Math.sin(position * Math.PI) * 42;
      slide.style.setProperty("--cord-drop", cordDrop.toFixed(2) + "px");
      cards[index].setAttribute("aria-current", index === currentIndex ? "true" : "false");
    });

    if (status) status.textContent = (currentIndex + 1) + " de " + slides.length;
    if (previousButton) previousButton.disabled = currentIndex === 0;
    if (nextButton) nextButton.disabled = currentIndex === slides.length - 1;
    updateAutoplayButton();

    if (dialog && dialog.open) updateLightbox();
  }

  function updateAutoplayButton() {
    if (!autoplayButton) return;
    var atEnd = currentIndex === slides.length - 1;
    autoplayButton.textContent = atEnd ? "Reiniciar" : autoplayEnabled ? "Pausar" : "Retomar";
    autoplayButton.setAttribute(
      "aria-label",
      atEnd
        ? "Reiniciar avanço automático desde a primeira tatuagem"
        : autoplayEnabled
          ? "Pausar avanço automático"
          : "Retomar avanço automático"
    );
    autoplayButton.setAttribute("aria-pressed", autoplayEnabled && !atEnd ? "false" : "true");
  }

  function goTo(index, announce) {
    currentIndex = clamp(index, 0, slides.length - 1);
    if (status) status.setAttribute("aria-live", announce ? "polite" : "off");

    var slide = slides[currentIndex];
    var left = slide.offsetLeft - (viewport.clientWidth - slide.offsetWidth) / 2;
    viewport.scrollTo({
      left: left,
      behavior: reducedMotion && reducedMotion.matches ? "auto" : "smooth"
    });

    updateCarousel();
    scheduleAutoplay();
  }

  function updateLightbox() {
    if (!dialog || !dialogImage) return;
    var image = slides[currentIndex].querySelector("img");
    dialogImage.src = image.currentSrc || image.src;
    dialogImage.alt = image.alt;
    if (dialogStatus) dialogStatus.textContent = (currentIndex + 1) + " de " + slides.length;
    if (dialogPrevious) dialogPrevious.disabled = currentIndex === 0;
    if (dialogNext) dialogNext.disabled = currentIndex === slides.length - 1;
  }

  function openLightbox(index) {
    if (!dialog || typeof dialog.showModal !== "function") return;
    goTo(index, true);
    updateLightbox();
    dialog.showModal();
    scheduleAutoplay();
  }

  function clearAutoplay() {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function scheduleAutoplay() {
    clearAutoplay();
    if (
      !autoplayEnabled ||
      !visible ||
      document.hidden ||
      carousel.matches(":hover") ||
      carousel.contains(document.activeElement) ||
      pointer ||
      (dialog && dialog.open)
    ) return;

    timer = window.setTimeout(function () {
      if (currentIndex >= slides.length - 1) {
        autoplayEnabled = false;
        updateCarousel();
        return;
      }
      goTo(currentIndex + 1, false);
    }, 5600);
  }

  if (previousButton) {
    previousButton.addEventListener("click", function () {
      goTo(currentIndex - 1, true);
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", function () {
      goTo(currentIndex + 1, true);
    });
  }

  if (autoplayButton) {
    autoplayButton.addEventListener("click", function () {
      if (currentIndex === slides.length - 1) {
        currentIndex = 0;
        goTo(0, true);
        autoplayEnabled = true;
      } else {
        autoplayEnabled = !autoplayEnabled;
      }
      updateCarousel();
      scheduleAutoplay();
    });
  }

  viewport.addEventListener("keydown", function (event) {
    var targetIndex = currentIndex;
    if (event.key === "ArrowRight") targetIndex += 1;
    else if (event.key === "ArrowLeft") targetIndex -= 1;
    else if (event.key === "Home") targetIndex = 0;
    else if (event.key === "End") targetIndex = slides.length - 1;
    else return;

    event.preventDefault();
    goTo(targetIndex, true);
    if (event.target.matches(".polaroid-card")) cards[currentIndex].focus();
  });

  viewport.addEventListener("scroll", function () {
    if (scrollFrame !== null) return;
    scrollFrame = window.requestAnimationFrame(function () {
      scrollFrame = null;
      currentIndex = getNearestIndex();
      updateCarousel();
    });
  }, { passive: true });

  viewport.addEventListener("pointerdown", function (event) {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    pointer = {
      id: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      startScroll: viewport.scrollLeft,
      startIndex: getNearestIndex(),
      moved: false
    };
    if (viewport.setPointerCapture) viewport.setPointerCapture(event.pointerId);
    scheduleAutoplay();
  });

  viewport.addEventListener("pointermove", function (event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    var delta = event.clientX - pointer.startX;
    if (!pointer.moved && Math.abs(delta) < 6) return;
    pointer.moved = true;
    carousel.classList.add("is-dragging");
    viewport.scrollLeft = pointer.startScroll - delta;

    var swing = clamp((event.clientX - pointer.lastX) * -0.75, -16, 16);
    var viewportRect = viewport.getBoundingClientRect();
    slides.forEach(function (slide, index) {
      var rect = slide.getBoundingClientRect();
      var distance = Math.abs(rect.left + rect.width / 2 - event.clientX) / viewportRect.width;
      var influence = clamp(1 - distance, 0, 1);
      cards[index].style.setProperty("--swing-angle", (swing * influence).toFixed(2) + "deg");
    });
    pointer.lastX = event.clientX;
    if (event.cancelable) event.preventDefault();
  });

  function finishPointer(event) {
    if (!pointer || (event && event.pointerId !== pointer.id)) return;
    var gesture = pointer;
    pointer = null;
    carousel.classList.remove("is-dragging");
    cards.forEach(function (card) { card.style.setProperty("--swing-angle", "0deg"); });

    if (gesture.moved) {
      suppressClick = true;
      window.setTimeout(function () { suppressClick = false; }, 0);
      var delta = (event ? event.clientX : gesture.lastX) - gesture.startX;
      var threshold = slides[gesture.startIndex].offsetWidth * 0.18;
      var target = Math.abs(delta) > threshold
        ? gesture.startIndex + (delta < 0 ? 1 : -1)
        : getNearestIndex();
      goTo(target, true);
    } else {
      scheduleAutoplay();
    }
  }

  viewport.addEventListener("pointerup", finishPointer);
  viewport.addEventListener("pointercancel", finishPointer);
  viewport.addEventListener("lostpointercapture", finishPointer);

  viewport.addEventListener("click", function (event) {
    var card = event.target.closest("[data-gallery-open]");
    if (!card) return;
    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    openLightbox(cards.indexOf(card));
  }, true);

  carousel.addEventListener("pointerenter", scheduleAutoplay);
  carousel.addEventListener("pointerleave", scheduleAutoplay);
  carousel.addEventListener("focusin", scheduleAutoplay);
  carousel.addEventListener("focusout", function () {
    window.setTimeout(scheduleAutoplay, 0);
  });
  document.addEventListener("visibilitychange", scheduleAutoplay);

  if (dialog) {
    if (dialogClose) dialogClose.addEventListener("click", function () { dialog.close(); });
    if (dialogPrevious) dialogPrevious.addEventListener("click", function () { goTo(currentIndex - 1, true); });
    if (dialogNext) dialogNext.addEventListener("click", function () { goTo(currentIndex + 1, true); });

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", scheduleAutoplay);
    dialog.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(currentIndex + 1, true);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(currentIndex - 1, true);
      }
    });
  }

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      scheduleAutoplay();
    }, { threshold: 0.1 });
    observer.observe(carousel);
  } else {
    visible = true;
  }

  if (reducedMotion && reducedMotion.addEventListener) {
    reducedMotion.addEventListener("change", function (event) {
      if (event.matches) autoplayEnabled = false;
      updateCarousel();
      scheduleAutoplay();
    });
  }

  updateCarousel();
  scheduleAutoplay();
})();
