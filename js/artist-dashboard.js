// frontend/js/artist-dashboard.js

/* =========================
   STORAGE HELPERS
========================= */

function getCatalog(){
  return JSON.parse(localStorage.getItem("artist_catalog")) || [];
}

function saveCatalog(data){
  localStorage.setItem("artist_catalog", JSON.stringify(data));
}

/* =========================
   UPLOAD TRACK
========================= */

function handleUploadTrack(){

  document.querySelectorAll(".btn-upload-track").forEach(btn => {
    btn.addEventListener("click", () => {

      const name = prompt("Nom du morceau ?");
      const artist = prompt("Nom de l'artiste ?");
      const album = prompt("Nom de l'album ?");

      if(!name) return;

      const newTrack = {
        name,
        artist,
        album,
        cover: "/assets/covers/cover1.png"
      };

      const catalog = getCatalog();
      catalog.push(newTrack);
      saveCatalog(catalog);

      alert("Morceau ajouté !");
      renderCatalog();
    });
  });

}

/* =========================
   UPLOAD ALBUM
========================= */

function handleUploadAlbum(){

  document.querySelectorAll(".btn-upload-album").forEach(btn => {
    btn.addEventListener("click", () => {

      const album = prompt("Nom de l'album ?");
      const artist = prompt("Nom de l'artiste ?");

      if(!album) return;

      const newAlbum = {
        name: album,
        artist,
        album,
        cover: "/assets/covers/cover2.png"
      };

      const catalog = getCatalog();
      catalog.push(newAlbum);
      saveCatalog(catalog);

      alert("Album ajouté !");
      renderCatalog();
    });
  });

}

/* =========================
   RENDER CATALOG
========================= */

function renderCatalog(){

  const container = document.querySelector(".artist-catalog tbody");
  if(!container) return;

  const catalog = getCatalog();

  container.innerHTML = "";

  catalog.forEach((item, index)=>{
    container.innerHTML += `
      <tr>
        <td>${index+1}</td>
        <td>${item.name}</td>
        <td>${item.artist}</td>
        <td>${item.album || "-"}</td>
        <td>
          <button class="btn-edit" data-index="${index}">Edit</button>
          <button class="btn-delete" data-index="${index}">Delete</button>
        </td>
      </tr>
    `;
  });

  attachCatalogActions();
}

/* =========================
   EDIT / DELETE
========================= */

function attachCatalogActions(){

  // EDIT
  document.querySelectorAll(".btn-edit").forEach(btn => {
    btn.addEventListener("click", (e) => {

      const index = e.target.dataset.index;
      const catalog = getCatalog();

      const newName = prompt("Nouveau nom :", catalog[index].name);
      if(!newName) return;

      catalog[index].name = newName;
      saveCatalog(catalog);

      renderCatalog();
    });
  });

  // DELETE
  document.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", (e) => {

      const index = e.target.dataset.index;
      const catalog = getCatalog();

      catalog.splice(index, 1);
      saveCatalog(catalog);

      renderCatalog();
    });
  });

}

/* =========================
   ANALYTICS (BASIC)
========================= */

function handleStats(){
  document.querySelectorAll(".artist-stat").forEach(stat => {
    stat.addEventListener("click", () => {
      alert(`Analytics: ${stat.dataset.statName}`);
    });
  });
}

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {
  handleUploadTrack();
  handleUploadAlbum();
  handleStats();
  renderCatalog();
});