// js/lang.js

const translations = {
  fr: {
    hero: "Télécharger la musique africaine",
    browse: "Parcourir",
    new: "Nouveautés",
    trending: "Tendance au Cameroun",
    releases: "Nouvelles Sorties",
    charts: "Top Charts",
    genres: "Explorer les Genres"
  },

  en: {
    hero: "Download African music",
    browse: "Browse",
    new: "New Releases",
    trending: "Trending in Cameroon",
    releases: "New Releases",
    charts: "Top Charts",
    genres: "Explore Genres"
  }
};

/* =========================
   GET / SET LANGUAGE
========================= */
export function getLang(){
  return localStorage.getItem("lang") || "fr";
}

export function setLang(lang){
  localStorage.setItem("lang", lang);
}

/* =========================
   APPLY LANGUAGE (GLOBAL)
========================= */
export function applyLang(){

  const lang = getLang();

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;

    if(!translations[lang] || !translations[lang][key]) return;

    // INPUTS → placeholder
    if(el.tagName === "INPUT"){
      el.placeholder = translations[lang][key];
    } 
    // OTHERS → text
    else {
      el.textContent = translations[lang][key];
    }
  });

  // update button
  const btn = document.getElementById("langBtn");
  if(btn){
    btn.textContent = lang.toUpperCase() + " ▾";
  }
}

/* =========================
   INIT (AUTO RUN)
========================= */
export function initLang(){

  document.addEventListener("DOMContentLoaded", () => {

    applyLang();

    const btn = document.getElementById("langBtn");

    if(btn){
      btn.onclick = () => {
        const newLang = getLang() === "fr" ? "en" : "fr";
        setLang(newLang);
        applyLang();
      };
    }

  });
}