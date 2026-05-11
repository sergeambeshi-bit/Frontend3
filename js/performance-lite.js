(function () {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  const effectiveType = String(connection?.effectiveType || "").toLowerCase();
  const isSlowNet = Boolean(connection?.saveData || /(^|-)2g|3g|slow-2g/.test(effectiveType));

  window.__isSlowNet = isSlowNet;
  window.__perfHydrateOnIdle = function (fn) {
    if (typeof fn !== "function") return;
    if (isSlowNet && "requestIdleCallback" in window) {
      window.requestIdleCallback(fn, { timeout: 1200 });
      return;
    }
    setTimeout(fn, 0);
  };

  document.documentElement.classList.toggle("slow-net", isSlowNet);

  function installStyles() {
    if (document.getElementById("perf-lite-style")) return;
    const style = document.createElement("style");
    style.id = "perf-lite-style";
    style.textContent = [
      ".img-blur-up{filter:blur(10px);transform:scale(1.02);transition:filter .28s ease,transform .28s ease}",
      ".img-blur-up.img-loaded{filter:none;transform:none}",
      ".perf-skeleton{position:relative;overflow:hidden;border-radius:12px;background:rgba(255,255,255,.06);min-height:120px}",
      ".perf-skeleton::after{content:'';position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);animation:perfShimmer 1.2s infinite}",
      "@keyframes perfShimmer{100%{transform:translateX(100%)}}",
      ".is-loading{pointer-events:none;opacity:.72}",
      ".is-loading::after{content:' ...';font-weight:700}",
      ".slow-net *{scroll-behavior:auto !important}",
      ".slow-net .hero,.slow-net .hero-content{animation:none !important;transition:none !important}"
    ].join("");
    document.head.appendChild(style);
  }

  function optimizeImages() {
    function optimizedPathCandidates(img) {
      let pathname = "";
      try {
        const parsed = new URL(img.currentSrc || img.src, window.location.href);
        pathname = parsed.pathname;
      } catch (_) {
        return null;
      }

      const coversMatch = pathname.match(/^\/assets\/covers\/([^/]+)\.png$/i);
      if (coversMatch) {
        const base = coversMatch[1];
        return {
          srcset: [
            `/assets/covers/optimized/${base}-320.jpg 320w`,
            `/assets/covers/optimized/${base}-640.jpg 640w`,
            `/assets/covers/optimized/${base}-960.jpg 960w`
          ].join(", "),
          sizes: "(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 220px",
          slowSrc: `/assets/covers/optimized/${base}-320.jpg`,
          fastSrc: `/assets/covers/optimized/${base}-640.jpg`
        };
      }

      const heroMatch = pathname.match(/^\/assets\/hero\/([^/]+)\.png$/i);
      if (heroMatch) {
        const base = heroMatch[1];
        return {
          srcset: [
            `/assets/hero/optimized/${base}-640.jpg 640w`,
            `/assets/hero/optimized/${base}-960.jpg 960w`,
            `/assets/hero/optimized/${base}-1280.jpg 1280w`
          ].join(", "),
          sizes: "100vw",
          slowSrc: `/assets/hero/optimized/${base}-640.jpg`,
          fastSrc: `/assets/hero/optimized/${base}-960.jpg`
        };
      }

      return null;
    }

    const images = Array.from(document.querySelectorAll("img"));
    let eagerBudget = 2;

    images.forEach((img, index) => {
      const optimized = optimizedPathCandidates(img);
      if (optimized) {
        if (!img.hasAttribute("srcset")) img.setAttribute("srcset", optimized.srcset);
        if (!img.hasAttribute("sizes")) img.setAttribute("sizes", optimized.sizes);
        img.src = isSlowNet ? optimized.slowSrc : optimized.fastSrc;
      }

      if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");

      const isCriticalLogo = img.classList.contains("logo") || img.closest(".logo-link");
      if (isCriticalLogo) {
        img.setAttribute("loading", "eager");
        img.setAttribute("fetchpriority", "high");
      }

      if (!img.hasAttribute("fetchpriority")) {
        img.setAttribute("fetchpriority", index === 0 ? "high" : "low");
      }
      if (!img.hasAttribute("loading")) {
        img.setAttribute("loading", eagerBudget > 0 ? "eager" : "lazy");
      }
      if (img.getAttribute("loading") === "eager") eagerBudget -= 1;

      if (img.complete) return;
      img.classList.add("img-blur-up");
      img.addEventListener(
        "load",
        () => {
          img.classList.add("img-loaded");
          setTimeout(() => img.classList.remove("img-blur-up"), 180);
        },
        { once: true }
      );
    });
  }

  function installSkeletons() {
    const targets = document.querySelectorAll(".grid-2,#trendingGrid,#eventsGrid,.new-scroll,.film-scroll,.merch-scroll");
    targets.forEach((target) => {
      if (!target || target.children.length) return;
      const count = target.classList.contains("grid-2") || target.id === "trendingGrid" || target.id === "eventsGrid" ? 4 : 3;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < count; i += 1) {
        const block = document.createElement("div");
        block.className = "perf-skeleton";
        frag.appendChild(block);
      }
      target.appendChild(frag);

      const observer = new MutationObserver(() => {
        const hasRealChildren = Array.from(target.children).some((child) => !child.classList.contains("perf-skeleton"));
        if (!hasRealChildren) return;
        target.querySelectorAll(".perf-skeleton").forEach((el) => el.remove());
        observer.disconnect();
      });
      observer.observe(target, { childList: true });
    });
  }

  function installActionIndicators() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("button,.btn-primary,.pay-btn,.action-btn");
      if (!trigger || trigger.classList.contains("is-loading")) return;
      if (trigger.matches("[data-no-spinner]")) return;
      trigger.classList.add("is-loading");
      trigger.setAttribute("aria-busy", "true");
      setTimeout(() => {
        trigger.classList.remove("is-loading");
        trigger.removeAttribute("aria-busy");
      }, 10000);
    });
  }

  function installFetchCache() {
    if (!isSlowNet || typeof window.fetch !== "function") return;
    const nativeFetch = window.fetch.bind(window);
    const ttlMs = 5 * 60 * 1000;

    window.fetch = async function cachedFetch(input, init) {
      const reqInit = init || {};
      const method = String(reqInit.method || "GET").toUpperCase();
      if (method !== "GET") return nativeFetch(input, init);

      const url = typeof input === "string" ? input : input?.url;
      if (!url || /^https?:\/\//i.test(url) && !url.includes(location.host)) {
        return nativeFetch(input, init);
      }

      const cacheKey = "perf-cache:" + url;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.ts < ttlMs) {
            return new Response(parsed.body, {
              status: 200,
              headers: parsed.headers || { "content-type": "application/json" }
            });
          }
        }
      } catch (_) {
        // No-op.
      }

      const response = await nativeFetch(input, init);
      try {
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.includes("application/json")) return response;
        const clone = response.clone();
        const bodyText = await clone.text();
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            ts: Date.now(),
            body: bodyText,
            headers: { "content-type": contentType }
          })
        );
      } catch (_) {
        // Best effort cache.
      }
      return response;
    };
  }

  function run() {
    installStyles();
    optimizeImages();
    installSkeletons();
    installActionIndicators();
    installFetchCache();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
