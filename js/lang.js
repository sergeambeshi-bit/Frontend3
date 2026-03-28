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

export function applyTranslations() {
  const lang = localStorage.getItem("lang") || "fr";

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if(translations[lang][key]){
      el.textContent = translations[lang][key];
    }
  });
}