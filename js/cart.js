// js/cart.js

/* =========================
   STORAGE
========================= */
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch (_) {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem("cart", JSON.stringify(items));
}

/* =========================
   MINI TOAST (non-blocking)
   Shows a brief status pill at
   the bottom of the screen.
========================= */
function showCartToast(message, isWarning) {
  let toast = document.getElementById("__jengu_cart_toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "__jengu_cart_toast";
    toast.style.cssText = [
      "position:fixed",
      "bottom:90px",
      "left:50%",
      "transform:translateX(-50%) translateY(8px)",
      "padding:10px 20px",
      "border-radius:999px",
      "font-size:13px",
      "font-weight:700",
      "letter-spacing:0.02em",
      "z-index:9999",
      "pointer-events:none",
      "opacity:0",
      "transition:opacity .25s ease, transform .25s ease",
      "white-space:nowrap",
    ].join(";");
    document.body.appendChild(toast);
  }

  const accent = isWarning
    ? "rgba(255,200,80,0.22)"
    : "rgba(1,212,171,0.18)";
  const border = isWarning
    ? "rgba(255,200,80,0.52)"
    : "rgba(1,212,171,0.52)";
  const color  = isWarning ? "#ffe89e" : "#6dfae0";

  toast.style.background = accent;
  toast.style.border      = `1px solid ${border}`;
  toast.style.color       = color;
  toast.textContent       = message;

  // Force reflow so the transition plays even on rapid calls
  void toast.offsetWidth;
  toast.style.opacity   = "1";
  toast.style.transform = "translateX(-50%) translateY(0)";

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity   = "0";
    toast.style.transform = "translateX(-50%) translateY(8px)";
  }, 2400);
}

/* =========================
   CART SYSTEM
========================= */
export const cart = {

  items: loadCart(),

  /* Returns true if item was added, false if already in cart */
  add(item) {
    // Normalise id to string for reliable comparison
    const id = String(item.id || item.name || "");
    const exists = this.items.find(i => String(i.id || i.name || "") === id);

    if (exists) {
      showCartToast("Already in cart", true);
      return false;
    }

    this.items.push({ ...item, id });
    saveCart(this.items);
    this.updateUI();
    showCartToast("Added to cart ✓");
    return true;
  },

  remove(itemId) {
    const id = String(itemId);
    this.items = this.items.filter(i => String(i.id || i.name || "") !== id);
    saveCart(this.items);
    this.updateUI();
  },

  clear() {
    this.items = [];
    saveCart(this.items);
    this.updateUI();
  },

  getCount() {
    return this.items.length;
  },

  /* Update every .cart-count element on the page */
  updateUI() {
    const count = this.items.length;
    document.querySelectorAll(".cart-count").forEach(el => {
      el.textContent = count;
      // Show/hide the badge bubble based on count
      el.style.display = count > 0 ? "" : "";
    });
  }

};

/* =========================
   AUTO INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  cart.updateUI();
});