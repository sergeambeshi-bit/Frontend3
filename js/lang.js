// js/lang.js

const translations = {
  fr: {
    hero: "Télécharger la musique africaine",
    browse: "Parcourir",
    new: "Nouveautés",
    trending: "Tendance au Cameroun",
    releases: "Nouvelles Sorties",
    charts: "Top Charts",
    genres: "Explorer les Genres",

    /* 🔥 NEW ADDITIONS */
    heroSub: "Télécharger • Soutenir les artistes africains",

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

    /* ADMIN */
    dashboard: "Dashboard",
    users: "Utilisateurs",
    artists: "Artistes",
    catalog: "Catalogue",
    transactions: "Transactions",
    payouts: "Paiements",
    promotions: "Promotions",
    fraud: "Fraude",

    manageUsers: "Gérer les utilisateurs",
    searchUsers: "Rechercher des utilisateurs...",
    username: "Nom",
    email: "Email",
    joined: "Inscrit",
    status: "Statut",
    actions: "Actions",

    active: "Actif",
    inactive: "Inactif",
    activate: "Activer",
    deactivate: "Désactiver",
    delete: "Supprimer"
  },

  en: {
    hero: "Download African music",
    browse: "Browse",
    new: "New Releases",
    trending: "Trending in Cameroon",
    releases: "New Releases",
    charts: "Top Charts",
    genres: "Explore Genres",

    /* 🔥 NEW ADDITIONS */
    heroSub: "Download • Support African Artists",

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

    /* ADMIN */
    dashboard: "Dashboard",
    users: "Users",
    artists: "Artists",
    catalog: "Catalog",
    transactions: "Transactions",
    payouts: "Payouts",
    promotions: "Promotions",
    fraud: "Fraud",

    manageUsers: "Manage Users",
    searchUsers: "Search users...",
    username: "Username",
    email: "Email",
    joined: "Joined",
    status: "Status",
    actions: "Actions",

    active: "Active",
    inactive: "Inactive",
    activate: "Activate",
    deactivate: "Deactivate",
    delete: "Delete"
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