import { applyLang, translate } from "./lang.js";

const LAST_CHECKOUT_KEY = "jenguLastCheckout";
const BACKEND_API = window.JENGU_BACKEND_API || window.JENGU_PAYMENT_API || "http://localhost:8080";

function fmtPrice(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("fr-FR")} XAF`;
}

function getCheckoutPayload() {
  try {
    const raw = sessionStorage.getItem(LAST_CHECKOUT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

/**
 * Fetch actual order confirmation from backend
 * This ensures we show real delivery details, not just browser state
 */
async function fetchOrderConfirmation(reference) {
  try {
    const res = await fetch(`${BACKEND_API}/api/orders/${encodeURIComponent(reference)}`);
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (_err) {
    return null;
  }
}

function seedFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const type = String(params.get("type") || "music").toLowerCase();
  const reference =
    params.get("reference") ||
    params.get("transaction_id") ||
    params.get("transactionId") ||
    "";
  const item = {
    id: params.get("id") || "",
    name: params.get("name") || "",
    artist: params.get("artist") || "",
    cover: params.get("cover") || "/assets/placeholders/cover.jpg",
    price: Number(params.get("price") || 0)
  };

  return {
    reference,
    type,
    item,
    total: item.price,
    viewLink: "/discover.html",
    ticketCode: `JNG-${Date.now().toString(36).toUpperCase()}`
  };
}

function mountSummary(payload) {
  const card = document.getElementById("successSummaryCard");
  if (!card) return;

  const item = payload?.item;
  if (!item) {
    card.hidden = true;
    return;
  }

  const img = document.getElementById("successImage");
  const name = document.getElementById("successName");
  const creator = document.getElementById("successCreator");
  const price = document.getElementById("successPrice");

  if (img) {
    img.src = item.cover || "/assets/placeholders/cover.jpg";
    img.alt = item.name || "Product";
  }
  if (name) name.textContent = item.name || "Product";
  if (creator) creator.textContent = item.artist || "Creator";
  if (price) price.textContent = fmtPrice(payload.total || item.price || 0);

  card.hidden = false;
}

function mountTypePanel(payload, orderData) {
  const panel = document.getElementById("successTypePanel");
  if (!panel) return;

  const type = String(payload?.type || "music").toLowerCase();
  const viewLink = payload?.viewLink || "/discover.html";
  const ticketCode = payload?.ticketCode || orderData?.reference || "JENGU-TICKET";
  const hasReference = Boolean(payload?.reference);
  const orderStatus = String(orderData?.status || "").toLowerCase();
  const isPaid = ["confirmed", "success", "paid"].includes(orderStatus);

  if (hasReference && !orderData) {
    panel.innerHTML = `
      <h2 class="checkout-title">Order Verification</h2>
      <p class="success-note">We could not verify your order with the backend right now.</p>
      <p class="success-note">Please check your purchases page in a moment or retry from your order link.</p>
    `;
    return;
  }

  if (hasReference && orderData && !isPaid) {
    panel.innerHTML = `
      <h2 class="checkout-title">Order Status</h2>
      <p class="success-note">Payment status: ${orderStatus || "pending"}</p>
      <p class="success-note">Your purchase will unlock automatically once payment is confirmed.</p>
    `;
    return;
  }

  if (!hasReference) {
    panel.innerHTML = `
      <h2 class="checkout-title">Order Verification</h2>
      <p class="success-note">Order reference is missing, so delivery cannot be verified.</p>
      <p class="success-note">Please complete checkout again from your cart to unlock this purchase.</p>
    `;
    return;
  }

  if (type === "events") {
    panel.innerHTML = `
      <h2 class="checkout-title" data-i18n="checkoutTicket">Ticket</h2>
      <div class="ticket-box">
        <p class="ticket-code">${ticketCode}</p>
        <p class="ticket-note">✓ Ticket confirmed and linked to your paid order</p>
        <button class="checkout-mini" id="ticketViewBtn" data-i18n="view">View</button>
      </div>
    `;

    const viewBtn = document.getElementById("ticketViewBtn");
    if (viewBtn) {
      viewBtn.addEventListener("click", () => {
        window.location.href = viewLink;
      });
    }

    return;
  }

  if (type === "merch") {
    panel.innerHTML = `
      <h2 class="checkout-title" data-i18n="checkoutOrder">Order</h2>
      <p class="success-note">✓ Order confirmed. Confirmation email sent to your inbox.</p>
      <p class="success-note">📦 Expected delivery: 5-7 business days</p>
    `;
    return;
  }

  // Music/Movies/Albums
  panel.innerHTML = `
    <h2 class="checkout-title" data-i18n="checkoutDownload">Download</h2>
    <p class="success-note">✓ Your paid order is confirmed.</p>
    <p class="success-note">Download delivery is handled from backend fulfillment links and your email receipt.</p>
    <button class="checkout-mini" id="downloadViewBtn" data-i18n="view">View</button>
  `;

  const btn = document.getElementById("downloadViewBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      window.location.href = viewLink;
    });
  }
}

export async function initCheckoutSuccess() {
  const payload = getCheckoutPayload() || seedFromQuery();
  
  // Try to fetch actual order data from backend for real confirmation details
  let orderData = null;
  if (payload?.reference) {
    orderData = await fetchOrderConfirmation(payload.reference);
  }

  const heading = document.querySelector(".checkout-heading");
  const orderStatus = String(orderData?.status || "").toLowerCase();
  const isPaid = ["confirmed", "success", "paid"].includes(orderStatus);
  if (heading) {
    heading.textContent = isPaid ? translate("checkoutSuccess") : "Order Verification";
  }

  mountSummary(payload);
  mountTypePanel(payload, orderData);
  applyLang();
}
