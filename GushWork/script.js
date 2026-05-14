function setupNav(root) {
  // Prevent double-initialization if this function is called twice for the same root.
  if (root && root.dataset && root.dataset.navInit === "true") return;
  if (root && root.dataset) root.dataset.navInit = "true";

  const toggle = root.querySelector(".nav-toggle");
  const menu = root.querySelector(".nav-menu");
  const dropdownTrigger = root.querySelector(
    ".nav-item--dropdown > .nav-link--btn",
  );
  const dropdownItem = root.querySelector(".nav-item--dropdown");

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (root.contains(e.target)) return;
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  // Close mobile menu when clicking a link
  root.querySelectorAll(".nav-menu a").forEach((a) => {
    a.addEventListener("click", () => {
      if (!menu) return;
      menu.classList.remove("is-open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    });
  });

  // Dropdown: click-to-toggle for keyboard + mobile
  if (dropdownTrigger && dropdownItem) {
    dropdownTrigger.addEventListener("click", () => {
      const isOpen = dropdownItem.getAttribute("data-open") === "true";
      dropdownItem.setAttribute("data-open", String(!isOpen));
      dropdownTrigger.setAttribute("aria-expanded", String(!isOpen));
    });

    document.addEventListener("click", (e) => {
      if (!dropdownItem.contains(e.target)) {
        dropdownItem.removeAttribute("data-open");
        dropdownTrigger.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        dropdownItem.removeAttribute("data-open");
        dropdownTrigger.setAttribute("aria-expanded", "false");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const mainHeader = document.getElementById("mainHeader");
  if (mainHeader) setupNav(mainHeader);

  // Sticky header: show after crossing the first fold (hero) and hide when scrolling back up.
  const stickyHeader = document.getElementById("stickyHeader");
  if (stickyHeader) {
    setupNav(stickyHeader);

    const firstFold = document.querySelector(".product-hero");

    const computeVisible = () => {
      if (firstFold) return firstFold.getBoundingClientRect().bottom <= 0;
      return window.scrollY > window.innerHeight;
    };

    const syncSticky = () => {
      const visible = computeVisible();
      stickyHeader.classList.toggle("is-visible", visible);
      stickyHeader.setAttribute("aria-hidden", String(!visible));
    };

    let raf = 0;
    const scheduleSync = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        syncSticky();
      });
    };

    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);
    syncSticky();
  }

  // Applications horizontal carousel
  const appsTrack = document.getElementById("appsTrack");
  if (appsTrack) {
    const prev = document.querySelector(".apps-arrow--prev");
    const next = document.querySelector(".apps-arrow--next");
    const getCardLefts = () =>
      Array.from(appsTrack.querySelectorAll(".apps-card"), (el) =>
        Math.round(el.offsetLeft),
      );

    const scrollToIndex = (nextIndex) => {
      const lefts = getCardLefts();
      if (lefts.length === 0) return;
      const clamped = Math.max(0, Math.min(nextIndex, lefts.length - 1));
      appsTrack.scrollTo({ left: lefts[clamped], behavior: "smooth" });
    };

    const getNearestIndex = () => {
      const lefts = getCardLefts();
      if (lefts.length === 0) return 0;
      const x = appsTrack.scrollLeft;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < lefts.length; i += 1) {
        const d = Math.abs(lefts[i] - x);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    };

    const step = (dir) => scrollToIndex(getNearestIndex() + dir);

    if (prev) prev.addEventListener("click", () => step(-1));
    if (next) next.addEventListener("click", () => step(1));
  }

  // Testimonials: auto-advance carousel + initial offset (as per design)
  const testimonialsTrack = document.querySelector(".testimonials-track");
  if (testimonialsTrack) {
    const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const getCards = () =>
      Array.from(testimonialsTrack.querySelectorAll(".testimonial-card"));

    // Continuous auto-scroll marquee (loops seamlessly by duplicating the list once).
    let rafId = 0;
    let running = false;
    let lastTs = 0;
    let wrapAt = 0;
    let resumeTimeout = 0;

    const pause = () => {
      running = false;
      testimonialsTrack.classList.remove("is-autoscrolling");
      window.cancelAnimationFrame(rafId);
      rafId = 0;
      window.clearTimeout(resumeTimeout);
    };

    const tick = (ts) => {
      if (!running) return;
      const dt = ts - lastTs;
      lastTs = ts;

      // Speed tuned to match the Figma-like gentle motion (~30px/sec).
      const speedPxPerSec = 30;
      testimonialsTrack.scrollLeft += (speedPxPerSec * dt) / 1000;

      if (wrapAt > 0 && testimonialsTrack.scrollLeft >= wrapAt) {
        testimonialsTrack.scrollLeft -= wrapAt;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const resume = () => {
      if (reduceMotion) return;
      if (running) return;
      running = true;
      testimonialsTrack.classList.add("is-autoscrolling");
      lastTs = performance.now();
      rafId = window.requestAnimationFrame(tick);
    };

    const scheduleResume = () => {
      pause();
      resumeTimeout = window.setTimeout(resume, 1200);
    };

    window.requestAnimationFrame(() => {
      const cards = getCards();
      if (cards.length < 2) return;

      // Create one duplicate sequence for seamless looping.
      const frag = document.createDocumentFragment();
      cards.forEach((card) => frag.appendChild(card.cloneNode(true)));
      testimonialsTrack.appendChild(frag);
      wrapAt = testimonialsTrack.scrollWidth / 2;

      // Slight initial offset to show a partial card, as in the design.
      const first = cards[0];
      if (first) {
        const step = first.getBoundingClientRect().width;
        testimonialsTrack.scrollLeft = Math.max(0, step * 0.55);
      }

      if (!reduceMotion) resume();
    });

    window.addEventListener("resize", () => {
      if (wrapAt > 0) wrapAt = testimonialsTrack.scrollWidth / 2;
    });

    testimonialsTrack.addEventListener("pointerenter", pause);
    testimonialsTrack.addEventListener("pointerleave", scheduleResume);
    testimonialsTrack.addEventListener("wheel", scheduleResume, {
      passive: true,
    });
    testimonialsTrack.addEventListener("touchstart", scheduleResume, {
      passive: true,
    });
    testimonialsTrack.addEventListener("pointerdown", scheduleResume);
    testimonialsTrack.addEventListener("focusin", scheduleResume);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pause();
      else resume();
    });
  }

  // Process tabs + media
  const processMediaImg = document.getElementById("processMediaImg");
  const processTitle = document.getElementById("processStepTitle");
  const processText = document.getElementById("processStepText");
  const processBullets = document.getElementById("processBullets");
  const processChip = document.getElementById("processStepChip");
  const processTabs = Array.from(document.querySelectorAll(".process-tab"));
  const processPrev = document.querySelector(".process-media-arrow--prev");
  const processNext = document.querySelector(".process-media-arrow--next");
  const processMobilePrev = document.querySelector(".process-mobile-btn--prev");
  const processMobileNext = document.querySelector(".process-mobile-btn--next");

  if (
    processMediaImg &&
    processTitle &&
    processText &&
    processBullets &&
    processTabs.length
  ) {
    const steps = {
      raw: {
        title: "High-Grade Raw Material Selection",
        text: "Vacuum sizing tanks ensure precise outer diameter while internal pressure maintains perfect roundness and wall thickness uniformity.",
        bullets: [
          "PE100 grade material",
          "Optimal molecular weight distribution",
        ],
        img: "Asset/Frame-1.png",
      },
      extrusion: {
        title: "Precision Extrusion",
        text: "Controlled extrusion ensures uniform melt flow and consistent pipe geometry for optimal strength and performance.",
        bullets: [
          "Stable melt temperature control",
          "Uniform wall thickness formation",
        ],
        img: "Asset/Frame-2.jpg",
      },
      cooling: {
        title: "Controlled Cooling",
        text: "Gradual cooling stabilizes the pipe structure, minimizing internal stresses and preserving dimensional accuracy.",
        bullets: [
          "Reduced residual stresses",
          "Enhanced dimensional stability",
        ],
        img: "Asset/Frame-3.jpg",
      },
      sizing: {
        title: "Accurate Sizing",
        text: "Sizing calibration maintains roundness and ensures each pipe meets strict diameter and tolerance requirements.",
        bullets: ["Tight tolerance control", "Consistent outer diameter"],
        img: "Asset/Frame-1.png",
      },
      qc: {
        title: "In-Process Quality Control",
        text: "Continuous checks verify compliance with specifications, ensuring reliability across all operating conditions.",
        bullets: [
          "Surface & dimensional inspection",
          "Pressure and material checks",
        ],
        img: "Asset/Frame-2.jpg",
      },
      marking: {
        title: "Permanent Marking",
        text: "Clear, durable markings provide traceability for standards, batch information, and manufacturing details.",
        bullets: ["Batch traceability", "Standard compliance labeling"],
        img: "Asset/Frame-3.jpg",
      },
      cutting: {
        title: "Precision Cutting",
        text: "Automated cutting delivers clean ends and accurate lengths for faster installation and better jointing.",
        bullets: ["Accurate length control", "Clean cut edges"],
        img: "Asset/Frame-1.png",
      },
      packaging: {
        title: "Safe Packaging",
        text: "Protective packaging prevents handling damage and keeps pipes in optimal condition during transport.",
        bullets: ["Damage-resistant handling", "Efficient logistics stacking"],
        img: "Asset/Frame-2.jpg",
      },
    };

    const stepKeys = processTabs.map((t) => t.dataset.step).filter(Boolean);
    let activeIndex = 0;

    const setActive = (keyOrIndex) => {
      const key =
        typeof keyOrIndex === "number"
          ? stepKeys[(keyOrIndex + stepKeys.length) % stepKeys.length]
          : keyOrIndex;
      activeIndex = stepKeys.indexOf(key);
      const data = steps[key] || steps.raw;
      const labelEl = processTabs.find((t) => t.dataset.step === key);
      const label = labelEl ? labelEl.textContent.trim().replace(/\s+/g, " ") : "";

      processTabs.forEach((t) => {
        const isActive = t.dataset.step === key;
        t.classList.toggle("is-active", isActive);
        t.setAttribute("aria-selected", String(isActive));
      });

      processTitle.textContent = data.title;
      processText.textContent = data.text;
      processBullets.innerHTML = data.bullets
        .map((b) => `<li>${b}</li>`)
        .join("");
      processMediaImg.src = data.img;

      if (processChip) {
        processChip.textContent = `Step ${activeIndex + 1}/${stepKeys.length}: ${label}`;
      }
    };

    processTabs.forEach((t) => {
      t.addEventListener("click", () => setActive(t.dataset.step));
    });

    if (processPrev)
      processPrev.addEventListener("click", () => setActive(activeIndex - 1));
    if (processNext)
      processNext.addEventListener("click", () => setActive(activeIndex + 1));
    if (processMobilePrev)
      processMobilePrev.addEventListener("click", () =>
        setActive(activeIndex - 1),
      );
    if (processMobileNext)
      processMobileNext.addEventListener("click", () =>
        setActive(activeIndex + 1),
      );

    setActive(stepKeys[0] || "raw");
  }

  // FAQ accordion
  document.querySelectorAll(".faq-item .faq-q").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      if (!item) return;
      const answer = item.querySelector(".faq-a");
      const isOpen = item.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(isOpen));
      if (answer) answer.hidden = !isOpen;
    });
  });

  // FAQ catalogue request form (simple validation)
  const catalogueForm = document.getElementById("catalogueForm");
  if (catalogueForm) {
    const email = catalogueForm.querySelector('input[name="email"]');
    const submit = catalogueForm.querySelector('button[type="submit"]');
    const isValidEmail = (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

    const sync = () => {
      if (!email || !submit) return;
      submit.disabled = !isValidEmail(email.value);
    };

    if (email) {
      email.addEventListener("input", sync);
      email.addEventListener("blur", sync);
      sync();
    }

    catalogueForm.addEventListener("submit", (e) => {
      e.preventDefault();
      sync();
      if (submit && submit.disabled) return;
      email.value = "";
      sync();
    });
  }

  // Brochure modal (triggered from "Download Full Technical Datasheet")
  const openModalBtn = document.getElementById("openBrochureModal");
  const overlay = document.getElementById("brochureOverlay");
  const modal = document.getElementById("brochureModal");
  const closeModalBtn = document.getElementById("closeBrochureModal");
  const brochureForm = document.getElementById("brochureForm");

  const openModal = () => {
    if (!overlay || !modal) return;
    overlay.hidden = false;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    const firstInput = modal.querySelector("input");
    if (firstInput) firstInput.focus();
  };

  const closeModal = () => {
    if (!overlay || !modal) return;
    overlay.hidden = true;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (openModalBtn) openModalBtn.focus();
  };

  if (openModalBtn) openModalBtn.addEventListener("click", openModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (overlay) overlay.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!modal || modal.hidden) return;
    closeModal();
  });

  if (brochureForm) {
    const emailInput = brochureForm.querySelector('input[name="email"]');
    const submitBtn = brochureForm.querySelector('button[type="submit"]');
    const isValidEmail = (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

    const syncSubmit = () => {
      if (!emailInput || !submitBtn) return;
      submitBtn.disabled = !isValidEmail(emailInput.value);
    };

    if (emailInput) {
      emailInput.addEventListener("input", syncSubmit);
      emailInput.addEventListener("blur", syncSubmit);
      syncSubmit();
    }

    brochureForm.addEventListener("submit", (e) => {
      e.preventDefault();
      syncSubmit();
      if (submitBtn && submitBtn.disabled) return;
      // TODO: hook this up to real download/email flow when backend is ready.
      closeModal();
    });
  }

  // Callback modal (triggered from "Request a Quote")
  const openCallbackBtn = document.getElementById("openCallbackModal");
  const callbackOverlay = document.getElementById("callbackOverlay");
  const callbackModal = document.getElementById("callbackModal");
  const closeCallbackBtn = document.getElementById("closeCallbackModal");
  const callbackForm = document.getElementById("callbackForm");

  const openCallback = () => {
    if (!callbackOverlay || !callbackModal) return;
    callbackOverlay.hidden = false;
    callbackModal.hidden = false;
    callbackModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    const firstInput = callbackModal.querySelector("input");
    if (firstInput) firstInput.focus();
  };

  const closeCallback = () => {
    if (!callbackOverlay || !callbackModal) return;
    callbackOverlay.hidden = true;
    callbackModal.hidden = true;
    callbackModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (openCallbackBtn) openCallbackBtn.focus();
  };

  if (openCallbackBtn) openCallbackBtn.addEventListener("click", openCallback);
  if (closeCallbackBtn)
    closeCallbackBtn.addEventListener("click", closeCallback);
  if (callbackOverlay) callbackOverlay.addEventListener("click", closeCallback);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (callbackModal && !callbackModal.hidden) closeCallback();
  });

  if (callbackForm) {
    const nameInput = callbackForm.querySelector('input[name="name"]');
    const emailInput = callbackForm.querySelector('input[name="email"]');
    const submitBtn = callbackForm.querySelector('button[type="submit"]');
    const isValidEmail = (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

    const syncSubmit = () => {
      if (!nameInput || !emailInput || !submitBtn) return;
      const ok =
        String(nameInput.value).trim().length > 1 &&
        isValidEmail(emailInput.value);
      submitBtn.disabled = !ok;
    };

    if (nameInput) nameInput.addEventListener("input", syncSubmit);
    if (emailInput) emailInput.addEventListener("input", syncSubmit);
    syncSubmit();

    callbackForm.addEventListener("submit", (e) => {
      e.preventDefault();
      syncSubmit();
      if (submitBtn && submitBtn.disabled) return;
      closeCallback();
    });
  }

  // Contact CTA form (inline)
  const contactCtaForm = document.getElementById("contactCtaForm");
  if (contactCtaForm) {
    const nameInput = contactCtaForm.querySelector('input[name="fullName"]');
    const companyInput = contactCtaForm.querySelector('input[name="company"]');
    const emailInput = contactCtaForm.querySelector('input[name="email"]');
    const phoneInput = contactCtaForm.querySelector('input[name="phone"]');
    const submitBtn = contactCtaForm.querySelector('button[type="submit"]');

    const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
    const isValidPhone = (value) => String(value).replace(/[^\d]/g, "").length >= 10;

    const sync = () => {
      if (!submitBtn) return;
      const ok =
        nameInput && String(nameInput.value).trim().length > 1 &&
        companyInput && String(companyInput.value).trim().length > 1 &&
        emailInput && isValidEmail(emailInput.value) &&
        phoneInput && isValidPhone(phoneInput.value);
      submitBtn.disabled = !ok;
    };

    [nameInput, companyInput, emailInput, phoneInput].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", sync);
      el.addEventListener("blur", sync);
    });
    sync();

    contactCtaForm.addEventListener("submit", (e) => {
      e.preventDefault();
      sync();
      if (submitBtn && submitBtn.disabled) return;
      contactCtaForm.reset();
      sync();
    });
  }

  const carouselImage = document.getElementById("carouselImage");
  const thumbsRoot = document.getElementById("carouselThumbs");
  if (carouselImage && thumbsRoot) {
    const stage = carouselImage.closest(".carousel-stage");
    const figure = carouselImage.closest(".carousel-figure");
    const zoomLens = document.getElementById("zoomLens");
    const zoomPreview = document.getElementById("zoomPreview");

    const images = [
      "Asset/Frame-1.png",
      "Asset/Frame-2.jpg",
      "Asset/Frame-3.jpg",
    ];

    let index = 0;
    const totalThumbSlots = 6;
    let activeThumbSlot = 0;

    const renderThumbs = () => {
      thumbsRoot.innerHTML = "";
      for (let i = 0; i < totalThumbSlots; i += 1) {
        const mappedIndex = i % images.length;
        const src = images[mappedIndex];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "thumb";
        btn.setAttribute("role", "listitem");
        btn.setAttribute("aria-label", `View image ${mappedIndex + 1}`);
        btn.setAttribute(
          "aria-current",
          i === activeThumbSlot ? "true" : "false",
        );

        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.loading = "lazy";
        btn.appendChild(img);

        btn.addEventListener("click", () => {
          setActiveSlot(i);
        });
        thumbsRoot.appendChild(btn);
      }
    };

    const setActiveSlot = (slot) => {
      activeThumbSlot = (slot + totalThumbSlots) % totalThumbSlots;
      index = activeThumbSlot % images.length;
      carouselImage.src = images[index];
      if (zoomPreview)
        zoomPreview.style.backgroundImage = `url("${images[index]}")`;
      renderThumbs();
    };

    const prevBtn = document.querySelector(".carousel-arrow--prev");
    const nextBtn = document.querySelector(".carousel-arrow--next");

    if (prevBtn)
      prevBtn.addEventListener("click", () =>
        setActiveSlot(activeThumbSlot - 1),
      );
    if (nextBtn)
      nextBtn.addEventListener("click", () =>
        setActiveSlot(activeThumbSlot + 1),
      );

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") setActiveSlot(activeThumbSlot - 1);
      if (e.key === "ArrowRight") setActiveSlot(activeThumbSlot + 1);
    });

    activeThumbSlot = 0;
    setActiveSlot(0);

    // Hover zoom (mouse only)
    if (figure && zoomLens && zoomPreview) {
      const lensSize = 46;

      const setZoomVisible = (visible) => {
        zoomLens.style.display = visible ? "flex" : "none";
        zoomPreview.style.display = visible ? "block" : "none";
        zoomLens.setAttribute("aria-hidden", String(!visible));
        zoomPreview.setAttribute("aria-hidden", String(!visible));
      };

      const updateZoom = (clientX, clientY) => {
        const rect = figure.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const half = lensSize / 2;
        const clampedX = Math.min(Math.max(x, half), rect.width - half);
        const clampedY = Math.min(Math.max(y, half), rect.height - half);

        zoomLens.style.left = `${clampedX - half}px`;
        zoomLens.style.top = `${clampedY - half}px`;

        const px = (clampedX / rect.width) * 100;
        const py = (clampedY / rect.height) * 100;
        zoomPreview.style.backgroundPosition = `${px}% ${py}%`;
      };

      figure.addEventListener("pointerenter", (e) => {
        if (e.pointerType && e.pointerType !== "mouse") return;
        zoomPreview.style.backgroundImage = `url("${images[index]}")`;
        setZoomVisible(true);
      });

      figure.addEventListener("pointerleave", (e) => {
        if (e.pointerType && e.pointerType !== "mouse") return;
        setZoomVisible(false);
      });

      figure.addEventListener("pointermove", (e) => {
        if (e.pointerType && e.pointerType !== "mouse") return;
        updateZoom(e.clientX, e.clientY);
      });

      setZoomVisible(false);
    }
  }
});
