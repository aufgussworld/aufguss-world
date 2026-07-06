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
    /* fallback: pokaż wszystkie warstwy scen */
    ["s1-survey", "s1-earth", "s1-buildings", "s1-road", "s1-siding", "s1-flag",
     "g-pit", "g-layers", "g-labels"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.opacity = 1;
    });
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

  /* ── SEKWENCJA 1: od łąki do bocznicy ─────────────────── */
  buildSequence("#realizacja", function (tl) {
    var drawIn = function (sel, dur, at) {
      document.querySelectorAll(sel).forEach(function (p) {
        var len = p.getTotalLength ? p.getTotalLength() : 1200;
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        tl.to(p, { strokeDashoffset: 0, duration: dur }, at);
      });
    };

    /* faza 0→1: projekt */
    tl.addLabel("survey", 0.5)
      .to("#s1-survey", { opacity: 1, duration: 0.6 }, "survey");
    drawIn("#s1-survey .draw path", 1.2, "survey+=0.2");
    tl.from("#s1-surveyors g", { opacity: 0, y: 20, duration: 0.5, stagger: 0.15 }, "survey+=0.3");

    /* faza 2: roboty ziemne */
    tl.addLabel("earth", 2.4)
      .to("#s1-survey", { opacity: 0.25, duration: 0.5 }, "earth")
      .to("#s1-earth", { opacity: 1, duration: 0.5 }, "earth")
      .from("#s1-earth path", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.9, stagger: 0.2 }, "earth")
      .from("#s1-digger", { x: 260, duration: 1.1 }, "earth+=0.2");

    /* faza 3: hale */
    tl.addLabel("build", 4.2)
      .to("#s1-survey", { opacity: 0, duration: 0.4 }, "build")
      .to("#s1-buildings", { opacity: 1, duration: 0.3 }, "build")
      .from("#s1-hall-a", { y: 130, opacity: 0, duration: 0.7 }, "build")
      .from("#s1-hall-b", { y: 150, opacity: 0, duration: 0.7 }, "build+=0.35")
      .from("#s1-hall-c", { y: 110, opacity: 0, duration: 0.6 }, "build+=0.7")
      .from("#s1-silo rect", { y: 90, opacity: 0, duration: 0.5, stagger: 0.12 }, "build+=1.0");

    /* faza 4: bocznica + drogi */
    tl.addLabel("siding", 6.0)
      .to("#s1-road", { opacity: 1, duration: 0.4 }, "siding")
      .from("#s1-parking", { opacity: 0, y: 30, duration: 0.5 }, "siding+=0.2")
      .to("#s1-siding", { opacity: 1, duration: 0.3 }, "siding+=0.4")
      .from("#s1-sleepers rect", { opacity: 0, duration: 0.02, stagger: 0.03 }, "siding+=0.5");
    drawIn("#s1-siding line.draw, #s1-switch path.draw", 1.0, "siding+=0.7");
    tl.from("#s1-buffer rect", { opacity: 0, scale: 0, transformOrigin: "50% 100%", duration: 0.3, stagger: 0.1 }, "siding+=1.5")
      .from("#s1-wagon", { x: -420, duration: 1.4, ease: "power1.out" }, "siding+=1.5")
      .to("#s1-flag", { opacity: 1, duration: 0.4 }, "siding+=2.4")
      .from("#s1-flag path", { scaleX: 0, transformOrigin: "0 50%", duration: 0.5 }, "siding+=2.5")
      .to({}, { duration: 0.8 }); /* oddech na końcu */
  });

  /* ── SEKWENCJA 2: przejazd GTP ────────────────────────── */
  buildSequence("#gtp", function (tl) {
    /* faza 0: stary przejazd — puls ostrzeżenia */
    tl.to("#g-old-warning", { opacity: 1, duration: 0.4 }, 0.5)
      .to("#g-old-warning", { opacity: 0.25, duration: 0.4 }, 1.0);

    /* faza 1: rozbiórka */
    tl.addLabel("demo", 1.8)
      .to("#g-old-warning", { opacity: 0, duration: 0.2 }, "demo")
      .to("#g-old-rails rect, #g-old-sleepers rect", { y: -260, opacity: 0, duration: 0.9, stagger: 0.08 }, "demo")
      .to("#g-old-cracks path", { opacity: 0, duration: 0.4 }, "demo+=0.3")
      .to("#g-old-asphalt rect", { opacity: 0, duration: 0.6 }, "demo+=0.5")
      .to("#g-pit", { opacity: 1, duration: 0.6 }, "demo+=0.8");

    /* faza 2: podbudowa */
    tl.addLabel("base", 3.6)
      .to("#g-layers", { opacity: 1, duration: 0.2 }, "base")
      .to("#g-labels", { opacity: 1, duration: 0.2 }, "base");
    ["#gl-1", "#gl-2", "#gl-3", "#gl-4"].forEach(function (id, i) {
      tl.from(id, { opacity: 0, y: 40, duration: 0.5 }, "base+=" + (0.2 + i * 0.45));
      tl.from("#lb-" + (i + 1), { opacity: 0, x: 30, duration: 0.4 }, "base+=" + (0.35 + i * 0.45));
    });

    /* faza 3: tor + płyty GTP */
    tl.addLabel("track", 5.8);
    ["#gl-5", "#gl-6", "#gl-7"].forEach(function (id, i) {
      tl.from(id, { opacity: 0, y: -60, duration: 0.55 }, "track+=" + (i * 0.5));
    });
    tl.from("#lb-5", { opacity: 0, x: 30, duration: 0.4 }, "track+=0.3");
    tl.from("#lb-6", { opacity: 0, x: 30, duration: 0.4 }, "track+=1.1");

    /* faza 4: asfalt + oznakowanie */
    tl.addLabel("finish", 7.6)
      .from("#gl-8 path", { scaleX: 0, transformOrigin: "0% 50%", duration: 0.8, stagger: 0.1 }, "finish")
      .from("#gl-8 line", { opacity: 0, duration: 0.4 }, "finish+=0.7")
      .from("#lb-8", { opacity: 0, x: 30, duration: 0.4 }, "finish+=0.6")
      .from("#gl-9 line, #gl-9 path", { opacity: 0, y: 60, duration: 0.6 }, "finish+=0.9")
      .from("#g-signal-lamp", { opacity: 0, scale: 0, transformOrigin: "center", duration: 0.4 }, "finish+=1.4")
      .to({}, { duration: 0.8 });
  });

  /* ── wideo (Seedance): podmiana scen po dograniu klipów ─ */
  document.querySelectorAll("video[data-src]").forEach(function (video) {
    var src = video.dataset.src;
    fetch(src, { method: "HEAD" }).then(function (r) {
      if (!r.ok) return;
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
