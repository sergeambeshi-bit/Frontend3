// js/checkout.js

import { cart } from "./cart.js";
import { savePurchase } from "./store.js";
import { getLang } from "./lang.js";

const PAYMENT_API = "http://localhost:5050";

const messages = {
  fr: {
    gatewayChecking: "Verification de la passerelle de paiement...",
    gatewayOnline: "JenguPay est en ligne. Paiement actif.",
    gatewayOffline: "JenguPay est indisponible. Verifiez le serveur puis reessayez.",
    cartEmpty: "Panier vide",
    chooseMethod: "Choisissez un moyen de paiement",
    mobilePrompt: "Entrez votre numero Mobile Money",
    mobileRequired: "Numero requis pour Mobile Money",
    paymentStarted: "Paiement en ligne initialise",
    paymentConfirmed: "Paiement confirme",
    gatewayUnavailable: "Paiement impossible: JenguPay est hors ligne.",
    paymentFailed: "Paiement echoue. Veuillez reessayer."
  },
  en: {
    gatewayChecking: "Checking payment gateway...",
    gatewayOnline: "JenguPay is online. Payments are active.",
    gatewayOffline: "JenguPay is unavailable. Start the server and try again.",
    cartEmpty: "Cart is empty",
    chooseMethod: "Choose a payment method",
    mobilePrompt: "Enter your Mobile Money number",
    mobileRequired: "Mobile number is required for Mobile Money",
    paymentStarted: "Online payment initialized",
    paymentConfirmed: "Payment confirmed",
    gatewayUnavailable: "Payment unavailable: JenguPay is offline.",
    paymentFailed: "Payment failed. Please try again."
  }
};

function t(key){
  const lang = getLang() === "en" ? "en" : "fr";
  return messages[lang][key] || key;
}

function updateGatewayStatus(state){
  const el = document.getElementById("paymentGatewayStatus");
  if(!el) return;

  el.dataset.state = state;

  if(state === "online"){
    el.textContent = t("gatewayOnline");
    return;
  }

  if(state === "offline"){
    el.textContent = t("gatewayOffline");
    return;
  }

  el.textContent = t("gatewayChecking");
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 2500){
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Gateway timeout")), timeoutMs);
  });

  return Promise.race([
    fetch(url, options),
    timeout
  ]);
}

async function probeGateway(){
  updateGatewayStatus("checking");

  const endpoints = [
    `${PAYMENT_API}/api/payments/health`,
    `${PAYMENT_API}/`
  ];

  for(const endpoint of endpoints){
    try {
      const res = await fetchWithTimeout(endpoint, { method: "GET" });
      if(res.ok){
        updateGatewayStatus("online");
        return true;
      }
    } catch(_err){
      // Try next endpoint.
    }
  }

  updateGatewayStatus("offline");
  return false;
}

/* =========================
   RENDER CHECKOUT
========================= */
function renderCheckout(){

  const container = document.getElementById("checkoutItems");
  const totalEl = document.getElementById("checkoutTotal");

  if(!container) return;

  container.innerHTML = "";

  let total = 0;

  cart.items.forEach(item => {
    total += item.price;

    container.innerHTML += `
      <div class="chart-item">
        <img src="${item.cover}">
        <div class="info">
          <b>${item.name}</b>
          <p>${item.artist}</p>
        </div>
        <div class="price">${item.price} XAF</div>
      </div>
    `;
  });

  if(totalEl){
    totalEl.textContent = total + " XAF";
  }
}

function completeCheckout(selectedMethod){
  cart.items.forEach(item => {
    savePurchase({
      ...item,
      paymentMethod: selectedMethod
    });
  });

  cart.clear();
  alert(t("paymentConfirmed"));
  window.location.href = "/user/purchases.html";
}

async function tryOnlinePayment(amount, selectedMethod){
  const requiresPhone = selectedMethod === "mtn" || selectedMethod === "orange";
  const phone = requiresPhone ? prompt(t("mobilePrompt")) : "";

  if(requiresPhone && !phone){
    throw new Error(t("mobileRequired"));
  }

  const res = await fetch(`${PAYMENT_API}/api/payments/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount,
      provider: selectedMethod,
      phone
    })
  });

  if(!res.ok){
    throw new Error("Payment API unavailable");
  }

  const data = await res.json();

  if(!data.success){
    throw new Error(data.message || "Payment initiation failed");
  }
}

/* =========================
   CHECKOUT
========================= */
export function initCheckout() {

  renderCheckout();
  probeGateway();

  const form = document.querySelector('#checkout-form');
  if (!form) return;

  const submitBtn = form.querySelector("button[type='submit']");

  let selectedMethod = null;

  /* SELECT PAYMENT */
  document.querySelectorAll(".pay-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      selectedMethod = btn.dataset.method;

      document.querySelectorAll(".pay-btn").forEach(b=>{
        b.style.background = "#222";
        b.style.color = "white";
      });

      btn.style.background = "#01d4ab";
      btn.style.color = "black";
    });
  });

  /* SUBMIT */
    form.addEventListener("submit", async e => {
    e.preventDefault();

    if(cart.items.length === 0){
      alert(t("cartEmpty"));
      return;
    }

    if(!selectedMethod){
      alert(t("chooseMethod"));
      return;
    }

      if(submitBtn){
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.7";
      }

      const total = cart.items.reduce((sum, item) => sum + (item.price || 0), 0);

      try {
        const gatewayUp = await probeGateway();
        if(!gatewayUp){
          throw new Error(t("gatewayUnavailable"));
        }

        await tryOnlinePayment(total, selectedMethod);
        alert(t("paymentStarted"));
        completeCheckout(selectedMethod);
      } catch(error){
        console.warn("Payment failed:", error);
        updateGatewayStatus("offline");
        alert(error?.message || t("paymentFailed"));
      } finally {
        if(submitBtn){
          submitBtn.disabled = false;
          submitBtn.style.opacity = "1";
        }
      }
  });
}