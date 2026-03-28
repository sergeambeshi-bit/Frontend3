// js/cart.js

/* =========================
   STORAGE
========================= */
function loadCart(){
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(items){
  localStorage.setItem("cart", JSON.stringify(items));
}

/* =========================
   CART SYSTEM
========================= */
export const cart = {

  items: loadCart(),

  add(item){

    // prevent duplicates
    const exists = this.items.find(i => i.id === item.id);

    if(exists){
      alert("Déjà dans le panier");
      return;
    }

    this.items.push(item);
    saveCart(this.items);
    this.updateUI();

    alert("Ajouté au panier");
  },

  remove(itemId){
    this.items = this.items.filter(i => i.id !== itemId);
    saveCart(this.items);
    this.updateUI();
  },

  clear(){
    this.items = [];
    saveCart(this.items);
    this.updateUI();
  },

  updateUI(){
    const countEl = document.querySelector('.cart-count');
    if (countEl) countEl.innerText = this.items.length;
  }

};

/* =========================
   AUTO INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  cart.updateUI();
});

/* =========================
   BUTTON HANDLER
========================= */
document.addEventListener("click", (e)=>{

  if(e.target.classList.contains("add-to-cart")){

    const card = e.target.closest(".card");

    const item = {
      id: Date.now(),
      name: card.querySelector(".title")?.innerText,
      artist: "Artist",
      cover: card.querySelector("img")?.src,
      price: 300
    };

    cart.add(item);
  }

});