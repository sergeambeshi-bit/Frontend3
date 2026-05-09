import { applyLang, translate } from "./lang.js";

const LAST_CHECKOUT_KEY = "jenguLastCheckout";

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

function seedFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const type = String(params.get("type") || "music").toLowerCase();
  const item = {
    id: params.get("id") || "",
    name: params.get("name") || "",
    artist: params.get("artist") || "",
    cover: params.get("cover") || "/assets/placeholders/cover.jpg",
    price: Number(params.get("price") || 0)
  };

  return {
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

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildTicketQr(seed) {
  const grid = document.createElement("div");
  grid.className = "ticket-qr";

  const base = hashCode(seed || "JENGU");
  for (let i = 0; i < 289; i += 1) {
    const cell = document.createElement("span");
    const bit = ((base >> (i % 24)) ^ (i * 73)) & 1;
    if (bit) cell.className = "on";
    grid.appendChild(cell);
  }

  return grid;
}

function mountTypePanel(payload) {
  const panel = document.getElementById("successTypePanel");
  if (!panel) return;

  const type = String(payload?.type || "music").toLowerCase();
  const viewLink = payload?.viewLink || "/discover.html";

  if (type === "events") {
    panel.innerHTML = `
      <h2 class="checkout-title" data-i18n="checkoutTicket">Ticket</h2>
      <div class="ticket-box">
        <p class="ticket-code">${payload.ticketCode || "JNG-TICKET"}</p>
        <button class="checkout-mini" id="ticketViewBtn" data-i18n="view">View</button>
      </div>
    `;

    const box = panel.querySelector(".ticket-box");
    if (box) {
      box.prepend(buildTicketQr(payload.ticketCode || "JNG-TICKET"));
    }

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
      <p class="success-note" data-i18n="checkoutOrderConfirmed">Order confirmed. We will notify you with delivery updates.</p>
    `;
    return;
  }

  panel.innerHTML = `
    <h2 class="checkout-title" data-i18n="checkoutDownload">Download</h2>
    <button class="checkout-mini" id="downloadBtn" data-i18n="download">Download</button>
  `;

  const btn = document.getElementById("downloadBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      const blob = new Blob(["JENGU purchase confirmed"], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "jengu-download.txt";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    });
  }
}

export function initCheckoutSuccess() {
  const payload = getCheckoutPayload() || seedFromQuery();
  mountSummary(payload);
  mountTypePanel(payload);
  applyLang();
}
