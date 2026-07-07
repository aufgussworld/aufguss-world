/* ═══════════════════════════════════════════════════════════
   RIKIT — Kolej na nas…  |  cinematic scroll engine
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

  /* ── typing motta ─────────────────────────────────────── */
  function typeText(el, text, speed, done) {
    if (!el) return;
    if (reduced) { el.textContent = text; if (done) done(); return; }
    var i = 0;
    (function tick() {
      el.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, speed);
      else if (done) done();
    })();
  }

  /* ── preloader ────────────────────────────────────────── */
  var pre = document.getElementById("preloader");
  var seen = sessionStorage.getItem("rikit-preloaded");
  function closePreloader() {
    if (!pre) return;
    pre.classList.add("is-done");
    sessionStorage.setItem("rikit-preloaded", "1");
    setTimeout(function () { pre.classList.add("is-removed"); }, 800);
  }
  if (pre && !reduced && !seen) {
    typeText(document.getElementById("preloader-motto"), "Kolej na nas…", 70, function () {
      setTimeout(closePreloader, 500);
    });
    setTimeout(closePreloader, 4200); /* bezpiecznik */
  } else if (pre) {
    pre.classList.add("is-done", "is-removed");
  }

  typeText(document.getElementById("hero-motto"), "Kolej na nas…", 90);

  /* ── smooth scroll (Lenis) ────────────────────────────── */
  var lenis = null;
  if (!reduced && typeof Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1.0 });
    window.__lenis = lenis;
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var target = document.querySelector(a.getAttribute("href"));
        if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: 0 }); }
      });
    });
  }

  /* ── header show/hide + solid ─────────────────────────── */
  var header = document.getElementById("header");
  var lastY = 0;
  function onScrollHeader() {
    var y = window.scrollY;
    header.classList.toggle("is-solid", y > 40);
    header.classList.toggle("is-hidden", y > 600 && y > lastY + 4);
    if (y < lastY - 4) header.classList.remove("is-hidden");
    lastY = y;
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ── kmrail: postęp + aktywna stacja ──────────────────── */
  var railFill = document.getElementById("kmrail-fill");
  var stops = Array.prototype.slice.call(document.querySelectorAll(".kmrail__stop"));
  var sections = stops.map(function (s) { return document.querySelector(s.getAttribute("href")); });
  function onScrollRail() {
    var doc = document.documentElement;
    var p = doc.scrollTop / (doc.scrollHeight - doc.clientHeight);
    if (railFill) railFill.style.height = (p * 100).toFixed(2) + "%";
    var mid = window.innerHeight * 0.5, active = 0;
    sections.forEach(function (sec, i) {
      if (sec && sec.getBoundingClientRect().top <= mid) active = i;
    });
    stops.forEach(function (s, i) { s.classList.toggle("is-active", i === active); });
    document.body.classList.toggle("contact-mode",
      sections[5] && sections[5].getBoundingClientRect().top <= mid);
  }
  window.addEventListener("scroll", onScrollRail, { passive: true });
  onScrollRail();

  /* ── kontakt: motto przy wejściu w viewport ───────────── */
  var contactTyped = false;
  var contactObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting && !contactTyped) {
        contactTyped = true;
        typeText(document.getElementById("contact-motto"), "Kolej na nas…", 80);
        contactObs.disconnect();
      }
    });
  }, { threshold: 0.4 });
  var contactEl = document.getElementById("kontakt");
  if (contactEl) contactObs.observe(contactEl);

  /* ── reveal ───────────────────────────────────────────── */
  var revObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("is-in"); revObs.unobserve(en.target); }
    });
  }, { threshold: 0.18 });
  document.querySelectorAll(".reveal").forEach(function (el) { revObs.observe(el); });

  if (!hasGsap || reduced) {
    /* fallback: pokaż finalne klatki sekwencji */
    document.querySelectorAll(".seq__frame").forEach(function (f) { f.style.opacity = 1; });
    document.querySelectorAll(".seq__step").forEach(function (s) { s.classList.add("is-active"); });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.lagSmoothing(0);
  }

  /* ── hero intro ───────────────────────────────────────── */
  gsap.from(".hero__line", { yPercent: 110, duration: 1.1, stagger: 0.12, ease: "power3.out", delay: seen ? 0.2 : 1.6 });
  gsap.from(".hero__sub, .hero__eyebrow", { opacity: 0, y: 18, duration: 0.9, stagger: 0.1, delay: seen ? 0.5 : 1.9 });

  /* ── manifest: word-by-word ───────────────────────────── */
  var words = document.querySelectorAll("#manifest-text .w");
  if (words.length) {
    ScrollTrigger.create({
      trigger: "#manifest",
      start: "top 75%",
      end: "bottom 60%",
      scrub: 0.4,
      onUpdate: function (self) {
        var n = Math.floor(self.progress * words.length);
        words.forEach(function (w, i) { w.classList.toggle("is-on", i <= n); });
      }
    });
  }

  /* ── services: pociąg jedzie po trasie ────────────────── */
  var train = document.getElementById("services-train");
  if (train) {
    gsap.to(train, {
      left: "calc(100% - 46px)",
      ease: "none",
      scrollTrigger: { trigger: ".services", start: "top 70%", end: "bottom 40%", scrub: 0.6 }
    });
  }

  /* ── generator sekwencji pinned-scrub ─────────────────── */
  function buildSequence(sectionSel, timelineFn) {
    var section = document.querySelector(sectionSel);
    if (!section) return;
    var steps = section.querySelectorAll(".seq__step");
    var dots = section.querySelectorAll(".seq__dots i");
    var mult = parseFloat(section.dataset.end) || 3.5;
    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: function () { return "+=" + Math.round(window.innerHeight * mult); },
        pin: section.querySelector(".seq__pin"),
        scrub: 0.7,
        anticipatePin: 1,
        onUpdate: function (self) {
          var idx = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
          steps.forEach(function (s, i) { s.classList.toggle("is-active", i === idx); });
          dots.forEach(function (d, i) { d.classList.toggle("is-on", i <= idx); });
        }
      }
    });
    timelineFn(tl, section);
    return tl;
  }

  /* ── SEKWENCJE: crossfade klatek kluczowych ───────────── */
  function crossfadeFrames(tl, section) {
    var frames = section.querySelectorAll(".seq__frame");
    tl.fromTo(frames, { scale: 1.04 }, { scale: 1.0, duration: 10 }, 0);
    frames.forEach(function (f, i) {
      if (i === 0) return;
      tl.to(f, { opacity: 1, duration: 0.8 }, i * 2.7 - 0.4);
    });
  }
  buildSequence("#realizacja", crossfadeFrames);
  buildSequence("#gtp", crossfadeFrames);

  /* ── wideo: podmiana scen po dograniu klipów ─ */
  var wantsVideo = window.matchMedia("(min-width: 900px)").matches &&
    !(navigator.connection && navigator.connection.saveData);
  if (!wantsVideo) return;
  document.querySelectorAll("video[data-src]").forEach(function (video) {
    var src = video.dataset.src;
    fetch(src, { method: "HEAD" }).then(function (r) {
      if (!r.ok) return;
      video.preload = "auto";
      video.src = src;
      video.load();
      video.addEventListener("loadedmetadata", function () {
        var host = video.closest(".seq") || video.closest(".hero");
        if (!host) return;
        host.classList.add("has-video");
        if (host.classList.contains("hero")) {
          video.play().catch(function () {});
        } else {
          /* scrub currentTime zamiast sceny SVG */
          ScrollTrigger.create({
            trigger: host,
            start: "top top",
            end: function () { return "+=" + Math.round(window.innerHeight * (parseFloat(host.dataset.end) || 3.5)); },
            scrub: true,
            onUpdate: function (self) {
              if (video.duration) video.currentTime = video.duration * self.progress;
            }
          });
        }
      });
    }).catch(function () {});
  });

  /* refresh po załadowaniu fontów (wysokości sekcji) */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
