(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const darkQuery = matchMedia("(prefers-color-scheme: dark)");

  /* ---------- Theme ---------- */
  const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : darkQuery.matches);
  document.querySelector(".theme-toggle")?.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  /* ---------- Nav: scrolled state, mobile menu, active section ---------- */
  const nav = document.querySelector(".nav");
  const menuBtn = document.querySelector(".menu-toggle");
  const progress = document.querySelector(".progress");
  const onScroll = () => {
    nav.classList.toggle("scrolled", scrollY > 8);
    const max = root.scrollHeight - innerHeight;
    progress?.style.setProperty("--progress", max > 0 ? (scrollY / max).toFixed(4) : "0");
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const setMenu = (open) => {
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  menuBtn?.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  document.querySelectorAll(".nav-links a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  const navLinks = new Map([...document.querySelectorAll(".nav-links a")].map((a) => [a.getAttribute("href").slice(1), a]));
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.remove("active"));
      navLinks.get(entry.target.id)?.classList.add("active");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  navLinks.forEach((_, id) => { const s = document.getElementById(id); if (s) sectionObserver.observe(s); });

  /* ---------- Text effects: label decode, number count-up ---------- */
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#%&*+=<>";
  const scramble = (el) => {
    if (reduceMotion.matches) return;
    const final = el.textContent;
    const frames = 22;
    let f = 0;
    const tick = () => {
      const settled = Math.floor((++f / frames) * final.length);
      el.textContent = [...final].map((ch, i) => (i < settled || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
      if (f < frames) requestAnimationFrame(tick);
      else el.textContent = final;
    };
    requestAnimationFrame(tick);
  };

  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const countUp = (el) => {
    const m = el.textContent.match(/^(\D*)(\d+)(\D*)$/);
    if (!m || reduceMotion.matches) return;
    const [, pre, num, post] = m;
    el.style.display = "inline-block";
    el.style.minWidth = `${el.offsetWidth}px`; // hold the final width so the line doesn't reflow
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / 1400, 1);
      el.textContent = `${pre}${Math.round(+num * easeOut(p))}${post}`;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- Reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add("in");
      revealObserver.unobserve(el);
      el.querySelectorAll(".sec-label").forEach(scramble);
      el.querySelectorAll("[data-count]").forEach(countUp);
      // After the reveal, drop the attribute so hover transitions aren't delayed or overridden.
      el.addEventListener("transitionend", function done(e) {
        if (e.target !== el) return;
        el.removeEventListener("transitionend", done);
        el.removeAttribute("data-reveal");
        el.style.transitionDelay = "";
      });
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    // Stagger siblings slightly so grids cascade in.
    const idx = [...el.parentElement.children].filter((c) => c.hasAttribute("data-reveal")).indexOf(el);
    el.style.transitionDelay = `${Math.min(idx, 6) * 60}ms`;
    revealObserver.observe(el);
  });

  /* ---------- Seattle clock ---------- */
  const clock = document.querySelector("[data-clock]");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles", timeZoneName: "short" });
    const tick = () => { clock.textContent = `· ${fmt.format(new Date())}`; };
    tick();
    setInterval(tick, 30_000);
  }

  /* ---------- Course filter ---------- */
  const filterBtns = document.querySelectorAll(".filters button");
  const courses = document.querySelectorAll(".course");
  filterBtns.forEach((btn) => btn.addEventListener("click", () => {
    const area = btn.dataset.filter;
    filterBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    courses.forEach((c) => {
      const show = area === "all" || c.dataset.area === area;
      c.classList.toggle("hidden", !show);
      if (show) c.classList.add("in");
    });
  }));

  /* ---------- Copy email ---------- */
  const toast = document.querySelector(".toast");
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  };
  document.querySelectorAll("[data-copy]").forEach((btn) => btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      showToast("Email copied");
    } catch (e) {
      showToast(btn.dataset.copy);
    }
  }));

  /* ---------- Figure lightbox ---------- */
  const dialog = document.querySelector(".lightbox");
  if (dialog && typeof dialog.showModal === "function") {
    const dImg = dialog.querySelector("img");
    const dCap = dialog.querySelector("figcaption");
    document.querySelectorAll("[data-zoom]").forEach((btn) => btn.addEventListener("click", () => {
      const img = btn.querySelector("img");
      const cap = btn.closest("figure")?.querySelector("figcaption");
      dImg.src = img.currentSrc || img.src;
      dImg.alt = img.alt;
      dCap.innerHTML = cap ? cap.innerHTML : "";
      dialog.showModal();
    }));
    dialog.querySelector(".lightbox-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  }

  /* ---------- Hero name: split into letters for the intro + hover wave ---------- */
  const heroName = document.querySelector(".hero-name");
  if (heroName) {
    const label = heroName.textContent.replace(/\s+/g, " ").trim();
    let n = 0;
    const split = (node) => [...node.childNodes].forEach((child) => {
      if (child.nodeType !== Node.TEXT_NODE) return split(child);
      const frag = document.createDocumentFragment();
      for (const ch of child.textContent) {
        if (/\s/.test(ch)) { frag.append(ch); continue; }
        const s = document.createElement("span");
        s.className = "ch";
        s.textContent = ch;
        s.style.setProperty("--i", n++);
        frag.append(s);
      }
      child.replaceWith(frag);
    });
    split(heroName);
    // Screen readers get the name once, not letter by letter.
    [...heroName.children].forEach((c) => c.setAttribute("aria-hidden", "true"));
    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = label;
    heroName.append(sr);
    heroName.classList.add("intro");
    setTimeout(() => heroName.classList.remove("intro"), n * 40 + 1300);
  }

  /* ---------- Pointer effects: card spotlight, project tilt, magnetic buttons ---------- */
  document.querySelectorAll(".card, .course").forEach((el) => {
    const tilt = el.classList.contains("project");
    el.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
      if (tilt && !reduceMotion.matches) {
        const k = Math.min(1, 560 / r.width); // wide cards tilt less
        el.style.setProperty("--rx", `${((0.5 - y / r.height) * 4 * k).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${((x / r.width - 0.5) * 5 * k).toFixed(2)}deg`);
      }
    });
    if (tilt) el.addEventListener("pointerleave", () => { el.style.removeProperty("--rx"); el.style.removeProperty("--ry"); });
  });

  document.querySelectorAll(".hero-ctas .btn, .hero-social .icon-btn, .contact-links .btn").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || reduceMotion.matches) return;
      const r = el.getBoundingClientRect();
      el.style.translate = `${((e.clientX - r.left) / r.width - 0.5) * 8}px ${((e.clientY - r.top) / r.height - 0.5) * 8}px`;
    });
    el.addEventListener("pointerleave", () => { el.style.translate = ""; });
  });

  /* ---------- ShelfLife: simulated sensor feed ----------
     Fridge temperature hovers near 3 °C with the odd door-open spike; each
     food's spoilage risk accumulates faster the warmer it gets. */
  const sensor = document.querySelector(".sensor");
  if (sensor) {
    const line = sensor.querySelector(".sensor-line");
    const area = sensor.querySelector(".sensor-area");
    const tempEl = sensor.querySelector('[data-sensor="temp"]');
    const rhEl = sensor.querySelector('[data-sensor="rh"]');
    const risks = [...sensor.querySelectorAll(".risk i")].map((el, k) => ({ el, r: parseFloat(el.style.getPropertyValue("--r")), rate: [0.004, 0.007, 0.011][k] }));
    const W = 320, H = 100, N = 40, STEP = W / (N - 2), TICK = 650;
    const yOf = (c) => H - (c / 10) * H; // 0–10 °C, so the 4 °C limit line sits at y = 60
    let tick = 0, door = 0;
    const next = () => {
      tick++;
      if (door <= 0 && Math.random() < 0.05) door = 7;
      const spike = door > 0 ? Math.sin((door-- / 7) * Math.PI) * 3.2 : 0;
      return 3.1 + 0.45 * Math.sin(tick / 6) + (Math.random() - 0.5) * 0.35 + spike;
    };
    const temps = Array.from({ length: N }, next);

    // Catmull-Rom through the points, as cubic Béziers.
    const smooth = (p) => p.reduce((d, [x, y], i) => {
      if (!i) return `M${x.toFixed(1)},${y.toFixed(1)}`;
      const [x0, y0] = p[i - 2] || p[i - 1], [x1, y1] = p[i - 1], [x3, y3] = p[i + 1] || p[i];
      return `${d} C${(x1 + (x - x0) / 6).toFixed(1)},${(y1 + (y - y0) / 6).toFixed(1)} ${(x - (x3 - x1) / 6).toFixed(1)},${(y - (y3 - y1) / 6).toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
    }, "");
    const render = (frac) => {
      const pts = temps.map((c, i) => [(i - frac) * STEP, yOf(c)]);
      const d = smooth(pts);
      line.setAttribute("d", d);
      area.setAttribute("d", `${d} L${pts[N - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`);
    };
    const readout = () => {
      const t = temps[N - 2]; // the point sitting at the right edge
      tempEl.textContent = t.toFixed(1);
      rhEl.textContent = Math.round(60 + 3 * Math.sin(tick / 9) + (Math.random() - 0.5) * 2 + (t > 4 ? 4 : 0));
      risks.forEach((k) => {
        k.r += k.rate * (0.4 + Math.max(0, t - 2));
        if (k.r > 0.96) k.r = 0.08; // restocked
        k.el.style.setProperty("--r", k.r.toFixed(3));
      });
    };

    let raf = 0, lastShift = 0;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (now - lastShift >= TICK) {
        lastShift = now;
        temps.shift();
        temps.push(next());
        readout();
      }
      render((now - lastShift) / TICK);
    };
    render(0);
    readout();
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !raf && !reduceMotion.matches) raf = requestAnimationFrame(frame);
      else if (!entry.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(sensor);
  }

  /* ---------- OmniAge: terminal that types itself ---------- */
  const term = document.querySelector(".construction .term");
  if (term && !reduceMotion.matches) {
    const lines = [...term.querySelectorAll(".tl")].map((tl) => {
      const tt = tl.querySelector(".tt");
      return { tl, tt, text: tt.textContent };
    });
    const cursor = term.querySelector(".cursor");
    let li = 0, ci = 0, timer = 0, active = false;
    const reset = () => {
      lines.forEach((l) => { l.tl.style.visibility = "hidden"; l.tt.textContent = ""; });
      li = 0; ci = 0;
    };
    const type = () => {
      const l = lines[li];
      l.tl.style.visibility = "visible";
      l.tl.append(cursor);
      if (ci < l.text.length) { l.tt.textContent = l.text.slice(0, ++ci); timer = setTimeout(type, 30 + Math.random() * 50); return; }
      if (li < lines.length - 1) { li++; ci = 0; timer = setTimeout(type, li === 1 ? 500 : 280); return; }
      timer = setTimeout(() => { reset(); type(); }, 4200);
    };
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !active) {
        active = true;
        term.style.minWidth = `${term.offsetWidth}px`; // keep the box steady while lines are empty
        reset();
        type();
      } else if (!entry.isIntersecting && active) {
        active = false;
        clearTimeout(timer);
      }
    }).observe(term);
  }

  /* ---------- Hero: animated contour field ----------
     A smooth scalar field (3D Perlin noise, with time as the third axis) is
     contoured with marching squares, like isobars on a weather map. The cursor
     adds a Gaussian "pressure system" the lines bend around. */
  const canvas = document.querySelector(".hero-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Ken Perlin's improved noise, seeded so the field looks the same each visit.
  const perm = new Uint8Array(512);
  {
    const p = Array.from({ length: 256 }, (_, i) => i);
    let seed = 1337;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const grad = (h, x, y, z) => {
    h &= 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };
  const noise = (x, y, z) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
           lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
           lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v),
      w);
  };

  const LEVELS = 13;
  const HIGHLIGHT = 10; // a high iso level, so it traces sparse closed "highs"
  let w = 0, h = 0, dpr = 1, cell = 18, cols = 0, rows = 0, field = new Float32Array(0);
  let colors = { line: "", hi: "" };
  let t = 0, last = 0, raf = 0, visible = true;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, s: 0, ts: 0 };
  const ripples = []; // clicks send a ring-shaped wave out through the field

  const readColors = () => {
    const cs = getComputedStyle(root);
    colors = { line: cs.getPropertyValue("--contour").trim(), hi: cs.getPropertyValue("--contour-hi").trim() };
  };

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    cell = w < 640 ? 14 : 18;
    cols = Math.ceil(w / cell) + 1;
    rows = Math.ceil(h / cell) + 1;
    field = new Float32Array(cols * rows);
  };

  const sample = () => {
    const sigma2 = 2 * 140 * 140;
    const drift = t * 0.35;
    const now = performance.now();
    while (ripples.length && now - ripples[0].t0 > 3500) ripples.shift();
    const waves = ripples.map((r) => {
      const age = (now - r.t0) / 1000;
      return { x: r.x, y: r.y, R: age * 340, a: 0.85 * Math.exp(-age * 0.9) };
    });
    for (let j = 0; j < rows; j++) {
      const y = j * cell;
      for (let i = 0; i < cols; i++) {
        const x = i * cell;
        let v = noise(x * 0.0028 + drift, y * 0.0028, t) + 0.35 * noise(x * 0.0075 + 31.7, y * 0.0075 + drift, t * 1.6);
        if (pointer.s > 0.001) {
          const dx = x - pointer.x, dy = y - pointer.y;
          v += pointer.s * 0.5 * Math.exp(-(dx * dx + dy * dy) / sigma2);
        }
        for (const w of waves) {
          const d = Math.hypot(x - w.x, y - w.y) - w.R;
          v += w.a * Math.exp(-(d * d) / 5000);
        }
        field[j * cols + i] = v;
      }
    }
  };

  // Marching squares for one iso level, appended to the current path.
  const contour = (iso) => {
    for (let j = 0; j < rows - 1; j++) {
      const y = j * cell;
      for (let i = 0; i < cols - 1; i++) {
        const a = field[j * cols + i], b = field[j * cols + i + 1];
        const c = field[(j + 1) * cols + i + 1], d = field[(j + 1) * cols + i];
        const idx = (a > iso ? 8 : 0) | (b > iso ? 4 : 0) | (c > iso ? 2 : 0) | (d > iso ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const x = i * cell;
        const tx = x + cell * (iso - a) / (b - a), ty = y;            // top edge
        const rx = x + cell, ry = y + cell * (iso - b) / (c - b);     // right edge
        const bx = x + cell * (iso - d) / (c - d), by = y + cell;     // bottom edge
        const lx = x, ly = y + cell * (iso - a) / (d - a);            // left edge
        switch (idx) {
          case 1: case 14: ctx.moveTo(lx, ly); ctx.lineTo(bx, by); break;
          case 2: case 13: ctx.moveTo(bx, by); ctx.lineTo(rx, ry); break;
          case 3: case 12: ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); break;
          case 4: case 11: ctx.moveTo(tx, ty); ctx.lineTo(rx, ry); break;
          case 6: case 9:  ctx.moveTo(tx, ty); ctx.lineTo(bx, by); break;
          case 7: case 8:  ctx.moveTo(lx, ly); ctx.lineTo(tx, ty); break;
          case 5:  ctx.moveTo(lx, ly); ctx.lineTo(tx, ty); ctx.moveTo(bx, by); ctx.lineTo(rx, ry); break;
          case 10: ctx.moveTo(lx, ly); ctx.lineTo(bx, by); ctx.moveTo(tx, ty); ctx.lineTo(rx, ry); break;
        }
      }
    }
  };

  const draw = () => {
    sample();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = "round";
    for (let L = 0; L < LEVELS; L++) {
      const iso = -0.66 + (L * 1.32) / (LEVELS - 1);
      ctx.beginPath();
      contour(iso);
      ctx.strokeStyle = L === HIGHLIGHT ? colors.hi : colors.line;
      ctx.lineWidth = L === HIGHLIGHT ? 1.5 : 1;
      ctx.stroke();
    }
  };

  const frame = (now) => {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(now - (last || now), 64);
    if (now - last >= 33) { // ~30 fps is plenty for slow drift
      last = now;
      t += dt * 0.00005;
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      pointer.s += (pointer.ts - pointer.s) * 0.05;
      draw();
    }
    raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!raf && !reduceMotion.matches) { last = 0; raf = requestAnimationFrame(frame); } };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  const hero = document.querySelector(".hero");
  hero.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const r = canvas.getBoundingClientRect();
    pointer.tx = e.clientX - r.left;
    pointer.ty = e.clientY - r.top;
    if (pointer.s < 0.01) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
    pointer.ts = 1;
  });
  hero.addEventListener("pointerleave", () => { pointer.ts = 0; });
  hero.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, button, .now")) return;
    const r = canvas.getBoundingClientRect();
    ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t0: performance.now() });
    if (ripples.length > 5) ripples.shift();
  });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? start() : stop();
  }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  let resizeTimer;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); draw(); }, 120);
  });

  const refreshColors = () => { readColors(); draw(); };
  new MutationObserver(refreshColors).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  darkQuery.addEventListener("change", refreshColors);
  reduceMotion.addEventListener("change", () => (reduceMotion.matches ? stop() : start()));

  readColors();
  resize();
  draw();
  start();
})();
