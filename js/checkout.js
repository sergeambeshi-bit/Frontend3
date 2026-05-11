import { cart } from "./cart.js";
import { savePurchase } from "./store.js";
import { translate } from "./lang.js";

const PAYMENT_API = window.JENGU_PAYMENT_API || "https://jengupay.vercel.app";
const LAST_CHECKOUT_KEY = "jenguLastCheckout";

function isMobileMoney(method) {
  return method === "mtn" || method === "orange";
}

function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (/^6\d{8}$/.test(digits)) return `+237${digits}`;
  if (/^2376\d{8}$/.test(digits)) return `+${digits}`;
  return "";
}

function detectNetwork(normalizedPhone) {
  const local = String(normalizedPhone || "").replace(/^\+237/, "");
  if (local.startsWith("67") || local.startsWith("68")) return "mtn";
  if (local.startsWith("69")) return "orange";
  return "unknown";
}

function fmtPrice(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("fr-FR")} XAF`;
}

function getPrimaryItem() {
  if (!Array.isArray(cart.items) || cart.items.length === 0) return null;
  return cart.items[0];
}

function setFeedback(message, tone) {
  const el = document.getElementById("checkoutFeedback");
  if (!el) return;
  el.textContent = message || "";
  el.dataset.tone = tone || "";
}

function setNetworkHint(message, tone) {
  const el = document.getElementById("networkHint");
  if (!el) return;
  el.textContent = message || "";
  el.dataset.tone = tone || "";
}

function setSpinner(visible) {
  const el = document.getElementById("checkoutSpinner");
  if (!el) return;
  el.hidden = !visible;
}

function renderSummary() {
  const card = document.getElementById("checkoutSummaryCard");
  const empty = document.getElementById("checkoutEmpty");
  const form = document.getElementById("checkoutForm");
  const primary = getPrimaryItem();

  if (!primary) {
    if (card) card.hidden = true;
    if (empty) empty.hidden = false;
    if (form) form.hidden = true;
    return null;
  }

  if (card) card.hidden = false;
  if (empty) empty.hidden = true;
  if (form) form.hidden = false;

  const image = document.getElementById("summaryImage");
  const name = document.getElementById("summaryName");
  const creator = document.getElementById("summaryCreator");
  const price = document.getElementById("summaryPrice");

  if (image) {
    image.src = primary.cover || "/assets/placeholders/cover.jpg";
    image.alt = primary.name || "Product";
  }
  if (name) name.textContent = primary.name || "Product";
  if (creator) creator.textContent = primary.artist || "Creator";

  const total = cart.items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const suffix = cart.items.length > 1 ? ` x${cart.items.length}` : "";
  if (price) price.textContent = `${fmtPrice(total)}${suffix}`;

  return primary;
}

function applyPayMethod(selectedMethod) {
  document.querySelectorAll(".pay-option").forEach((btn) => {
    const active = btn.dataset.method === selectedMethod;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-checked", active ? "true" : "false");
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 2200) {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Gateway timeout")), timeoutMs);
  });

  return Promise.race([fetch(url, options), timeout]);
}

async function probeGateway() {
  const endpoints = [
    `${PAYMENT_API}/api/payments/health`,
    `${PAYMENT_API}/`
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetchWithTimeout(endpoint, { method: "GET" });
      if (res.ok) return true;
    } catch (_err) {
      // Continue to next endpoint.
    }
  }

  return false;
}

async function initiatePayment({ amount, method, email, name }) {
  const isMomo = isMobileMoney(method);
  const phoneInput = document.getElementById("checkoutPhone");
  const normalizedPhone = normalizePhone(phoneInput?.value || "");

  if (isMomo && !normalizedPhone) {
    throw new Error(translate("checkoutPhoneInvalid"));
  }

  const payload = {
    amount,
    provider: method,
    email,
    name,
    currency: "XAF",
    phone: isMomo ? normalizedPhone : undefined
  };

  const res = await fetch(`${PAYMENT_API}/api/payments/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(translate("paymentFailed"));

  const data = await res.json().catch(() => ({}));
  if (data && data.success === false) {
    throw new Error(data.message || translate("paymentFailed"));
  }

  return data;
}

