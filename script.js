(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  root.classList.add("js");

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Sequência de entrada do hero ---------- */
  function start() {
    requestAnimationFrame(function () {
      document.body.classList.add("is-loaded");
    });
  }
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 900); })]).then(start);
  } else {
    start();
  }

  /* ---------- Revelação ao rolar (com escalonamento por grupo) ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    // escalona irmãos que entram juntos
    var groups = new Map();
    reveals.forEach(function (el) {
      var p = el.parentElement;
      var i = groups.get(p) || 0;
      if (!el.classList.contains("project")) el.style.setProperty("--d", Math.min(i * 0.08, 0.4) + "s");
      groups.set(p, i + 1);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Projetos: abrir/fechar detalhes ---------- */
  document.querySelectorAll(".project").forEach(function (project) {
    var btn = project.querySelector(".project__toggle");
    var panel = project.querySelector(".project__details");
    var media = project.querySelector(".project__media");
    if (!btn || !panel) return;

    function toggle() {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      btn.textContent = open ? "Ver detalhes" : "Fechar detalhes";
      panel.classList.toggle("is-open", !open);
    }
    btn.addEventListener("click", toggle);
    if (media) {
      media.setAttribute("data-cursor", "Detalhes");
      media.addEventListener("click", toggle);
    }
  });

  /* ---------- Órbita da stack: monta os itens ---------- */
  document.querySelectorAll(".orbit__ring").forEach(function (ring) {
    var items = (ring.getAttribute("data-items") || "").split(",");
    var offset = Math.random() * 360;
    items.forEach(function (name, i) {
      var el = document.createElement("span");
      el.className = "orbit__item";
      el.textContent = name.trim();
      el.style.setProperty("--a", (offset + (360 / items.length) * i) + "deg");
      ring.appendChild(el);
    });
  });

  function sizeOrbit() {
    document.querySelectorAll(".orbit__ring").forEach(function (ring) {
      ring.style.setProperty("--r", ring.offsetWidth / 2 + "px");
    });
  }
  sizeOrbit();
  window.addEventListener("resize", sizeOrbit);

  /* ---------- Tudo que depende da posição do scroll ---------- */
  var header = document.querySelector(".header");
  var progress = document.querySelector(".progress span");
  var photo = document.querySelector(".hero__photo img");
  var timeline = document.querySelector(".timeline");
  var jobs = timeline ? timeline.querySelectorAll(".job") : [];
  var orbit = document.querySelector(".orbit");
  var navLinks = document.querySelectorAll(".nav a[href^='#']");
  var sections = Array.prototype.map.call(navLinks, function (a) {
    return document.querySelector(a.getAttribute("href"));
  });

  var lastY = window.scrollY;
  var ticking = false;

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function onScroll() {
    var y = window.scrollY;
    var vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;

    // barra de progresso
    if (progress) progress.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);

    // header: fica sólido depois do topo; some ao descer e volta ao subir
    if (header) {
      header.classList.toggle("is-solid", y > 40);
      header.classList.toggle("is-hidden", y > 400 && y > lastY + 4);
      if (y < lastY - 4) header.classList.remove("is-hidden");
    }

    if (!reduce) {
      // parallax leve da foto
      if (photo && y < vh * 1.2) {
        photo.parentElement.style.setProperty("--py", (y * 0.12).toFixed(1) + "px");
      }

      // linha do tempo desenhada conforme a leitura
      if (timeline) {
        var r = timeline.getBoundingClientRect();
        var t = clamp((vh * 0.6 - r.top) / r.height, 0, 1);
        timeline.style.setProperty("--tl", t.toFixed(4));
        jobs.forEach(function (job) {
          var jr = job.getBoundingClientRect();
          job.classList.toggle("is-passed", jr.top + 10 < vh * 0.6);
        });
      }

      // órbita gira com o scroll
      if (orbit) {
        var orr = orbit.getBoundingClientRect();
        if (orr.bottom > 0 && orr.top < vh) {
          var spin = (vh - orr.top) * 0.18;
          orbit.style.setProperty("--spin", spin.toFixed(2));
        }
      }
    } else if (timeline) {
      timeline.style.setProperty("--tl", 1);
      jobs.forEach(function (job) { job.classList.add("is-passed"); });
    }

    // link ativo na navegação
    var current = -1;
    sections.forEach(function (s, i) {
      if (s && s.getBoundingClientRect().top < vh * 0.4) current = i;
    });
    navLinks.forEach(function (a, i) { a.classList.toggle("is-active", i === current); });

    lastY = y;
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();

  /* ---------- Cursor + luz que segue o mouse (só desktop) ---------- */
  if (!finePointer || reduce) return;

  document.body.classList.add("has-cursor");
  var cursor = document.querySelector(".cursor");
  var label = cursor.querySelector(".cursor__label");
  var cx = -100, cy = -100, tx = -100, ty = -100;

  window.addEventListener("pointermove", function (e) {
    tx = e.clientX;
    ty = e.clientY;
  }, { passive: true });

  (function follow() {
    cx += (tx - cx) * 0.22;
    cy += (ty - cy) * 0.22;
    cursor.style.setProperty("--cx", cx.toFixed(1) + "px");
    cursor.style.setProperty("--cy", cy.toFixed(1) + "px");
    requestAnimationFrame(follow);
  })();

  document.addEventListener("pointerover", function (e) {
    var labelled = e.target.closest("[data-cursor]");
    var link = e.target.closest("a, button");
    cursor.classList.toggle("is-label", !!labelled);
    cursor.classList.toggle("is-link", !labelled && !!link);
    label.textContent = labelled ? labelled.getAttribute("data-cursor") : "";
  });
  document.addEventListener("pointerleave", function () { cursor.classList.add("is-hidden"); });
  document.addEventListener("pointerenter", function () { cursor.classList.remove("is-hidden"); });

  // luz vermelha no contato e na assinatura
  var contact = document.querySelector(".contact");
  var sig = document.querySelector(".signature");
  if (contact) {
    contact.addEventListener("pointermove", function (e) {
      var r = contact.getBoundingClientRect();
      contact.style.setProperty("--mx", (e.clientX - r.left) + "px");
      contact.style.setProperty("--my", (e.clientY - r.top) + "px");
      if (sig) {
        var s = sig.getBoundingClientRect();
        sig.style.setProperty("--sx", (e.clientX - s.left) + "px");
        sig.style.setProperty("--sy", (e.clientY - s.top) + "px");
      }
    });
  }
})();
