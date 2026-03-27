// js/checkout.js

export function initCheckout() {
  const form = document.querySelector('#checkout-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    alert('Checkout submitted! (placeholder)');
  });
}