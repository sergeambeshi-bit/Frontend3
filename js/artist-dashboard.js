// frontend/js/artist-dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  // Upload Track / Album buttons
  document.querySelectorAll(".btn-upload-track").forEach(btn => {
    btn.addEventListener("click", () => {
      alert("Track upload modal opens (placeholder)");
    });
  });

  document.querySelectorAll(".btn-upload-album").forEach(btn => {
    btn.addEventListener("click", () => {
      alert("Album upload modal opens (placeholder)");
    });
  });

  // Handle Analytics / Stats updates
  const stats = document.querySelectorAll(".artist-stat");
  stats.forEach(stat => {
    stat.addEventListener("click", () => {
      alert(`Showing detailed analytics for ${stat.dataset.statName}`);
    });
  });

  // Catalog actions
  document.querySelectorAll(".artist-catalog .btn-edit").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      alert(`Edit track/album: ${row.querySelector("td:nth-child(2)").textContent}`);
    });
  });

  document.querySelectorAll(".artist-catalog .btn-delete").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      row.remove();
      alert("Track/album removed from catalog");
    });
  });
});