// js/library.js

/* =========================
   GET PURCHASES
========================= */
function getPurchases(){
  return JSON.parse(localStorage.getItem("purchases")) || [];
}

/* =========================
   LOAD LIBRARY
========================= */
export function loadLibrary() {

  const container = document.querySelector('.user-library');
  if (!container) return;

  const purchases = getPurchases();

  /* EMPTY STATE */
  if(purchases.length === 0){
    container.innerHTML = `
      <p class="sub" style="text-align:center;">
        Votre bibliothèque est vide
      </p>
    `;
    return;
  }

  /* RENDER */
  container.innerHTML = "";

  purchases.forEach(item => {
    container.innerHTML += `
      <div class="chart-item">
        <img src="${item.cover}">
        
        <div class="info">
          <b>${item.name}</b>
          <p>${item.artist}</p>
        </div>

        <button class="play">▶</button>

        <a href="/assets/sample.mp3" download class="download-btn">
          ↓
        </a>
      </div>
    `;
  });

  attachLibraryEvents();
}

/* =========================
   EVENTS
========================= */
function attachLibraryEvents(){

  document.querySelectorAll(".play").forEach(btn => {
    btn.addEventListener("click", () => {
      const audio = new Audio("/assets/sample.mp3");
      audio.play();

      setTimeout(()=>audio.pause(), 30000);
    });
  });

}