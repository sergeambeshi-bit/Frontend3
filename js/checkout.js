// js/checkout.js

import { cart } from "./cart.js";
import { savePurchase } from "./store.js";

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
  form.addEventListener('submit', e => {
    e.preventDefault();

    if(cart.items.length === 0){
      alert("Panier vide");
      return;
    }

    if(!selectedMethod){
      alert("Choisissez un moyen de paiement");
      return;
    }

    /* SAVE ALL PURCHASES */
    cart.items.forEach(item => {
      savePurchase(item);
    });

    /* CLEAR CART */
    cart.clear();

    alert("Paiement réussi 🎉");

    window.location.href = "/user/purchases.html";
  });
}