async function pollPaymentStatus(reference, timeoutMs = 90000) {
  if (!reference) return "confirmed";

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const res = await fetch(`${PAYMENT_API}/api/payments/status/${encodeURIComponent(reference)}`, {
      method: "GET"
    }).catch(() => null);

    if (res && res.ok) {
      const payload = await res.json().catch(() => ({}));
      const status = String(payload.status || "").toLowerCase();
      if (["success", "confirmed", "paid"].includes(status)) return "confirmed";
      if (["failed", "cancelled", "declined"].includes(status)) return "failed";
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  return "timeout";
}

function resolveCheckoutType(items) {
  const first = items[0] || {};
  const category = String(first.category || "").toLowerCase();

  if (category === "events") return "events";
  if (category === "merch") return "merch";
  if (category === "movies") return "movies";
  return "music";
}

function resolveViewLink(item, type) {
  if (!item || !item.id) return "/discover.html";
  if (type === "events") return `/event.html?id=${encodeURIComponent(item.id)}`;
  if (type === "movies") return `/movie.html?id=${encodeURIComponent(item.id)}`;
  if (type === "merch") return `/merch-product.html?id=${encodeURIComponent(item.id)}`;
  if (String(item.kind || "").toLowerCase() === "album") {
    return `/album.html?id=${encodeURIComponent(item.id)}`;
  }
  return `/track.html?id=${encodeURIComponent(item.id)}`;
}

function persistCheckout(email, name, method) {
  const items = [...cart.items];
  const total = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const type = resolveCheckoutType(items);
  const primary = items[0] || null;

  const payload = {
    ts: Date.now(),
    email,
    name,
    method,
    type,
    total,
    count: items.length,
    item: primary,
    viewLink: resolveViewLink(primary, type),
    ticketCode: `JNG-${Date.now().toString(36).toUpperCase()}`
  };

  sessionStorage.setItem(LAST_CHECKOUT_KEY, JSON.stringify(payload));
}

function completeCheckout(method) {
  cart.items.forEach((item) => {
    savePurchase({
      ...item,
      paymentMethod: method
    });
  });

  cart.clear();
}

function setLoading(isLoading) {
  const payBtn = document.getElementById("checkoutPayBtn");
  const email = document.getElementById("checkoutEmail");
  const name = document.getElementById("checkoutName");
  const phone = document.getElementById("checkoutPhone");

  document.querySelectorAll(".pay-option").forEach((btn) => {
    btn.disabled = isLoading;
  });

  if (email) email.disabled = isLoading;
  if (name) name.disabled = isLoading;
  if (phone) phone.disabled = isLoading;

  if (!payBtn) return;
  payBtn.disabled = isLoading;
  payBtn.textContent = isLoading ? translate("checkoutProcessing") : translate("pay");
}

function updatePhoneUI(method) {
  const phoneBlock = document.getElementById("phoneBlock");
  const phoneInput = document.getElementById("checkoutPhone");
  if (!phoneBlock || !phoneInput) return;

  const mobile = isMobileMoney(method);
  phoneBlock.hidden = !mobile;
  phoneInput.required = mobile;

  if (!mobile) {
    setNetworkHint("", "");
  }
}

function handlePhoneDetection(method) {
  const phoneInput = document.getElementById("checkoutPhone");
  if (!phoneInput) return;

  const normalized = normalizePhone(phoneInput.value || "");
  if (!normalized) {
    setNetworkHint("", "");
    return;
  }

  const detected = detectNetwork(normalized);
  if (detected === "unknown") {
    setNetworkHint(translate("checkoutNetworkUnknown"), "neutral");
    return;
  }

  const label = detected === "mtn" ? "MTN" : "Orange";
  setNetworkHint(`${translate("checkoutNetwork")}: ${label}`, "ok");

  if (isMobileMoney(method) && detected !== method) {
    setNetworkHint(translate("checkoutNetworkMismatch"), "warn");
  }
}

export function initCheckout() {
  let selectedMethod = "mtn";
  renderSummary();
  applyPayMethod(selectedMethod);
  updatePhoneUI(selectedMethod);

  const backBtn = document.getElementById("checkoutBackBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.history.back();
    });
  }

  document.querySelectorAll(".pay-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedMethod = btn.dataset.method || "mtn";
      applyPayMethod(selectedMethod);
      updatePhoneUI(selectedMethod);
      handlePhoneDetection(selectedMethod);
      setFeedback("", "");
    });
  });

  const phoneInput = document.getElementById("checkoutPhone");
  if (phoneInput) {
    phoneInput.addEventListener("input", () => {
      handlePhoneDetection(selectedMethod);
    });
  }

  const form = document.getElementById("checkoutForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!cart.items.length) {
      setFeedback(translate("cartEmpty"), "error");
      return;
    }

    const emailInput = document.getElementById("checkoutEmail");
    const nameInput = document.getElementById("checkoutName");

    const email = (emailInput?.value || "").trim();
    const name = (nameInput?.value || "").trim();
    const phoneInputRef = document.getElementById("checkoutPhone");
    const normalizedPhone = normalizePhone(phoneInputRef?.value || "");

    if (!email) {
      setFeedback(translate("checkoutEmailRequired"), "error");
      if (emailInput) emailInput.focus();
      return;
    }

    if (isMobileMoney(selectedMethod) && !normalizedPhone) {
      setFeedback(translate("checkoutPhoneInvalid"), "error");
      if (phoneInputRef) phoneInputRef.focus();
      return;
    }

    if (isMobileMoney(selectedMethod)) {
      setFeedback(translate("checkoutConfirmPhone"), "loading");
    }

    const total = cart.items.reduce((sum, item) => sum + Number(item.price || 0), 0);

    setLoading(true);
    setSpinner(true);
    setFeedback(translate("checkoutWaiting"), "loading");

    try {
      const online = await probeGateway();
      if (!online) {
        throw new Error(translate("gatewayUnavailable"));
      }

      const paymentData = await initiatePayment({ amount: total, method: selectedMethod, email, name });
      const reference = paymentData?.reference || paymentData?.transactionId || paymentData?.id || "";

      if (isMobileMoney(selectedMethod)) {
        setFeedback(translate("checkoutConfirmPhone"), "loading");
      }

      const status = await pollPaymentStatus(reference);
      if (status === "timeout") {
        throw new Error(translate("checkoutTimeout"));
      }
      if (status === "failed") {
        throw new Error(translate("paymentFailed"));
      }

      persistCheckout(email, name, selectedMethod);
      completeCheckout(selectedMethod);
      window.location.href = "/checkout-success.html";
    } catch (error) {
      setFeedback(error?.message || translate("paymentFailed"), "error");
    } finally {
      setSpinner(false);
      setLoading(false);
    }
  });
}
