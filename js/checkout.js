// js/checkout.js

import { cart } from "./cart.js";
import { savePurchase } from "./store.js";

const PAYMENT_API = "http://localhost:5050";

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
  alert("Paiement confirme");
  window.location.href = "/user/purchases.html";
}

async function tryOnlinePayment(amount, selectedMethod){
  const requiresPhone = selectedMethod === "mtn" || selectedMethod === "orange";
  const phone = requiresPhone ? prompt("Entrez votre numero Mobile Money") : "";

  if(requiresPhone && !phone){
    throw new Error("Numero requis pour Mobile Money");
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

  const form = document.querySelector('#checkout-form');
  if (!form) return;

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
      alert("Panier vide");
      return;
    }

    if(!selectedMethod){
      alert("Choisissez un moyen de paiement");
      return;
    }

      const total = cart.items.reduce((sum, item) => sum + (item.price || 0), 0);

      try {
        await tryOnlinePayment(total, selectedMethod);
        alert("Paiement en ligne initialise");
      } catch(error){
        console.warn("Online payment unavailable, fallback to local checkout:", error);
        alert("Passerelle indisponible. Finalisation locale de votre achat.");
      }

      completeCheckout(selectedMethod);
  });
}