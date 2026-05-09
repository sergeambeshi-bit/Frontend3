// js/checkout.js

import { cart } from "./cart.js";
import { savePurchase } from "./store.js";
import { translate } from "./lang.js";

const PAYMENT_API = "https://jengupay.vercel.app";

function updateGatewayStatus(state){
  const el = document.getElementById("paymentGatewayStatus");
  if(!el) return;

  el.dataset.state = state;

  if(state === "online"){
    el.textContent = translate("gatewayStatusOnline");
    return;
  }

  if(state === "offline"){
    el.textContent = translate("gatewayStatusOffline");
    return;
  }

  el.textContent = translate("gatewayStatusChecking");
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
      <div class="chart-item" data-item-id="${item.id}">
        <img src="${item.cover}">
        <div class="info">
          <b>${item.name}</b>
          <p>${item.artist}</p>
        </div>
        <div class="price">${item.price} XAF</div>
        <button class="remove-item" aria-label="Remove from cart">✕</button>
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
  alert(translate("paymentConfirmed"));
  window.location.href = "/user/purchases.html";
}

async function tryOnlinePayment(amount, selectedMethod){
  const requiresPhone = selectedMethod === "mtn" || selectedMethod === "orange";
  let phone = "";

  if(requiresPhone){
    const input = document.getElementById("mobilePhone");
    phone = input ? input.value.trim() : "";
    if(!phone){
      if(input) input.focus();
      throw new Error(translate("mobileRequired"));
    }
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
    throw new Error(translate("paymentFailed"));
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

  /* REMOVE ITEM FROM CART */
  document.addEventListener("click", e => {
    if (!e.target.classList.contains("remove-item")) return;
    
    const itemContainer = e.target.closest(".chart-item");
    if (!itemContainer) return;
    
    const itemId = itemContainer.dataset.itemId;
    if (!itemId) return;
    
    cart.remove(itemId);
    renderCheckout();
  });

  /* SELECT PAYMENT */
  const phoneField = document.getElementById("mobile-phone-field");

  document.querySelectorAll(".pay-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      selectedMethod = btn.dataset.method;

      document.querySelectorAll(".pay-btn").forEach(b=>{
        b.style.background = "#222";
        b.style.color = "white";
      });

      btn.style.background = "#01d4ab";
      btn.style.color = "black";

      const isMobile = selectedMethod === "mtn" || selectedMethod === "orange";
      if(phoneField){
        phoneField.style.display = isMobile ? "block" : "none";
        if(!isMobile){
          const input = document.getElementById("mobilePhone");
          if(input) input.value = "";
        }
      }
    });
  });

  /* SUBMIT */
    form.addEventListener("submit", async e => {
    e.preventDefault();

    if(cart.items.length === 0){
      alert(translate("cartEmpty"));
      return;
    }

    if(!selectedMethod){
      alert(translate("chooseMethod"));
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
          throw new Error(translate("gatewayUnavailable"));
        }

        await tryOnlinePayment(total, selectedMethod);
        alert(translate("paymentStarted"));
        completeCheckout(selectedMethod);
      } catch(error){
        console.warn("Payment failed:", error);
        updateGatewayStatus("offline");
        alert(error?.message || translate("paymentFailed"));
      } finally {
        if(submitBtn){
          submitBtn.disabled = false;
          submitBtn.style.opacity = "1";
        }
      }
  });
}