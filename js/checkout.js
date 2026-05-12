import { cart } from "./cart.js";
import { savePurchase } from "./store.js";
import { translate } from "./lang.js";
import {
  detectMobileNetwork,
  validateMobileMoneyPhone,
  getNetworkConfig,
  getMobileMoneyInstruction,
  calculatePaymentTimeout,
  validatePaymentAmount,
  logMobileMoneyEvent,
  getMobileMoneyErrorMessage,
  estimatePaymentTime,
  getPaymentMethodPriority,
  detectSlowNetwork,
  getBandwidthOptimization
} from "./mobile-money.js";

const PAYMENT_API = window.JENGU_PAYMENT_API || "https://jengupay.vercel.app";
const BACKEND_API = window.JENGU_BACKEND_API || PAYMENT_API;
const LAST_CHECKOUT_KEY = "jenguLastCheckout";

function isMobileMoney(method) {
  return method === "mtn" || method === "orange";
}

function normalizePhone(raw) {
  const result = validateMobileMoneyPhone(raw);
  return result.valid ? result.normalized : "";
}

function detectNetwork(normalizedPhone) {
  const detected = detectMobileNetwork(normalizedPhone);
  logMobileMoneyEvent("network_detected", { phone: normalizedPhone, network: detected });
  return detected;
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

  // Generate idempotency key to prevent duplicate charges
  const idempotencyKey = `jengu-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const payload = {
    amount,
    provider: method,
    email,
    name,
    currency: "XAF",
    phone: isMomo ? normalizedPhone : undefined,
    itemIds: cart.items.map((item) => String(item.id || item.name || ""))
  };

  const res = await fetch(`${PAYMENT_API}/api/payments/initiate`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
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

async function verifyOrderConfirmation(reference, timeoutMs = 120000) {
  /**
   * Query backend to verify order is actually confirmed by payment provider.
   * This prevents the race condition where frontend thinks payment succeeded
   * but webhook hasn't been processed yet.
   */
  const startedAt = Date.now();
  
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`${BACKEND_API}/api/orders/${encodeURIComponent(reference)}`, {
        method: "GET"
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.status === "confirmed") {
          return { confirmed: true, order: data };
        }
        if (data.success && data.status === "failed") {
          return { confirmed: false, order: data };
        }
      }
    } catch (_err) {
      // Network error, continue retrying
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Timeout reached - backend never confirmed
  return { confirmed: false, reason: "timeout" };
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

function persistCheckout(email, name, method, reference) {
  const items = [...cart.items];
  const total = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const type = resolveCheckoutType(items);
  const primary = items[0] || null;

  const payload = {
    ts: Date.now(),
    reference,
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
  // Detect if user is on slow network for optimization
  const isSlowNetwork = detectSlowNetwork();
  if (isSlowNetwork) {
    const body = document.body;
    if (body) body.classList.add("slow-network");
  }

  // Start with MTN (primary Mobile Money method)
  let selectedMethod = "mtn";
  logMobileMoneyEvent("checkout_started", { method: selectedMethod, slowNetwork: isSlowNetwork });

  renderSummary();
  applyPayMethod(selectedMethod);
  updatePhoneUI(selectedMethod);

  // Show network performance hint if slow connection
  if (isSlowNetwork) {
    const hint = document.getElementById("networkHint");
    if (hint) {
      hint.textContent = translate("checkoutConnectionSlow");
      hint.dataset.tone = "info";
    }
  }

  const backBtn = document.getElementById("checkoutBackBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.history.back();
    });
  }

  document.querySelectorAll(".pay-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedMethod = btn.dataset.method || "mtn";
      logMobileMoneyEvent("payment_method_changed", { method: selectedMethod });
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
      logMobileMoneyEvent("payment_error", { reason: "empty_cart" });
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
      logMobileMoneyEvent("payment_error", { reason: "no_email" });
      return;
    }

    if (isMobileMoney(selectedMethod) && !normalizedPhone) {
      setFeedback(translate("checkoutPhoneInvalid"), "error");
      if (phoneInputRef) phoneInputRef.focus();
      logMobileMoneyEvent("payment_error", { reason: "invalid_phone", method: selectedMethod });
      return;
    }

    // Validate amount for Mobile Money
    const total = cart.items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    if (isMobileMoney(selectedMethod)) {
      const amountCheck = validatePaymentAmount(selectedMethod, total);
      if (!amountCheck.valid) {
        setFeedback(amountCheck.error, "error");
        logMobileMoneyEvent("payment_error", { reason: "invalid_amount", method: selectedMethod, amount: total });
        return;
      }
    }

    if (isMobileMoney(selectedMethod)) {
      const network = detectNetwork(normalizedPhone);
      const instruction = getMobileMoneyInstruction(selectedMethod, normalizedPhone);
      setFeedback(instruction, "loading");
      logMobileMoneyEvent("payment_initiated", {
        method: selectedMethod,
        network,
        amount: total,
        email,
        slowNetwork: isSlowNetwork
      });
    }

    setLoading(true);
    setSpinner(true);
    
    const timeout = calculatePaymentTimeout(isSlowNetwork);
    const timeEstimate = estimatePaymentTime(isSlowNetwork);
    setFeedback(`${translate("checkoutWaiting")} (${timeEstimate})`, "loading");

    try {
      const online = await probeGateway();
      if (!online) {
        throw new Error(translate("gatewayUnavailable"));
      }

      const paymentData = await initiatePayment({ amount: total, method: selectedMethod, email, name });
      const reference = paymentData?.reference || paymentData?.transactionId || paymentData?.id || "";

      if (!reference) {
        throw new Error(translate("paymentFailed"));
      }

      logMobileMoneyEvent("payment_request_sent", { reference, method: selectedMethod });

      if (isMobileMoney(selectedMethod)) {
        const network = detectNetwork(normalizedPhone);
        const confirm = network === "mtn" ? translate("checkoutConfirmMTN") : translate("checkoutConfirmOrange");
        setFeedback(confirm, "loading");
      }

      // Important: Wait for webhook confirmation from backend before finishing checkout
      setFeedback(translate("checkoutWaitingConfirmation") || "Awaiting payment confirmation...", "loading");
      
      const verification = await verifyOrderConfirmation(reference, timeout);
      
      if (!verification.confirmed) {
        if (verification.reason === "timeout") {
          logMobileMoneyEvent("payment_timeout", { reference, method: selectedMethod });
          throw new Error(translate("mobileMoneyTimeout") || translate("checkoutTimeout"));
        } else {
          logMobileMoneyEvent("payment_failed", { reference, method: selectedMethod });
          throw new Error(translate("paymentFailed") || "Payment was not confirmed");
        }
      }

      logMobileMoneyEvent("payment_confirmed", { reference, method: selectedMethod });

      // Only NOW that backend has confirmed the payment, save the purchase locally
      persistCheckout(email, name, selectedMethod, reference);
      completeCheckout(selectedMethod);
      
      window.location.href = `/checkout-success.html?reference=${encodeURIComponent(reference)}`;
    } catch (error) {
      const userMessage = isMobileMoney(selectedMethod)
        ? getMobileMoneyErrorMessage(error?.message || "", selectedMethod)
        : error?.message || translate("paymentFailed");
      
      setFeedback(userMessage, "error");
      logMobileMoneyEvent("payment_error", {
        method: selectedMethod,
        error: error?.message,
        slowNetwork: isSlowNetwork
      });
    } finally {
      setSpinner(false);
      setLoading(false);
    }
  });
}
