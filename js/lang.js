// js/lang.js

const translations = {
  fr: {
    hero: "Télécharger la musique africaine",
    heroSub: "Télécharger • Soutenir les artistes africains",

    browse: "Parcourir",
    new: "Nouveautés",
    trending: "Tendance au Cameroun",
    releases: "Nouvelles Sorties",
    charts: "Top Charts",
    genres: "Explorer les Genres",

    singles: "Singles",
    albums: "Albums",

    view: "Voir",
    viewAll: "Voir tout",

    getStarted: "Commencer",
    fan: "Fan",
    artist: "Artiste",

    support: "Soutenir la musique africaine",
    supportSub: "Achetez des titres et soutenez directement les artistes",
    start: "Explorer",

    trendingSub: "À la une",
    newReleases: "Nouvelles sorties",
    exploreGenres: "Explorer les genres",

    library: "Bibliothèque",
    purchases: "Achats",

   /* AUTH */
    login: "Connexion",
    loginSub: "Accédez à vos achats et téléchargements",
    signup: "S'inscrire",
    signupSub: "Créez un compte pour acheter et télécharger",
    password: "Mot de passe",
    noAccount: "Pas encore de compte ?",
    haveAccount: "Vous avez déjà un compte ?",
    name: "Nom"
  },

  en: {
    hero: "Download African Music",
    heroSub: "Download • Support African Artists",

    browse: "Browse",
    new: "New Releases",
    trending: "Trending in Cameroon",
    releases: "New Releases",
    charts: "Top Charts",
    genres: "Explore Genres",

    singles: "Singles",
    albums: "Albums",

    view: "View",
    viewAll: "View All",

    getStarted: "Get Started",
    fan: "Fan",
    artist: "Artist",

    support: "Support African Music",
    supportSub: "Buy tracks and empower artists directly",
    start: "Start Exploring",

    trendingSub: "Hot right now",
    newReleases: "New Releases",
    exploreGenres: "Explore Genres",

    library: "Library",
    purchases: "Purchases",

    /* AUTH */
    login: "Login",
    loginSub: "Access your purchases and downloads",
    signup: "Sign Up",
    signupSub: "Create an account to buy and download",
    password: "Password",
    noAccount: "Don’t have an account?",
    haveAccount: "Already have an account?",
    name: "Name"
  }
};

/* =========================
   LANGUAGE STATE
========================= */
export function getLang(){
  return localStorage.getItem("lang") || "fr";
}

export function setLang(lang){
  localStorage.setItem("lang", lang);
}

/* =========================
   APPLY LANGUAGE
========================= */
export function applyLang(){

  const lang = getLang();

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;

    const text = translations[lang]?.[key];

    if(!text) return;

    if(el.tagName === "INPUT"){
      el.placeholder = text;
    } else {
      el.textContent = text;
    }
  });

  /* update switch label */
  const btn = document.getElementById("langBtn");
  if(btn){
    btn.textContent = lang.toUpperCase() + " ▾";
  }
}

/* =========================
   TOGGLE LANGUAGE
========================= */
export function toggleLang(){
  const current = getLang();
  const next = current === "fr" ? "en" : "fr";

  setLang(next);
  applyLang();
}

/* =========================
   INIT (CLEAN)
========================= */
export function initLang(){

  // apply immediately
  applyLang();

  // attach click
  const btn = document.getElementById("langBtn");

  if(btn){
    btn.onclick = toggleLang;
  }
}