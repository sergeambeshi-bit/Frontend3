// frontend/js/admin.js

document.addEventListener("DOMContentLoaded", () => {
  // Handle Payouts
  document.querySelectorAll("#payout-list .btn-neon-outline").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      row.querySelector("td:nth-child(5)").textContent = "Paid";
      row.querySelector("td:nth-child(5)").classList.add("status-paid");
      alert(`Payout for ${row.querySelector("td:nth-child(2)").textContent} marked as Paid`);
    });
  });

  // Handle Promotions
  document.querySelectorAll("#promo-list .btn-neon-outline").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      alert(`Edit promotion: ${row.querySelector("td:nth-child(2)").textContent}`);
    });
  });

  document.querySelectorAll("#promo-list .btn-neon").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      row.remove();
      alert("Promotion deleted");
    });
  });

  // Handle Fraud
  document.querySelectorAll("#fraud-list .btn-neon-outline").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      alert(`Investigating user: ${row.querySelector("td:nth-child(2)").textContent}`);
    });
  });

  document.querySelectorAll("#fraud-list .btn-neon").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      row.querySelector("td:nth-child(5)").textContent = "Resolved";
      row.querySelector("td:nth-child(5)").classList.add("status-resolved");
      alert(`Fraud case for ${row.querySelector("td:nth-child(2)").textContent} marked as Resolved`);
    });
  });
});