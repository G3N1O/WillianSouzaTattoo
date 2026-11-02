(function () {
  "use strict";

  var carousel = document.querySelector("[data-polaroid-carousel]");
  if (!carousel) return;

  var viewport = carousel.querySelector("[data-carousel-viewport]");
  var track = carousel.querySelector("[data-carousel-track]");
  var originalSlides = track
    ? Array.prototype.slice.call(track.querySelectorAll(".polaroid-carousel__slide"))
    : [];
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

  if (!viewport || !track || !originalSlides.length) return;

  var slideCount = originalSlides.length;
  var beforeClones = document.createDocumentFragment();
  var afterClones = document.createDocumentFragment();

  originalSlides.forEach(function (slide, index) {
    slide.dataset.carouselIndex = index;
    slide.dataset.carouselSet = "original";

    var beforeClone = slide.cloneNode(true);
    beforeClone.dataset.carouselIndex = index;
    beforeClone.dataset.carouselSet = "before";
    beforeClone.setAttribute("aria-hidden", "true");
    beforeClone.querySelector(".polaroid-card").tabIndex = -1;
    beforeClones.appendChild(beforeClone);

    var afterClone = slide.cloneNode(true);
    afterClone.dataset.carouselIndex = index;
    afterClone.dataset.carouselSet = "after";
    afterClone.setAttribute("aria-hidden", "true");
    afterClone.querySelector(".polaroid-card").tabIndex = -1;
    afterClones.appendChild(afterClone);
  });

  track.insertBefore(beforeClones, track.firstChild);
  track.appendChild(afterClones);

  var slides = Array.prototype.slice.call(track.querySelectorAll(".polaroid-carousel__slide"));
  var cards = slides.map(function (slide) { return slide.querySelector(".polaroid-card"); });
  var originalCards = originalSlides.map(function (slide) { return slide.querySelector(".polaroid-card"); });
  var reducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  var currentIndex = 0;
  var currentPhysicalIndex = slideCount;
  var autoplayEnabled = !reducedMotion || !reducedMotion.matches;
  var visible = false;
  var timer = null;
  var scrollFrame = null;
  var scrollEndTimer = null;
  var pointer = null;
  var suppressClick = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function wrapIndex(index) {
    return ((index % slideCount) + slideCount) % slideCount;
  }

  function getSlideLeft(slide) {
    return slide.offsetLeft - (viewport.clientWidth - slide.offsetWidth) / 2;
  }

  function getNearestPhysicalIndex() {
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

  function getNearestPhysicalForIndex(index, fromPhysicalIndex) {
    var logicalIndex = wrapIndex(index);
    var candidates = [
      logicalIndex,
      logicalIndex + slideCount,
      logicalIndex + slideCount * 2
    ];

    return candidates.reduce(function (nearest, candidate) {
      return Math.abs(candidate - fromPhysicalIndex) < Math.abs(nearest - fromPhysicalIndex)
        ? candidate
        : nearest;
    }, candidates[0]);
  }

  function updateAutoplayButton() {
    if (!autoplayButton) return;
    autoplayButton.textContent = autoplayEnabled ? "Pausar" : "Retomar";
    autoplayButton.setAttribute(
      "aria-label",
      autoplayEnabled ? "Pausar avanço automático" : "Retomar avanço automático"
    );
    autoplayButton.setAttribute("aria-pressed", autoplayEnabled ? "false" : "true");
  }

  function updateLightbox() {
    if (!dialog || !dialogImage) return;
    var image = originalSlides[currentIndex].querySelector("img");
    dialogImage.src = image.currentSrc || image.src;
    dialogImage.alt = image.alt;
    if (dialogStatus) dialogStatus.textContent = (currentIndex + 1) + " de " + slideCount;
  }

  function updateCarousel() {
    var viewportRect = viewport.getBoundingClientRect();
    var positions = slides.map(function (slide) {
      var rect = slide.getBoundingClientRect();
      var position = clamp((rect.left + rect.width / 2 - viewportRect.left) / viewportRect.width, 0, 1);
      return Math.sin(position * Math.PI) * 42;
    });

    slides.forEach(function (slide, index) {
      var cordDrop = positions[index];
      slide.style.setProperty("--cord-drop", cordDrop.toFixed(2) + "px");
      cards[index].setAttribute(
        "aria-current",
        slide.dataset.carouselSet === "original" && Number(slide.dataset.carouselIndex) === currentIndex
          ? "true"
          : "false"
      );
    });

    if (status) status.textContent = (currentIndex + 1) + " de " + slideCount;
    updateAutoplayButton();
    if (dialog && dialog.open) updateLightbox();
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
      goTo(currentIndex + 1, false);
    }, 5600);
  }

  function goTo(index, announce) {
    var logicalIndex = wrapIndex(index);
    var fromPhysicalIndex = getNearestPhysicalIndex();
    var targetPhysicalIndex = getNearestPhysicalForIndex(logicalIndex, fromPhysicalIndex);
    var targetSlide = slides[targetPhysicalIndex];

    currentIndex = logicalIndex;
    currentPhysicalIndex = targetPhysicalIndex;
    if (status) status.setAttribute("aria-live", announce ? "polite" : "off");

    viewport.scrollTo({
      left: getSlideLeft(targetSlide),
      behavior: reducedMotion && reducedMotion.matches ? "auto" : "smooth"
    });

    updateCarousel();
    scheduleAutoplay();
  }

  function settleScroll() {
    if (pointer) return;

    var nearestIndex = getNearestPhysicalIndex();
    var nearestSlide = slides[nearestIndex];
    currentPhysicalIndex = nearestIndex;
    currentIndex = Number(nearestSlide.dataset.carouselIndex);

    if (nearestSlide.dataset.carouselSet !== "original") {
      var originalSlide = originalSlides[currentIndex];
      currentPhysicalIndex = currentIndex + slideCount;
      viewport.scrollLeft = getSlideLeft(originalSlide);
    }

    carousel.classList.remove("is-scrolling");
    updateCarousel();
    scheduleAutoplay();
  }

  function scheduleScrollSettle() {
    if (scrollEndTimer !== null) window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(function () {
      scrollEndTimer = null;
      settleScroll();
    }, 140);
  }

  function openLightbox(index) {
    if (!dialog || typeof dialog.showModal !== "function") return;
    goTo(index, true);
    updateLightbox();
    dialog.showModal();
    scheduleAutoplay();
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
      autoplayEnabled = !autoplayEnabled;
      updateAutoplayButton();
      scheduleAutoplay();
    });
  }

  viewport.addEventListener("keydown", function (event) {
    var targetIndex = currentIndex;
    if (event.key === "ArrowRight") targetIndex += 1;
    else if (event.key === "ArrowLeft") targetIndex -= 1;
    else if (event.key === "Home") targetIndex = 0;
    else if (event.key === "End") targetIndex = slideCount - 1;
    else return;

    event.preventDefault();
    goTo(targetIndex, true);
    if (event.target.matches(".polaroid-card")) originalCards[currentIndex].focus();
  });

  viewport.addEventListener("scroll", function () {
    carousel.classList.add("is-scrolling");
    if (scrollFrame === null) {
      scrollFrame = window.requestAnimationFrame(function () {
        scrollFrame = null;
        currentPhysicalIndex = getNearestPhysicalIndex();
        currentIndex = Number(slides[currentPhysicalIndex].dataset.carouselIndex);
        updateCarousel();
      });
    }
    scheduleScrollSettle();
  }, { passive: true });

  if ("onscrollend" in viewport) {
    viewport.addEventListener("scrollend", function () {
      if (scrollEndTimer !== null) {
        window.clearTimeout(scrollEndTimer);
        scrollEndTimer = null;
      }
      settleScroll();
    });
  }

  viewport.addEventListener("pointerdown", function (event) {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    pointer = {
      id: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
      startScroll: viewport.scrollLeft,
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
    carousel.classList.add("is-dragging", "is-scrolling");
    viewport.scrollLeft = pointer.startScroll - delta;

    var now = performance.now();
    var elapsed = Math.max(now - pointer.lastTime, 1);
    var velocity = (event.clientX - pointer.lastX) / elapsed;
    pointer.velocity = pointer.velocity * 0.65 + velocity * 0.35;

    var swing = clamp(pointer.velocity * -5, -12, 12);
    var viewportRect = viewport.getBoundingClientRect();
    var influences = slides.map(function (slide) {
      var rect = slide.getBoundingClientRect();
      var distance = Math.abs(rect.left + rect.width / 2 - event.clientX) / viewportRect.width;
      return clamp(1 - distance, 0, 1);
    });

    cards.forEach(function (card, index) {
      card.style.setProperty("--swing-angle", (swing * influences[index]).toFixed(2) + "deg");
    });

    pointer.lastX = event.clientX;
    pointer.lastTime = now;
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
      var nearestSlide = slides[getNearestPhysicalIndex()];
      goTo(Number(nearestSlide.dataset.carouselIndex), true);
    } else {
      settleScroll();
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
    var slide = card.closest(".polaroid-carousel__slide");
    openLightbox(Number(slide.dataset.carouselIndex));
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

  viewport.scrollLeft = getSlideLeft(originalSlides[0]);
  updateCarousel();
  scheduleAutoplay();
})();
