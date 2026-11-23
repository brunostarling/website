(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ------------------------------------------------------------------
     Split text into animated characters
  ------------------------------------------------------------------ */
  function splitChars(el, baseDelay = 0) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const word = document.createElement("span");
            word.className = "word";
            [...part].forEach((ch) => {
              const c = document.createElement("span");
              c.className = "char";
              c.style.setProperty("--i", i++);
              c.style.setProperty("--base", baseDelay + "ms");
              c.textContent = ch;
              word.appendChild(c);
            });
            frag.appendChild(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
    el.setAttribute("aria-hidden", "true");
  }

  /* ------------------------------------------------------------------
     Preloader
  ------------------------------------------------------------------ */
  function runLoader() {
    return new Promise((resolve) => {
      const loader = $(".loader");
      const count = $("[data-loader-count]");
      const bar = $(".loader__bar span");
      if (!loader || reduceMotion) { loader && loader.remove(); resolve(); return; }
      const duration = 1600;
      const start = performance.now();
      const tick = (now) => {
        const t = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = Math.round(eased * 100);
        count.textContent = v;
        bar.style.width = v + "%";
        if (t < 1) requestAnimationFrame(tick);
        else {
          loader.classList.add("is-done");
          setTimeout(resolve, 350);
          setTimeout(() => loader.remove(), 1100);
        }
      };
      requestAnimationFrame(tick);
    });
  }

  /* ------------------------------------------------------------------
     Hero — generative flow field
  ------------------------------------------------------------------ */
  function heroCanvas() {
    const canvas = $(".hero__canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w, h, particles = [], running = true, t = 0;
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    const colors = ["243,239,230", "243,239,230", "243,239,230", "255,77,31"];

    const noise = (x, y, z) =>
      Math.sin(x * 1.7 + z) * Math.cos(y * 1.3 - z * 0.7) +
      Math.sin((x + y) * 0.8 + z * 0.5) * 0.5 +
      Math.cos(x * 0.5 - y * 2.1 + z * 0.3) * 0.35;

    function resize() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0d0d0c";
      ctx.fillRect(0, 0, w, h);
      const n = Math.min(Math.floor((w * h) / 2600), 900);
      particles = Array.from({ length: n }, spawn);
    }
    function spawn() {
      return {
        x: Math.random() * w, y: Math.random() * h,
        life: Math.random() * 200 + 60,
        speed: Math.random() * 0.9 + 0.4,
        c: colors[(Math.random() * colors.length) | 0],
        a: Math.random() * 0.5 + 0.15
      };
    }
    function step() {
      t += 0.0025;
      mouse.x = lerp(mouse.x, mouse.tx, 0.12);
      mouse.y = lerp(mouse.y, mouse.ty, 0.12);
      ctx.fillStyle = "rgba(13,13,12,0.075)";
      ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 1;
      const scale = 0.0022;
      for (const p of particles) {
        const angle = noise(p.x * scale, p.y * scale, t) * Math.PI * 1.6;
        let vx = Math.cos(angle) * p.speed;
        let vy = Math.sin(angle) * p.speed;
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 30000) {
          const f = (1 - d2 / 30000) * 4;
          const d = Math.sqrt(d2) || 1;
          vx += (dx / d) * f; vy += (dy / d) * f;
        }
        const nx = p.x + vx, ny = p.y + vy;
        ctx.strokeStyle = `rgba(${p.c},${p.a})`;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny; p.life--;
        if (p.life <= 0 || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) Object.assign(p, spawn());
      }
    }
    function frame() {
      if (!running) return;
      step();
      requestAnimationFrame(frame);
    }

    const staticRender = () => { for (let i = 0; i < 220; i++) step(); };
    resize();
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (reduceMotion) staticRender(); }, 150); });
    canvas.parentElement.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top;
    });
    canvas.parentElement.addEventListener("pointerleave", () => { mouse.tx = mouse.ty = -9999; });

    if (reduceMotion) {
      staticRender();
      return;
    }
    new IntersectionObserver(([entry]) => {
      const was = running;
      running = entry.isIntersecting;
      if (running && !was) requestAnimationFrame(frame);
    }).observe(canvas);
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------
     Reveal on scroll
  ------------------------------------------------------------------ */
  function reveals() {
    // Stagger siblings
    const groups = new Map();
    $$("[data-reveal]").forEach((el) => {
      const p = el.parentElement;
      const idx = groups.get(p) || 0;
      el.style.setProperty("--d", idx * 90 + "ms");
      groups.set(p, idx + 1);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    $$("[data-reveal]").forEach((el) => io.observe(el));

    const splitIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-split-in"); splitIO.unobserve(e.target); }
      });
    }, { threshold: 0.3 });
    $$(".contact__title, [data-footer-word]").forEach((el) => splitIO.observe(el.closest(".contact__title, .footer__big")));
  }

  /* ------------------------------------------------------------------
     Header behaviour + mobile menu
  ------------------------------------------------------------------ */
  function header() {
    const el = $("[data-header]");
    let last = 0;
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      el.classList.toggle("is-scrolled", y > 40);
      el.classList.toggle("is-hidden", y > last && y > 400 && !document.body.classList.contains("menu-open"));
      last = y;
    }, { passive: true });

    const toggle = $(".menu-toggle");
    const menu = $("#mobile-menu");
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      document.body.classList.toggle("menu-open", open);
      document.body.classList.toggle("is-locked", open);
      if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add("is-open")); }
      else { menu.classList.remove("is-open"); setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 700); }
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    $$("a", menu).forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("menu-open")) { setOpen(false); toggle.focus(); } });
  }

  /* ------------------------------------------------------------------
     Custom cursor + magnetic elements
  ------------------------------------------------------------------ */
  function cursor() {
    if (!finePointer || reduceMotion) return;
    document.documentElement.classList.add("has-cursor");
    const c = $(".cursor");
    const label = $(".cursor__label");
    const pos = { x: innerWidth / 2, y: innerHeight / 2 }, target = { ...pos };
    window.addEventListener("pointermove", (e) => { target.x = e.clientX; target.y = e.clientY; });
    const loop = () => {
      pos.x = lerp(pos.x, target.x, 0.2); pos.y = lerp(pos.y, target.y, 0.2);
      c.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener("pointerover", (e) => {
      const labelled = e.target.closest("[data-cursor]");
      const hov = e.target.closest("a, button, [data-hover], label");
      c.classList.toggle("is-label", !!labelled);
      c.classList.toggle("is-hover", !labelled && !!hov);
      label.textContent = labelled ? labelled.dataset.cursor : "";
    });
    document.addEventListener("pointerleave", () => { c.style.opacity = 0; });
    document.addEventListener("pointerenter", () => { c.style.opacity = 1; });

    $$("[data-magnetic]").forEach((el) => {
      const inner = el.querySelector("span") || el;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
        inner.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform 600ms cubic-bezier(.16,1,.3,1)";
        inner.style.transition = "transform 600ms cubic-bezier(.16,1,.3,1)";
        el.style.transform = inner.style.transform = "";
        setTimeout(() => { el.style.transition = inner.style.transition = ""; }, 600);
      });
    });
  }

  /* ------------------------------------------------------------------
     Scroll-driven effects: marquee velocity, parallax, manifesto, process
  ------------------------------------------------------------------ */
  function scrollFx() {
    const track = $("[data-marquee]");
    const group = $(".marquee__group", track);
    // Duplicate group for seamless loop
    for (let i = 0; i < 2; i++) { const g = group.cloneNode(true); g.setAttribute("aria-hidden", "true"); track.appendChild(g); }

    const manifesto = $("[data-manifesto]");
    const accentWords = ["intenção", "movimento.", "história,", "emoção", "conexões"];
    manifesto.innerHTML = manifesto.textContent.trim().split(/\s+/).map((w) =>
      `<span class="w${accentWords.includes(w) ? " is-accent" : ""}">${w}</span>`).join(" ");
    const words = $$(".w", manifesto);

    const parallax = $$("[data-parallax]");
    const process = $("[data-process]");
    const processLine = $(".process__line", process);
    const steps = $$(".step", process);

    let x = 0, lastY = scrollY, velocity = 0;
    const loop = () => {
      const y = scrollY;
      const delta = y - lastY; lastY = y;
      velocity = lerp(velocity, delta, 0.1);

      // Marquee
      if (!reduceMotion) {
        const gw = group.offsetWidth;
        x -= 1 + Math.abs(velocity) * 0.4;
        if (x <= -gw) x += gw;
        track.style.transform = `translate3d(${x}px,0,0) skewX(${clamp(-velocity * 0.3, -12, 12)}deg)`;
      }

      // Manifesto highlight
      const mr = manifesto.getBoundingClientRect();
      const mp = clamp((innerHeight * 0.85 - mr.top) / (mr.height + innerHeight * 0.35), 0, 1);
      const lit = Math.floor(mp * words.length);
      words.forEach((w, i) => w.classList.toggle("is-lit", i < lit || reduceMotion));

      // Parallax
      if (!reduceMotion) parallax.forEach((el) => {
        const r = el.getBoundingClientRect();
        const off = (r.top + r.height / 2 - innerHeight / 2) * parseFloat(el.dataset.parallax);
        el.style.transform = `translate3d(0, ${off}px, 0)`;
      });

      // Process progress
      const pr = process.getBoundingClientRect();
      const pp = clamp((innerHeight * 0.75 - pr.top) / (pr.height * 0.9), 0, 1);
      processLine.style.setProperty("--p", pp);
      steps.forEach((s, i) => s.classList.toggle("is-active", pp >= (i / steps.length) + 0.02));

      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ------------------------------------------------------------------
     Counters
  ------------------------------------------------------------------ */
  function counters() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const end = +e.target.dataset.count;
        if (reduceMotion) { e.target.textContent = end; return; }
        const start = performance.now(), dur = 1800;
        const tick = (now) => {
          const t = clamp((now - start) / dur, 0, 1);
          e.target.textContent = Math.round(end * (1 - Math.pow(1 - t, 4)));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    $$("[data-count]").forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------
     Work — animated covers, filter and case study
  ------------------------------------------------------------------ */
  function coverHTML(p) {
    const style = `--c1:${p.colors[0]};--c2:${p.colors[1]}`;
    if (p.video) return `<div class="cover" style="${style}"><video src="${p.video}" autoplay muted loop playsinline></video></div>`;
    if (p.image) return `<div class="cover" style="${style}"><img src="${p.image}" alt="" loading="lazy"></div>`;
    let inner = "";
    switch (p.cover) {
      case "rings":
        inner = Array.from({ length: 8 }, (_, i) => `<span class="ring" style="--i:${i}"></span>`).join("") + `<span class="core"></span>`;
        break;
      case "dots": {
        let dots = "";
        for (let r = 0; r < 9; r++) for (let c = 0; c < 12; c++) {
          const d = (Math.hypot(c - 5.5, r - 4) * -0.18).toFixed(2);
          dots += `<span style="--d:${d}"></span>`;
        }
        inner = `<div class="grid">${dots}</div>`;
        break;
      }
      case "letter":
        inner = `<span class="sun"></span><span class="big">${p.title.trim()[0]}</span>`;
        break;
      case "stripes":
        inner = Array.from({ length: 8 }, (_, i) => `<span class="bar" style="--i:${i}"></span>`).join("");
        break;
      case "blob":
        inner = `<span class="b"></span><span class="b b2"></span>`;
        break;
      case "orbit":
        inner = [[30, 9, 10], [52, 14, 8], [74, 22, 12], [96, 34, 6]].map(([s, t, ps]) =>
          `<span class="o" style="--s:${s}"><span class="rot" style="--t:${t}s"><span class="p" style="--ps:${ps}px"></span></span></span>`).join("") +
          `<span class="sun"></span>`;
        break;
    }
    return `<div class="cover cover--${p.cover}" style="${style}" aria-hidden="true">${inner}</div>`;
  }

  function work() {
    const grid = $("[data-work-grid]");
    const projects = window.PROJECTS || [];
    grid.innerHTML = projects.map((p, i) => `
      <a class="project" href="#${p.id}" role="button" data-reveal data-category="${p.category}" data-index="${i}" data-cursor="Ver case">
        <div class="project__media">
          ${coverHTML(p)}
          <span class="project__view mono">Ver estudo de caso ↗</span>
        </div>
        <div class="project__info">
          <div>
            <h3 class="project__title">${p.title}</h3>
            <p class="project__tags mono">${p.tags}</p>
          </div>
          <span class="project__year mono">${p.year}</span>
        </div>
      </a>`).join("");

    // Pause cover animations when off-screen (performance)
    const visIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.querySelectorAll(".cover, .cover *").forEach((n) => {
        n.style.animationPlayState = e.isIntersecting ? "running" : "paused";
      }));
    });
    $$(".project", grid).forEach((el) => visIO.observe(el));

    // Filters
    $$("[data-filter]").forEach((btn) => btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      $$("[data-filter]").forEach((b) => { const on = b === btn; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on); });
      const cards = $$(".project", grid);
      cards.forEach((c) => c.classList.add("is-filtering"));
      setTimeout(() => {
        cards.forEach((c) => {
          c.classList.toggle("is-hidden", f !== "all" && c.dataset.category !== f);
          c.classList.add("is-in");
        });
        requestAnimationFrame(() => requestAnimationFrame(() => cards.forEach((c) => c.classList.remove("is-filtering"))));
      }, reduceMotion ? 0 : 300);
    }));

    // Case study overlay
    const modal = $("[data-case]");
    const labels = { branding: "Branding", motion: "Motion", digital: "Digital" };
    let current = 0, lastFocus = null;
    const fill = (i) => {
      const p = projects[i]; current = i;
      $("[data-case-cover]", modal).innerHTML = coverHTML(p);
      $("[data-case-meta]", modal).textContent = `${labels[p.category]} — ${p.year} — ${p.tags}`;
      $("[data-case-title]", modal).textContent = p.title;
      $("[data-case-lead]", modal).textContent = p.lead;
      $("[data-case-challenge]", modal).textContent = p.challenge;
      $("[data-case-solution]", modal).textContent = p.solution;
      $("[data-case-result]", modal).textContent = p.result;
      $(".case__panel", modal).scrollTop = 0;
    };
    const open = (i) => {
      lastFocus = document.activeElement;
      fill(i);
      modal.hidden = false;
      document.body.classList.add("is-locked");
      requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("is-open")));
      $("[data-case-close]", modal).focus({ preventScroll: true });
    };
    const close = () => {
      modal.classList.remove("is-open");
      document.body.classList.remove("is-locked");
      setTimeout(() => { modal.hidden = true; }, reduceMotion ? 0 : 600);
      lastFocus && lastFocus.focus({ preventScroll: true });
    };
    grid.addEventListener("click", (e) => { const card = e.target.closest(".project"); if (card) { e.preventDefault(); open(+card.dataset.index); } });
    grid.addEventListener("keydown", (e) => { const card = e.target.closest(".project"); if (card && e.key === " ") { e.preventDefault(); open(+card.dataset.index); } });
    $("[data-case-close]", modal).addEventListener("click", close);
    $("[data-case-next]", modal).addEventListener("click", () => fill((current + 1) % projects.length));
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    document.addEventListener("keydown", (e) => {
      if (modal.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const f = $$("button, a[href], input, textarea", modal).filter((n) => n.offsetParent !== null || n.matches(".case__close"));
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ------------------------------------------------------------------
     Services accordion
  ------------------------------------------------------------------ */
  function services() {
    $$(".service").forEach((s, i) => {
      const head = $(".service__head", s);
      const body = $(".service__body", s);
      body.id = "service-body-" + i;
      head.setAttribute("aria-controls", body.id);
      head.addEventListener("click", () => {
        const open = head.getAttribute("aria-expanded") !== "true";
        $$(".service").forEach((o) => { o.classList.remove("is-open"); $(".service__head", o).setAttribute("aria-expanded", "false"); });
        s.classList.toggle("is-open", open);
        head.setAttribute("aria-expanded", String(open));
      });
    });
  }

  /* ------------------------------------------------------------------
     Testimonials slider
  ------------------------------------------------------------------ */
  function slider() {
    const root = $("[data-slider]");
    const slides = $$(".slide", root);
    const cur = $("[data-current]", root);
    $("[data-total]", root).textContent = String(slides.length).padStart(2, "0");
    let i = 0, timer;
    const go = (n) => {
      slides[i].classList.remove("is-active");
      i = (n + slides.length) % slides.length;
      slides[i].classList.add("is-active");
      cur.textContent = String(i + 1).padStart(2, "0");
    };
    const auto = () => { clearInterval(timer); if (!reduceMotion) timer = setInterval(() => go(i + 1), 6500); };
    $("[data-next]", root).addEventListener("click", () => { go(i + 1); auto(); });
    $("[data-prev]", root).addEventListener("click", () => { go(i - 1); auto(); });
    root.addEventListener("pointerenter", () => clearInterval(timer));
    root.addEventListener("pointerleave", auto);
    auto();
  }

  /* ------------------------------------------------------------------
     Contact: copy email + form validation (blur-first)
  ------------------------------------------------------------------ */
  function contact() {
    const copy = $("[data-copy]");
    const hint = $(".email-copy__hint", copy);
    copy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(copy.dataset.copy); hint.textContent = "E-mail copiado ✓"; }
      catch { window.location.href = "mailto:" + copy.dataset.copy; }
      setTimeout(() => { hint.textContent = "Clique para copiar"; }, 2400);
    });

    const form = $("[data-form]");
    const status = $(".form__status", form);
    const messages = {
      name: "Diga como podemos te chamar.",
      email: "Esse e-mail parece incompleto — confira o formato, ex.: voce@empresa.com.",
      message: "Conte um pouco sobre o projeto para começarmos."
    };
    const validate = (input) => {
      const field = input.closest(".field");
      const err = $(".field__error", field);
      const ok = input.value.trim() && input.checkValidity();
      field.classList.toggle("has-error", !ok);
      err.textContent = ok ? "" : messages[input.name];
      input.setAttribute("aria-invalid", String(!ok));
      return ok;
    };
    $$("input[required], textarea[required]", form).forEach((input) => {
      input.addEventListener("blur", () => { if (input.value) validate(input); });
      input.addEventListener("input", () => { if (input.closest(".field").classList.contains("has-error")) validate(input); });
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const inputs = $$("input[required], textarea[required]", form);
      const results = inputs.map(validate);
      const firstBad = inputs[results.indexOf(false)];
      if (firstBad) { firstBad.focus(); return; }
      const d = new FormData(form);
      const subject = encodeURIComponent(`Novo projeto — ${d.get("type")}`);
      const body = encodeURIComponent(`Olá Bruno,\n\n${d.get("message")}\n\n— ${d.get("name")} (${d.get("email")})`);
      window.location.href = `mailto:${copy.dataset.copy}?subject=${subject}&body=${body}`;
      status.textContent = "Abrimos seu app de e-mail com a mensagem pronta. Obrigado!";
    });
  }

  /* ------------------------------------------------------------------
     Footer: year + live clock
  ------------------------------------------------------------------ */
  function footer() {
    $("[data-year]").textContent = new Date().getFullYear();
    const clock = $("[data-clock]");
    const fmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    const tick = () => { clock.textContent = fmt.format(new Date()); };
    tick(); setInterval(tick, 15000);
  }

  /* ------------------------------------------------------------------
     Boot
  ------------------------------------------------------------------ */
  $$("[data-split]").forEach((el) => splitChars(el));
  splitChars($("[data-footer-word]"));
  // Hero lines: offset delay per line
  $$(".hero__title .line").forEach((line, li) => $$(".char", line).forEach((c) => c.style.setProperty("--base", li * 120 + "ms")));
  $$(".contact__title .line").forEach((line, li) => $$(".char", line).forEach((c) => c.style.setProperty("--base", li * 160 + "ms")));

  heroCanvas();
  header();
  cursor();
  work();
  services();
  slider();
  contact();
  footer();
  counters();
  scrollFx();

  runLoader().then(() => {
    document.body.classList.remove("is-loading");
    $(".hero__title").classList.add("is-split-in");
    reveals();
  });
})();
