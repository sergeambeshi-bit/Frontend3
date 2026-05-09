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

function getLang(){
  return localStorage.getItem("lang") || "fr";
}

function translateAdmin(key, params = {}){
  const messages = {
    fr: {
      adminPayoutMarkedPaid: "Paiement de {artist} marque comme paye",
      adminEditPromotion: "Modifier la promotion : {promo}",
      adminPromotionDeleted: "Promotion supprimee",
      adminInvestigatingUser: "Investigation de l'utilisateur : {user}",
      adminFraudResolved: "Cas de fraude resolu pour {user}"
    },
    en: {
      adminPayoutMarkedPaid: "Payout for {artist} marked as paid",
      adminEditPromotion: "Edit promotion: {promo}",
      adminPromotionDeleted: "Promotion deleted",
      adminInvestigatingUser: "Investigating user: {user}",
      adminFraudResolved: "Fraud case for {user} resolved"
    }
  };

  const template = messages[getLang()]?.[key] || key;
  return Object.entries(params).reduce((message, [name, value]) => {
    return message.replace(`{${name}}`, value);
  }, template);
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

      alert(translateAdmin("adminPayoutMarkedPaid", { artist }));
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

      alert(translateAdmin("adminEditPromotion", { promo }));
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

      alert(translateAdmin("adminPromotionDeleted"));
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

      alert(translateAdmin("adminInvestigatingUser", { user }));
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

      alert(translateAdmin("adminFraudResolved", { user }));
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