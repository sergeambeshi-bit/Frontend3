// js/cart.js

export const cart = {
  items: [],
  add(item) {
    this.items.push(item);
    this.updateUI();
  },
  remove(itemId) {
    this.items = this.items.filter(i => i.id !== itemId);
    this.updateUI();
  },
  updateUI() {
    const countEl = document.querySelector('.cart-count');
    if (countEl) countEl.innerText = this.items.length;
  }
};

// Example: wire buttons
document.querySelectorAll('.add-to-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    const trackId = btn.dataset.trackId;
    cart.add({ id: trackId });
  });
});