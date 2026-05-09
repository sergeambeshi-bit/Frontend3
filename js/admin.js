// frontend/js/admin.js

/* =========================
   STORAGE HELPERS
========================= */

function getData(key){
  return JSON.parse(localStorage.getItem(key)) || [];
}

function saveData(key, data){
  localStorage.setItem(key, JSON.stringify(data));
}

/* =========================
   PAYOUT SYSTEM
========================= */

function handlePayouts(){
  document.querySelectorAll("#payout-list .btn-neon-outline").forEach((btn, index) => {
    btn.addEventListener("click", (e) => {

      const row = e.target.closest("tr");
      const artistCell = row ? row.querySelector("td:nth-child(2)") : null;
      const artist = artistCell ? artistCell.textContent : "";

      // Update UI
      const statusCell = row ? row.querySelector("td:nth-child(5)") : null;
      if (statusCell) statusCell.textContent = "Paid";
      statusCell.classList.add("status-paid");

      // Save to storage
      let payouts = getData("payouts");
      payouts[index] = { artist, status: "paid" };
      saveData("payouts", payouts);

      alert(`Payout for ${artist} marked as Paid`);
    });
  });
}

/* =========================
   PROMOTIONS SYSTEM
========================= */

function handlePromotions(){

  // Edit
  document.querySelectorAll("#promo-list .btn-neon-outline").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      const promoCell = row ? row.querySelector("td:nth-child(2)") : null;
      const promo = promoCell ? promoCell.textContent : "";

      alert(`Edit promotion: ${promo}`);
    });
  });

  // Delete
  document.querySelectorAll("#promo-list .btn-neon").forEach((btn, index) => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest("tr");

      row.remove();

      let promos = getData("promotions");
      promos.splice(index, 1);
      saveData("promotions", promos);

      alert("Promotion deleted");
    });
  });
}

/* =========================
   FRAUD SYSTEM
========================= */

function handleFraud(){

  // Investigate
  document.querySelectorAll("#fraud-list .btn-neon-outline").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      const investigateCell = row ? row.querySelector("td:nth-child(2)") : null;
      const user = investigateCell ? investigateCell.textContent : "";

      alert(`Investigating user: ${user}`);
    });
  });

  // Resolve
  document.querySelectorAll("#fraud-list .btn-neon").forEach((btn, index) => {
    btn.addEventListener("click", (e) => {

      const row = e.target.closest("tr");
      const resolveCell = row ? row.querySelector("td:nth-child(2)") : null;
      const user = resolveCell ? resolveCell.textContent : "";

      const statusCell = row ? row.querySelector("td:nth-child(5)") : null;
      if (statusCell) statusCell.textContent = "Resolved";
      statusCell.classList.add("status-resolved");

      let fraud = getData("fraud");
      fraud[index] = { user, status: "resolved" };
      saveData("fraud", fraud);

      alert(`Fraud case for ${user} resolved`);
    });
  });
}

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {
  handlePayouts();
  handlePromotions();
  handleFraud();
});