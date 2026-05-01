const premiumBody = document.body;

if (!premiumBody) {
  // No DOM available (safety guard for non-browser contexts).
} else {
  const isPremiumPage = premiumBody.classList.contains("artist-premium-page") || premiumBody.classList.contains("fan-premium-page");

  if (isPremiumPage) {
    const toastHost = document.createElement("div");
    toastHost.className = "premium-toast-host";
    premiumBody.appendChild(toastHost);

    const nativeAlert = window.alert.bind(window);

    function showPremiumToast(message, tone = "info") {
      if (!message) {
        return;
      }

      const toast = document.createElement("div");
      toast.className = `premium-toast tone-${tone}`;
      toast.textContent = String(message);
      toastHost.appendChild(toast);

      requestAnimationFrame(() => {
        toast.classList.add("show");
      });

      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
          toast.remove();
        }, 260);
      }, 2600);
    }

    function inferTone(message) {
      const text = String(message || "").toLowerCase();

      if (/error|failed|invalid|required|unavailable|mismatch|denied|not authenticated|must/i.test(text)) {
        return "error";
      }

      if (/warning|offline|checking|retry|attention/i.test(text)) {
        return "warning";
      }

      if (/success|saved|uploaded|added|requested|connected|complete|sent|supprime|publie/i.test(text)) {
        return "success";
      }

      return "info";
    }

    window.alert = (message) => {
      showPremiumToast(message, inferTone(message));
    };

    window.PremiumUI = {
      toast: showPremiumToast,
      info: (message) => showPremiumToast(message, "info"),
      success: (message) => showPremiumToast(message, "success"),
      warning: (message) => showPremiumToast(message, "warning"),
      error: (message) => showPremiumToast(message, "error"),
      alertFallback: nativeAlert
    };

    function setupRevealAnimation() {
      const revealTargets = Array.from(
        document.querySelectorAll(
          ".section, .card, .chart-item, .catalog-item, .settings-card, .artist-settings-card, .stat-card, .performance-card, form"
        )
      ).filter((el) => !el.closest(".side-menu") && !el.classList.contains("premium-toast"));

      revealTargets.forEach((el, index) => {
        el.classList.add("premium-reveal");
        el.style.setProperty("--premium-delay", `${Math.min(index * 45, 520)}ms`);
      });

      requestAnimationFrame(() => {
        revealTargets.forEach((el) => el.classList.add("show"));
      });
    }

    document.addEventListener("click", (event) => {
      const actionTarget = event.target.closest("button, .btn-primary, .action-btn, .download-btn, .play, .edit-btn, .delete-btn, .nav-item");

      if (!actionTarget) {
        return;
      }

      actionTarget.classList.remove("premium-tap");
      void actionTarget.offsetWidth;
      actionTarget.classList.add("premium-tap");

      setTimeout(() => {
        actionTarget.classList.remove("premium-tap");
      }, 280);
    });

    document.querySelectorAll("form").forEach((form) => {
      form.addEventListener("submit", () => {
        const submitBtn = form.querySelector('button[type="submit"], .btn-primary');

        if (!submitBtn) {
          return;
        }

        submitBtn.classList.add("premium-busy");

        setTimeout(() => {
          submitBtn.classList.remove("premium-busy");
        }, 1400);
      });
    });

    setupRevealAnimation();
  }
}
